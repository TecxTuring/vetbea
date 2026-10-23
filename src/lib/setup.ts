import { db } from "./db";

/** Cadastros padrão criados para toda clínica nova. */
export async function criarDadosIniciais(clinicaId: string) {
  await db.protocoloVacina.createMany({
    data: [
      { clinicaId, nome: "V10 – filhote", especie: "Canina", vacina: "V10 (Polivalente)", doses: 3, intervaloDias: 21, reforcoDias: 365 },
      { clinicaId, nome: "Antirrábica – cão", especie: "Canina", vacina: "Antirrábica", doses: 1, intervaloDias: 0, reforcoDias: 365 },
      { clinicaId, nome: "Gripe canina", especie: "Canina", vacina: "Tosse dos canis", doses: 2, intervaloDias: 21, reforcoDias: 365 },
      { clinicaId, nome: "V5 felina – filhote", especie: "Felina", vacina: "V5 (Quíntupla felina)", doses: 3, intervaloDias: 21, reforcoDias: 365 },
      { clinicaId, nome: "Antirrábica – gato", especie: "Felina", vacina: "Antirrábica", doses: 1, intervaloDias: 0, reforcoDias: 365 },
    ],
  });

  await db.modeloDocumento.createMany({
    data: [
      {
        clinicaId,
        tipo: "RECEITA",
        nome: "Antibiótico + anti-inflamatório",
        conteudo:
          "Uso oral\n\n1. Amoxicilina + clavulanato 250 mg ........ 1 caixa\n   Administrar 1 comprimido a cada 12 horas, por 10 dias.\n\n2. Meloxicam 0,5 mg ........ 1 caixa\n   Administrar 1 comprimido a cada 24 horas, por 3 dias, após alimentação.",
      },
      {
        clinicaId,
        tipo: "RECEITA",
        nome: "Vermífugo",
        conteudo:
          "Uso oral\n\n1. Vermífugo (praziquantel + pamoato de pirantel + febantel) ........ 1 comprimido para cada 10 kg\n   Dose única. Repetir em 15 dias.",
      },
      {
        clinicaId,
        tipo: "DOCUMENTO",
        nome: "Atestado de saúde",
        conteudo:
          "ATESTADO DE SAÚDE\n\nAtesto, para os devidos fins, que examinei o animal {{animal.nome}}, espécie {{animal.especie}}, raça {{animal.raca}}, sexo {{animal.sexo}}, idade {{animal.idade}}, de propriedade de {{tutor.nome}} (CPF {{tutor.cpf}}), e que o mesmo encontra-se clinicamente saudável, sem sinais de doenças infectocontagiosas na data deste exame.\n\n{{clinica.cidade}}, {{data}}.",
      },
      {
        clinicaId,
        tipo: "DOCUMENTO",
        nome: "Termo de consentimento para cirurgia",
        conteudo:
          "TERMO DE CONSENTIMENTO PARA PROCEDIMENTO CIRÚRGICO E ANESTÉSICO\n\nEu, {{tutor.nome}}, CPF {{tutor.cpf}}, responsável pelo animal {{animal.nome}} ({{animal.especie}}, {{animal.raca}}), autorizo a realização do procedimento ____________________, bem como a anestesia necessária, estando ciente dos riscos inerentes ao procedimento.\n\n{{clinica.cidade}}, {{data}}.\n\n\n_______________________________\n{{tutor.nome}}",
      },
      {
        clinicaId,
        tipo: "DOCUMENTO",
        nome: "Termo de internação",
        conteudo:
          "TERMO DE AUTORIZAÇÃO DE INTERNAÇÃO\n\nEu, {{tutor.nome}}, CPF {{tutor.cpf}}, autorizo a internação do animal {{animal.nome}} nesta clínica ({{clinica.nome}}), estando ciente das condutas clínicas e dos custos envolvidos.\n\n{{clinica.cidade}}, {{data}}.\n\n\n_______________________________\n{{tutor.nome}}",
      },
    ],
  });

  await db.box.createMany({
    data: [
      { clinicaId, nome: "Box 1", tipo: "Geral" },
      { clinicaId, nome: "Box 2", tipo: "Geral" },
      { clinicaId, nome: "Box 3", tipo: "Geral" },
      { clinicaId, nome: "Isolamento 1", tipo: "Isolamento" },
      { clinicaId, nome: "UTI 1", tipo: "UTI" },
    ],
  });

  await db.modeloPrescricao.createMany({
    data: [
      {
        clinicaId,
        nome: "Gastroenterite",
        itens: [
          { medicamento: "Ringer lactato", dose: "Conforme taxa de manutenção", via: "IV", frequenciaHoras: 24 },
          { medicamento: "Ondansetrona", dose: "0,5 mg/kg", via: "IV", frequenciaHoras: 12 },
          { medicamento: "Omeprazol", dose: "1 mg/kg", via: "IV", frequenciaHoras: 24 },
          { medicamento: "Dipirona", dose: "25 mg/kg", via: "IV", frequenciaHoras: 8 },
        ],
      },
      {
        clinicaId,
        nome: "Pós-operatório",
        itens: [
          { medicamento: "Meloxicam", dose: "0,1 mg/kg", via: "SC", frequenciaHoras: 24 },
          { medicamento: "Cefalotina", dose: "30 mg/kg", via: "IV", frequenciaHoras: 8 },
          { medicamento: "Metadona", dose: "0,2 mg/kg", via: "IM", frequenciaHoras: 6 },
        ],
      },
    ],
  });

  await db.produto.createMany({
    data: [
      { clinicaId, nome: "Consulta clínica", tipo: "SERVICO", controlaEstoque: false, precoVenda: 150, categoria: "Consultas", comissaoPct: 30 },
      { clinicaId, nome: "Retorno", tipo: "SERVICO", controlaEstoque: false, precoVenda: 0, categoria: "Consultas" },
      { clinicaId, nome: "Consulta de emergência", tipo: "SERVICO", controlaEstoque: false, precoVenda: 250, categoria: "Consultas", comissaoPct: 30 },
      { clinicaId, nome: "Diária de internação", tipo: "SERVICO", controlaEstoque: false, precoVenda: 220, categoria: "Internação" },
      { clinicaId, nome: "Aplicação de vacina", tipo: "SERVICO", controlaEstoque: false, precoVenda: 30, categoria: "Vacinas" },
      { clinicaId, nome: "Banho – porte pequeno", tipo: "SERVICO", controlaEstoque: false, precoVenda: 60, categoria: "Banho e tosa" },
      { clinicaId, nome: "Banho e tosa – porte médio", tipo: "SERVICO", controlaEstoque: false, precoVenda: 110, categoria: "Banho e tosa" },
    ],
  });
}
