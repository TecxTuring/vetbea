import bcrypt from "bcryptjs";
import { addDays, addHours, setHours, setMinutes, startOfDay, subDays } from "date-fns";
import { db } from "./db";
import { criarDadosIniciais } from "./setup";

/**
 * Conta de demonstração: uma clínica fictícia com dados realistas para quem quer testar o Mapigo.
 * É recriada uma vez por dia (no primeiro acesso do dia), assim a agenda mostra sempre o dia atual
 * e as alterações feitas pelos visitantes são descartadas.
 */
export const DEMO_SLUG = "demo";
export const DEMO_EMAIL = "demo@mapigo.com.br";
export const DEMO_SENHA = "demo1234";

const hojeAs = (h: number, m = 0) => setMinutes(setHours(startOfDay(new Date()), h), m);
const pick = <T,>(arr: T[], i: number) => arr[i % arr.length];

export async function ehClinicaDemo(clinicaId: string) {
  const c = await db.clinica.findUnique({ where: { id: clinicaId }, select: { slug: true } });
  return c?.slug === DEMO_SLUG;
}

/** Garante que a clínica demo existe, está completa e é de hoje; devolve o usuário administrador dela. */
export async function garantirDemo() {
  if (!(await demoEmDia())) {
    // trava (advisory lock) para que acessos simultâneos não recriem a demo ao mesmo tempo
    await db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(7316001)`;
        if (await demoEmDia()) return;
        const antiga = await db.clinica.findUnique({ where: { slug: DEMO_SLUG } });
        if (antiga) await apagarClinica(antiga.id);
        await criarClinicaDemo();
      },
      { timeout: 180_000, maxWait: 30_000 },
    );
  }
  return usuarioDemo();
}

async function demoEmDia() {
  const c = await db.clinica.findUnique({ where: { slug: DEMO_SLUG } });
  return !!c && c.createdAt >= startOfDay(new Date()) && (await pronta(c.id));
}

async function usuarioDemo() {
  return db.usuario.findUniqueOrThrow({ where: { email: DEMO_EMAIL } });
}

// a clínica fica pronta quando os últimos registros da carga (pesquisas NPS) existem
async function pronta(clinicaId: string) {
  const admin = await db.usuario.findUnique({ where: { email: DEMO_EMAIL } });
  return admin?.clinicaId === clinicaId && (await db.pesquisaNps.count({ where: { clinicaId } })) > 0;
}

/** Apaga uma clínica e todos os seus dados, na ordem das dependências. */
export async function apagarClinica(clinicaId: string) {
  const w = { clinicaId };
  await db.mensagem.deleteMany({ where: w });
  await db.pesquisaNps.deleteMany({ where: w });
  await db.campanha.deleteMany({ where: w });
  await db.auditoria.deleteMany({ where: w });
  await db.internacao.deleteMany({ where: w });
  await db.box.deleteMany({ where: w });
  await db.modeloPrescricao.deleteMany({ where: w });
  await db.venda.deleteMany({ where: w });
  await db.caixa.deleteMany({ where: w });
  await db.contaFinanceira.deleteMany({ where: w });
  await db.orcamento.deleteMany({ where: w });
  await db.inventario.deleteMany({ where: w });
  await db.pedidoCompra.deleteMany({ where: w });
  await db.movimentoEstoque.deleteMany({ where: w });
  await db.vacinaAplicada.deleteMany({ where: w });
  await db.exame.deleteMany({ where: w });
  await db.receita.deleteMany({ where: w });
  await db.documento.deleteMany({ where: w });
  await db.atendimento.deleteMany({ where: w });
  await db.agendamento.deleteMany({ where: w });
  await db.animal.deleteMany({ where: w });
  await db.tutor.deleteMany({ where: w });
  await db.produto.deleteMany({ where: w });
  await db.fornecedor.deleteMany({ where: w });
  await db.protocoloVacina.deleteMany({ where: w });
  await db.modeloDocumento.deleteMany({ where: w });
  await db.usuario.deleteMany({ where: w });
  await db.clinica.delete({ where: { id: clinicaId } });
}

async function criarClinicaDemo() {
    const clinica = await db.clinica.create({
      data: {
        nome: "Clínica Veterinária Mapigo",
        slug: DEMO_SLUG,
        cnpj: "12.345.678/0001-90",
        telefone: "31999990000",
        email: "contato@clinicamapigo.com.br",
        endereco: "Rua das Patinhas, 123",
        cidade: "Belo Horizonte",
        uf: "MG",
        sobre: "Atendimento clínico, vacinação, exames, cirurgias e internação 24h com carinho e tecnologia.",
      },
    });
    const c = clinica.id;
    await criarDadosIniciais(c);

    const senha = await bcrypt.hash(DEMO_SENHA, 10);
    const senhaInterna = await bcrypt.hash(crypto.randomUUID(), 10);
    const admin = await db.usuario.create({
      data: { clinicaId: c, nome: "Ana Souza", email: DEMO_EMAIL, senhaHash: senha, papel: "ADMIN", crmv: "MG-12345", cor: "#0b8077" },
    });
    const vet1 = await db.usuario.create({
      data: { clinicaId: c, nome: "Dr. Bruno Lima", email: "bruno.demo@mapigo.com.br", senhaHash: senhaInterna, papel: "VETERINARIO", crmv: "MG-23456", cor: "#7c3aed" },
    });
    const vet2 = await db.usuario.create({
      data: { clinicaId: c, nome: "Dra. Carla Mendes", email: "carla.demo@mapigo.com.br", senhaHash: senhaInterna, papel: "VETERINARIO", crmv: "MG-34567", cor: "#ea580c" },
    });
    await db.usuario.create({
      data: { clinicaId: c, nome: "Diego Recepção", email: "recepcao.demo@mapigo.com.br", senhaHash: senhaInterna, papel: "RECEPCAO", cor: "#0284c7" },
    });
    const vets = [admin, vet1, vet2];

    // Produtos
    const fornecedor = await db.fornecedor.create({
      data: { clinicaId: c, nome: "Distribuidora PetMed", cnpj: "98.765.432/0001-10", telefone: "31988887777", contato: "Marcos" },
    });
    const produtosData = [
      { nome: "Ração Premium Cães Adultos 15kg", tipo: "PRODUTO", categoria: "Rações", precoCusto: 180, precoVenda: 279.9, estoqueAtual: 12, estoqueMinimo: 5, codigoBarras: "7891000100103" },
      { nome: "Ração Premium Gatos Castrados 3kg", tipo: "PRODUTO", categoria: "Rações", precoCusto: 62, precoVenda: 99.9, estoqueAtual: 3, estoqueMinimo: 6, codigoBarras: "7891000100110" },
      { nome: "Antipulgas comprimido 10–20kg", tipo: "MEDICAMENTO", categoria: "Antiparasitários", precoCusto: 55, precoVenda: 94.9, estoqueAtual: 20, estoqueMinimo: 8 },
      { nome: "Vermífugo 4 comprimidos", tipo: "MEDICAMENTO", categoria: "Antiparasitários", precoCusto: 18, precoVenda: 39.9, estoqueAtual: 30, estoqueMinimo: 10, fracionavel: true, unidadeFracao: "COMP", fatorFracao: 4 },
      { nome: "Amoxicilina suspensão 50 ml", tipo: "MEDICAMENTO", categoria: "Antibióticos", precoCusto: 22, precoVenda: 48, estoqueAtual: 6, estoqueMinimo: 4, fracionavel: true, unidadeFracao: "ML", fatorFracao: 50 },
      { nome: "Shampoo hipoalergênico 500 ml", tipo: "PRODUTO", categoria: "Higiene", precoCusto: 25, precoVenda: 54.9, estoqueAtual: 9, estoqueMinimo: 3 },
      { nome: "Coleira antipulgas", tipo: "PRODUTO", categoria: "Acessórios", precoCusto: 40, precoVenda: 89.9, estoqueAtual: 0, estoqueMinimo: 2 },
      { nome: "Vacina V10", tipo: "VACINA", categoria: "Vacinas", precoCusto: 35, precoVenda: 120, estoqueAtual: 25, estoqueMinimo: 10, comissaoPct: 10 },
      { nome: "Vacina Antirrábica", tipo: "VACINA", categoria: "Vacinas", precoCusto: 15, precoVenda: 80, estoqueAtual: 18, estoqueMinimo: 10, comissaoPct: 10 },
      { nome: "Vacina V5 Felina", tipo: "VACINA", categoria: "Vacinas", precoCusto: 45, precoVenda: 140, estoqueAtual: 8, estoqueMinimo: 5, comissaoPct: 10 },
      { nome: "Hemograma completo", tipo: "SERVICO", categoria: "Exames", precoVenda: 90, controlaEstoque: false, comissaoPct: 10 },
      { nome: "Ultrassonografia abdominal", tipo: "SERVICO", categoria: "Exames", precoVenda: 220, controlaEstoque: false, comissaoPct: 15 },
      { nome: "Castração felina", tipo: "SERVICO", categoria: "Cirurgias", precoVenda: 450, controlaEstoque: false, comissaoPct: 20 },
    ] as const;
    for (const p of produtosData) {
      await db.produto.create({ data: { clinicaId: c, ...p, validade: p.tipo === "VACINA" ? addDays(new Date(), 120) : undefined } });
    }
    const produtos = await db.produto.findMany({ where: { clinicaId: c } });
    const prod = (nome: string) => produtos.find((p) => p.nome.startsWith(nome))!;

    // Clientes e pets
    const tutoresData = [
      ["Mariana Alves", "31991234567", [["Thor", "Canina", "Golden Retriever", "M", 4], ["Mel", "Felina", "SRD", "F", 2]]],
      ["Ricardo Gomes", "31992345678", [["Bidu", "Canina", "Shih Tzu", "M", 7]]],
      ["Fernanda Costa", "31993456789", [["Luna", "Felina", "Siamês", "F", 1]]],
      ["João Pereira", "31994567890", [["Rex", "Canina", "Pastor Alemão", "M", 10]]],
      ["Beatriz Rocha", "31995678901", [["Pipoca", "Canina", "Lhasa Apso", "F", 3], ["Nino", "Felina", "Persa", "M", 5]]],
      ["Carlos Eduardo", "31996789012", [["Max", "Canina", "Labrador", "M", 0.4]]],
      ["Juliana Martins", "31997890123", [["Frajola", "Felina", "SRD", "M", 8]]],
      ["Paulo Henrique", "31998901234", [["Bolt", "Canina", "Border Collie", "M", 2]]],
    ] as const;
    const animais = [];
    const tutores = [];
    for (const [i, [nome, fone, pets]] of tutoresData.entries()) {
      const tutor = await db.tutor.create({
        data: {
          clinicaId: c,
          nome,
          telefone: fone,
          whatsapp: fone,
          email: `${nome.split(" ")[0].toLowerCase()}@email.com`,
          cpf: `000.000.00${i}-0${i}`,
          cidade: "Belo Horizonte",
          uf: "MG",
          createdAt: subDays(new Date(), 300 - i * 30),
        },
      });
      tutores.push(tutor);
      for (const [pn, esp, raca, sexo, anos] of pets) {
        const nasc = subDays(new Date(), Math.round(anos * 365));
        if (pn === "Thor") nasc.setMonth(new Date().getMonth(), new Date().getDate()); // aniversariante do dia
        animais.push(
          await db.animal.create({
            data: {
              clinicaId: c,
              tutorId: tutor.id,
              nome: pn,
              especie: esp,
              raca,
              sexo,
              dataNascimento: nasc,
              peso: esp === "Felina" ? 4.2 : 18.5,
              castrado: anos > 1,
              alergias: pn === "Bidu" ? "Dipirona" : null,
            },
          }),
        );
      }
    }
    await db.tutor.update({ where: { id: tutores[1].id }, data: { saldoCredito: 150 } });

    // Agenda de hoje e amanhã
    const tipos = ["CONSULTA", "VACINA", "RETORNO", "EXAME", "CONSULTA", "BANHO_TOSA", "CIRURGIA"] as const;
    const status = ["CONCLUIDO", "CONCLUIDO", "AGUARDANDO", "CONFIRMADO", "AGENDADO", "AGENDADO", "AGENDADO"] as const;
    for (let i = 0; i < 7; i++) {
      const a = animais[i];
      const inicio = hojeAs(8 + i, i % 2 ? 30 : 0);
      await db.agendamento.create({
        data: {
          clinicaId: c,
          animalId: a.id,
          tutorId: a.tutorId,
          veterinarioId: pick(vets, i).id,
          tipo: tipos[i],
          status: status[i],
          inicio,
          fim: addHours(inicio, tipos[i] === "CIRURGIA" ? 2 : 0.5),
        },
      });
    }
    for (let i = 0; i < 3; i++) {
      const a = animais[i + 3];
      const inicio = addDays(hojeAs(9 + i * 2), 1);
      await db.agendamento.create({
        data: { clinicaId: c, animalId: a.id, tutorId: a.tutorId, veterinarioId: pick(vets, i + 1).id, tipo: "CONSULTA", inicio, fim: addHours(inicio, 0.5) },
      });
    }

    // Histórico: atendimentos e vendas dos últimos 12 meses
    const diagnosticos = ["Otite externa", "Dermatite alérgica", "Gastroenterite", "Check-up anual — saudável", "Periodontite grau II", "Conjuntivite"];
    for (let d = 330; d >= 1; d -= 9) {
      const a = pick(animais, d);
      const vet = pick(vets, d);
      const data = setHours(subDays(new Date(), d), 10 + (d % 7));
      const at = await db.atendimento.create({
        data: {
          clinicaId: c,
          animalId: a.id,
          veterinarioId: vet.id,
          data,
          tipo: d % 4 === 0 ? "Retorno" : "Consulta",
          queixa: "Tutor relata coceira e lambedura frequente.",
          anamnese: "Alimentação: ração premium. Vacinas em dia. Sem alterações de comportamento.",
          exameFisico: "Animal alerta, mucosas normocoradas, TPC < 2s, linfonodos sem alterações.",
          diagnostico: pick(diagnosticos, d),
          conduta: "Prescrito tratamento tópico e retorno em 15 dias.",
          temperatura: 38.6,
          fc: 110,
          fr: 28,
          finalizado: true,
        },
      });
      const itens = [
        { p: prod("Consulta clínica"), q: 1 },
        ...(d % 3 === 0 ? [{ p: prod("Antipulgas"), q: 1 }] : []),
        ...(d % 5 === 0 ? [{ p: prod("Hemograma"), q: 1 }] : []),
        ...(d % 2 === 0 ? [{ p: prod("Ração Premium Cães"), q: 1 }] : []),
      ];
      const total = itens.reduce((acc, i) => acc + Number(i.p.precoVenda) * i.q, 0);
      const forma = pick(["PIX", "CREDITO", "DINHEIRO", "DEBITO"] as const, d);
      await db.venda.create({
        data: {
          clinicaId: c,
          tutorId: a.tutorId,
          animalId: a.id,
          usuarioId: vet.id,
          atendimentoId: at.id,
          status: "FINALIZADA",
          total,
          createdAt: data,
          finalizadaEm: data,
          itens: {
            create: itens.map((i) => ({ produtoId: i.p.id, descricao: i.p.nome, quantidade: i.q, valorUnit: i.p.precoVenda, total: Number(i.p.precoVenda) * i.q })),
          },
          pagamentos: { create: { forma, valor: total, conciliado: d > 30 } },
        },
      });
      const cartao = forma === "CREDITO" || forma === "DEBITO";
      const receb = addDays(data, forma === "CREDITO" ? 30 : forma === "DEBITO" ? 1 : 0);
      await db.contaFinanceira.create({
        data: {
          clinicaId: c,
          tipo: "RECEBER",
          descricao: `Venda — ${tutores.find((t) => t.id === a.tutorId)!.nome}`,
          categoria: "Vendas",
          valor: total,
          vencimento: receb,
          status: cartao && receb > new Date() ? "ABERTA" : "PAGA",
          pagoEm: cartao && receb > new Date() ? null : receb,
          valorPago: cartao && receb > new Date() ? null : total,
          forma,
          tutorId: a.tutorId,
        },
      });
      for (const i of itens.filter((x) => x.p.controlaEstoque)) {
        await db.movimentoEstoque.create({
          data: { clinicaId: c, produtoId: i.p.id, tipo: "SAIDA_VENDA", quantidade: -i.q, data },
        });
      }
    }

    // Débito de cliente (venda a prazo)
    await db.contaFinanceira.create({
      data: {
        clinicaId: c,
        tipo: "RECEBER",
        descricao: "Venda a prazo — João Pereira",
        categoria: "Vendas",
        valor: 320,
        vencimento: subDays(new Date(), 5),
        tutorId: tutores[3].id,
      },
    });

    // Despesas
    const despesas = [
      ["Aluguel", "Aluguel", 4500, 5],
      ["Folha de pagamento", "Salários", 18000, 5],
      ["Energia elétrica", "Água/Luz/Internet", 980, 10],
      ["Internet", "Água/Luz/Internet", 199, 15],
      ["Laboratório parceiro", "Laboratório", 1250, 20],
    ] as const;
    for (let m = 11; m >= 0; m--) {
      for (const [desc, cat, valor, dia] of despesas) {
        const venc = new Date();
        venc.setMonth(venc.getMonth() - m, dia);
        const paga = venc < new Date();
        await db.contaFinanceira.create({
          data: {
            clinicaId: c,
            tipo: "PAGAR",
            descricao: desc,
            categoria: cat,
            valor,
            vencimento: venc,
            status: paga ? "PAGA" : "ABERTA",
            pagoEm: paga ? venc : null,
            valorPago: paga ? valor : null,
            forma: paga ? "PIX" : null,
          },
        });
      }
    }
    await db.contaFinanceira.create({
      data: { clinicaId: c, tipo: "PAGAR", descricao: "Compra NF 4521 — Distribuidora PetMed", categoria: "Fornecedores", valor: 2380, vencimento: addDays(new Date(), 12), fornecedorId: fornecedor.id },
    });

    // Vacinas
    for (const [i, a] of animais.entries()) {
      const vac = a.especie === "Felina" ? "V5 (Quíntupla felina)" : "V10 (Polivalente)";
      await db.vacinaAplicada.create({
        data: { clinicaId: c, animalId: a.id, nome: vac, dose: "Reforço anual", lote: `L${2400 + i}`, aplicadaEm: subDays(new Date(), 360 - i * 3), veterinarioId: vet1.id },
      });
      await db.vacinaAplicada.create({
        data: { clinicaId: c, animalId: a.id, nome: vac, dose: "Reforço anual", proximaDose: addDays(new Date(), i * 4 - 6) },
      });
    }

    // Exames
    await db.exame.create({ data: { clinicaId: c, animalId: animais[3].id, nome: "Hemograma completo", laboratorio: "LabVet", status: "COLETADO" } });
    await db.exame.create({
      data: {
        clinicaId: c,
        animalId: animais[0].id,
        nome: "Bioquímico renal",
        status: "RESULTADO",
        resultado: "Ureia 45 mg/dL (ref. 21–60)\nCreatinina 1,1 mg/dL (ref. 0,5–1,5)\nSem alterações.",
        resultadoEm: subDays(new Date(), 2),
        solicitadoEm: subDays(new Date(), 4),
        tutorNotificado: true,
      },
    });

    // Internação
    const boxes = await db.box.findMany({ where: { clinicaId: c }, orderBy: { nome: "asc" } });
    const internacao = await db.internacao.create({
      data: {
        clinicaId: c,
        animalId: animais[3].id,
        veterinarioId: vet2.id,
        boxId: boxes[0].id,
        triagem: "URGENTE",
        motivo: "Gastroenterite hemorrágica — desidratação moderada",
        entrada: subDays(new Date(), 1),
      },
    });
    const presc = [
      ["Ringer lactato", "60 ml/kg/dia", "IV", 24],
      ["Ondansetrona", "0,5 mg/kg", "IV", 12],
      ["Omeprazol", "1 mg/kg", "IV", 24],
      ["Metronidazol", "15 mg/kg", "IV", 12],
    ] as const;
    for (const [medicamento, dose, via, freq] of presc) {
      const inicio = setMinutes(subDays(new Date(), 1), 0);
      const aplicacoes = [];
      for (let t = inicio; t < addDays(new Date(), 6); t = addHours(t, freq)) {
        aplicacoes.push({ previstoEm: t, realizadoEm: t < subDays(new Date(), 0.2) ? addHours(t, 0.1) : null, responsavel: t < subDays(new Date(), 0.2) ? "Dra. Carla Mendes" : null });
      }
      await db.prescricao.create({ data: { internacaoId: internacao.id, medicamento, dose, via, frequenciaHoras: freq, inicio, aplicacoes: { create: aplicacoes } } });
    }
    for (let h = 24; h >= 0; h -= 6) {
      await db.parametroClinico.create({
        data: { internacaoId: internacao.id, data: subDays(new Date(), h / 24), temperatura: 39.4 - (24 - h) * 0.04, fc: 130 - (24 - h), fr: 32, mucosas: "Hipocoradas", hidratacao: h > 12 ? "Desidratação 7%" : "Desidratação 5%", responsavel: "Dra. Carla Mendes" },
      });
    }
    await db.evolucao.create({
      data: { internacaoId: internacao.id, texto: "Paciente mais ativo, aceitou água. Sem novos episódios de vômito no turno. Manter fluido e reavaliar alimentação às 18h.", trocaTurno: true, responsavel: "Dra. Carla Mendes" },
    });
    await db.internacao.create({
      data: { clinicaId: c, animalId: animais[6].id, veterinarioId: vet1.id, boxId: boxes[3].id, triagem: "NAO_URGENTE", motivo: "Pós-operatório de castração", entrada: addHours(new Date(), -5) },
    });

    // Orçamento e NPS
    await db.orcamento.create({
      data: {
        clinicaId: c,
        tutorId: tutores[4].id,
        animalId: animais[5].id,
        validade: addDays(new Date(), 10),
        itens: {
          create: [
            { produtoId: prod("Castração").id, descricao: "Castração felina", quantidade: 1, valorUnit: 450 },
            { produtoId: prod("Hemograma").id, descricao: "Hemograma completo", quantidade: 1, valorUnit: 90 },
          ],
        },
      },
    });
    const notas = [10, 9, 10, 8, 10, 6, 9];
    for (const [i, nota] of notas.entries()) {
      await db.pesquisaNps.create({
        data: {
          clinicaId: c,
          tutorId: pick(tutores, i).id,
          nota,
          comentario: nota >= 9 ? "Equipe muito atenciosa, recomendo!" : nota <= 6 ? "Esperei bastante na recepção." : null,
          respondidaEm: subDays(new Date(), i * 6),
          createdAt: subDays(new Date(), i * 6 + 1),
        },
      });
    }
}
