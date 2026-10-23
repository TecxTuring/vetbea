"use server";

import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditar, requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { bool, date, dec, opt, str } from "@/lib/form";
import { preencherModelo } from "@/lib/template";

function dadosAnimal(fd: FormData) {
  return {
    nome: str(fd, "nome"),
    especie: str(fd, "especie") || "Canina",
    raca: opt(fd, "raca"),
    sexo: opt(fd, "sexo"),
    castrado: bool(fd, "castrado"),
    dataNascimento: date(fd, "dataNascimento"),
    pelagem: opt(fd, "pelagem"),
    peso: dec(fd, "peso"),
    microchip: opt(fd, "microchip"),
    alergias: opt(fd, "alergias"),
    observacoes: opt(fd, "observacoes"),
    obito: bool(fd, "obito"),
  };
}

export async function criarAnimal(fd: FormData) {
  const s = await requireSession();
  const tutorId = str(fd, "tutorId");
  await db.tutor.findFirstOrThrow({ where: { id: tutorId, clinicaId: s.clinicaId } });
  const dados = dadosAnimal(fd);
  const animal = await db.animal.create({ data: { ...dados, tutorId, clinicaId: s.clinicaId } });
  if (dados.peso) await db.registroPeso.create({ data: { animalId: animal.id, peso: dados.peso } });
  await auditar("criou", "Animal", animal.id, animal.nome);
  redirect(`/animais/${animal.id}`);
}

export async function atualizarAnimal(id: string, fd: FormData) {
  const s = await requireSession();
  const antes = await db.animal.findFirstOrThrow({ where: { id, clinicaId: s.clinicaId } });
  const dados = dadosAnimal(fd);
  await db.animal.update({ where: { id }, data: dados });
  if (dados.peso && Number(antes.peso ?? 0) !== dados.peso) {
    await db.registroPeso.create({ data: { animalId: id, peso: dados.peso } });
  }
  await auditar("editou", "Animal", id);
  redirect(`/animais/${id}`);
}

async function animalDaClinica(animalId: string) {
  const s = await requireSession();
  const animal = await db.animal.findFirstOrThrow({
    where: { id: animalId, clinicaId: s.clinicaId },
    include: { tutor: true, clinica: true },
  });
  return { s, animal };
}

// ── Vacinas ──

export async function registrarVacina(animalId: string, fd: FormData) {
  const { s } = await animalDaClinica(animalId);
  const produtoId = opt(fd, "produtoId");
  const produto = produtoId
    ? await db.produto.findFirst({ where: { id: produtoId, clinicaId: s.clinicaId } })
    : null;
  const nome = str(fd, "nome") || produto?.nome || "Vacina";
  const aplicadaEm = date(fd, "aplicadaEm") ?? new Date();

  await db.$transaction(async (tx) => {
    await tx.vacinaAplicada.create({
      data: {
        clinicaId: s.clinicaId,
        animalId,
        nome,
        produtoId: produto?.id,
        dose: opt(fd, "dose"),
        lote: opt(fd, "lote"),
        fabricante: opt(fd, "fabricante"),
        aplicadaEm,
        veterinarioId: s.userId,
      },
    });
    const proxima = date(fd, "proximaDose");
    if (proxima) {
      await tx.vacinaAplicada.create({
        data: { clinicaId: s.clinicaId, animalId, nome, produtoId: produto?.id, proximaDose: proxima },
      });
    }
    // baixa da dose no estoque
    if (produto?.controlaEstoque) {
      await tx.produto.update({ where: { id: produto.id }, data: { estoqueAtual: { decrement: 1 } } });
      await tx.movimentoEstoque.create({
        data: {
          clinicaId: s.clinicaId,
          produtoId: produto.id,
          tipo: "CONSUMO_INTERNO",
          quantidade: -1,
          observacao: `Vacina aplicada em ${animalId}`,
          usuarioId: s.userId,
        },
      });
    }
  });
  revalidatePath(`/animais/${animalId}`);
}

/** Marca uma dose programada como aplicada. */
export async function aplicarDoseProgramada(vacinaId: string, fd: FormData) {
  const s = await requireSession();
  const v = await db.vacinaAplicada.findFirstOrThrow({ where: { id: vacinaId, clinicaId: s.clinicaId } });
  await db.vacinaAplicada.update({
    where: { id: vacinaId },
    data: { aplicadaEm: new Date(), lote: opt(fd, "lote"), veterinarioId: s.userId },
  });
  if (v.produtoId) {
    const p = await db.produto.findUnique({ where: { id: v.produtoId } });
    if (p?.controlaEstoque) {
      await db.produto.update({ where: { id: p.id }, data: { estoqueAtual: { decrement: 1 } } });
      await db.movimentoEstoque.create({
        data: {
          clinicaId: s.clinicaId,
          produtoId: p.id,
          tipo: "CONSUMO_INTERNO",
          quantidade: -1,
          observacao: `Vacina aplicada`,
          usuarioId: s.userId,
        },
      });
    }
  }
  revalidatePath(`/animais/${v.animalId}`);
}

export async function excluirVacina(vacinaId: string) {
  const s = await requireSession();
  const v = await db.vacinaAplicada.findFirstOrThrow({ where: { id: vacinaId, clinicaId: s.clinicaId } });
  await db.vacinaAplicada.delete({ where: { id: vacinaId } });
  revalidatePath(`/animais/${v.animalId}`);
}

/** Aplica um protocolo: agenda todas as doses e o reforço. */
export async function aplicarProtocolo(animalId: string, fd: FormData) {
  const { s } = await animalDaClinica(animalId);
  const protocolo = await db.protocoloVacina.findFirstOrThrow({
    where: { id: str(fd, "protocoloId"), clinicaId: s.clinicaId },
  });
  const inicio = date(fd, "inicio") ?? new Date();
  const doses = [];
  for (let i = 0; i < protocolo.doses; i++) {
    doses.push({
      clinicaId: s.clinicaId,
      animalId,
      nome: protocolo.vacina,
      dose: protocolo.doses > 1 ? `${i + 1}ª dose` : "Dose única",
      proximaDose: addDays(inicio, i * protocolo.intervaloDias),
    });
  }
  doses.push({
    clinicaId: s.clinicaId,
    animalId,
    nome: protocolo.vacina,
    dose: "Reforço anual",
    proximaDose: addDays(inicio, (protocolo.doses - 1) * protocolo.intervaloDias + protocolo.reforcoDias),
  });
  await db.vacinaAplicada.createMany({ data: doses });
  revalidatePath(`/animais/${animalId}`);
}

// ── Exames ──

export async function solicitarExame(animalId: string, fd: FormData) {
  const { s } = await animalDaClinica(animalId);
  await db.exame.create({
    data: {
      clinicaId: s.clinicaId,
      animalId,
      nome: str(fd, "nome"),
      laboratorio: opt(fd, "laboratorio"),
      observacoes: opt(fd, "observacoes"),
    },
  });
  revalidatePath(`/animais/${animalId}`);
  revalidatePath("/exames");
}

export async function atualizarExame(exameId: string, fd: FormData) {
  const s = await requireSession();
  const exame = await db.exame.findFirstOrThrow({
    where: { id: exameId, clinicaId: s.clinicaId },
    include: { animal: { include: { tutor: true } } },
  });
  const status = str(fd, "status") as "SOLICITADO" | "COLETADO" | "RESULTADO" | "CANCELADO";
  const resultado = opt(fd, "resultado");
  await db.exame.update({
    where: { id: exameId },
    data: {
      status,
      resultado,
      resultadoEm: status === "RESULTADO" ? (exame.resultadoEm ?? new Date()) : null,
    },
  });
  // notifica o tutor quando o resultado fica disponível
  if (status === "RESULTADO" && !exame.tutorNotificado && bool(fd, "notificar")) {
    await db.mensagem.create({
      data: {
        clinicaId: s.clinicaId,
        tutorId: exame.animal.tutorId,
        tipo: "RESULTADO_EXAME",
        conteudo: `Olá, ${exame.animal.tutor.nome.split(" ")[0]}! O resultado do exame "${exame.nome}" de ${exame.animal.nome} já está disponível. Acesse o portal do tutor ou fale com a gente.`,
      },
    });
    await db.exame.update({ where: { id: exameId }, data: { tutorNotificado: true } });
  }
  revalidatePath(`/animais/${exame.animalId}`);
  revalidatePath("/exames");
}

// ── Receitas e documentos ──

export async function criarReceita(animalId: string, fd: FormData) {
  const { s, animal } = await animalDaClinica(animalId);
  const receita = await db.receita.create({
    data: {
      clinicaId: s.clinicaId,
      animalId,
      veterinarioId: s.userId,
      controlada: bool(fd, "controlada"),
      conteudo: preencherModelo(str(fd, "conteudo"), { animal, tutor: animal.tutor, clinica: animal.clinica, veterinario: s.nome }),
    },
  });
  redirect(`/animais/${animalId}/imprimir?receita=${receita.id}`);
}

export async function criarDocumento(animalId: string, fd: FormData) {
  const { s, animal } = await animalDaClinica(animalId);
  const doc = await db.documento.create({
    data: {
      clinicaId: s.clinicaId,
      animalId,
      titulo: str(fd, "titulo") || "Documento",
      conteudo: preencherModelo(str(fd, "conteudo"), { animal, tutor: animal.tutor, clinica: animal.clinica, veterinario: s.nome }),
    },
  });
  redirect(`/animais/${animalId}/imprimir?documento=${doc.id}`);
}

export async function registrarPeso(animalId: string, fd: FormData) {
  await animalDaClinica(animalId);
  const peso = dec(fd, "peso");
  if (!peso) return;
  await db.registroPeso.create({ data: { animalId, peso, data: date(fd, "data") ?? new Date() } });
  await db.animal.update({ where: { id: animalId }, data: { peso } });
  revalidatePath(`/animais/${animalId}`);
}
