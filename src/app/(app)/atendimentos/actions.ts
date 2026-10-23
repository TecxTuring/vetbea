"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditar, requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { bool, dec, int, opt, str } from "@/lib/form";
import { adicionarItemVenda, recalcularVenda } from "@/lib/vendas";

export async function novoAtendimento(fd: FormData) {
  const s = await requireSession();
  const animal = await db.animal.findFirstOrThrow({ where: { id: str(fd, "animalId"), clinicaId: s.clinicaId } });
  const at = await db.atendimento.create({
    data: {
      clinicaId: s.clinicaId,
      animalId: animal.id,
      veterinarioId: opt(fd, "veterinarioId") ?? s.userId,
      tipo: str(fd, "tipo") || "Consulta",
    },
  });
  await auditar("criou", "Atendimento", at.id);
  redirect(`/atendimentos/${at.id}`);
}

export async function salvarAtendimento(id: string, fd: FormData) {
  const s = await requireSession();
  const at = await db.atendimento.findFirstOrThrow({ where: { id, clinicaId: s.clinicaId } });
  const peso = dec(fd, "peso");
  const finalizar = bool(fd, "finalizar");
  await db.atendimento.update({
    where: { id },
    data: {
      tipo: str(fd, "tipo") || at.tipo,
      queixa: opt(fd, "queixa"),
      anamnese: opt(fd, "anamnese"),
      exameFisico: opt(fd, "exameFisico"),
      diagnostico: opt(fd, "diagnostico"),
      conduta: opt(fd, "conduta"),
      peso,
      temperatura: dec(fd, "temperatura"),
      fc: int(fd, "fc"),
      fr: int(fd, "fr"),
      tpc: opt(fd, "tpc"),
      mucosas: opt(fd, "mucosas"),
      hidratacao: opt(fd, "hidratacao"),
      finalizado: finalizar || at.finalizado,
    },
  });
  if (peso && Number(at.peso ?? 0) !== peso) {
    await db.registroPeso.create({ data: { animalId: at.animalId, peso } });
    await db.animal.update({ where: { id: at.animalId }, data: { peso } });
  }
  if (finalizar && at.agendamentoId) {
    await db.agendamento.update({ where: { id: at.agendamentoId }, data: { status: "CONCLUIDO" } });
  }
  await auditar(finalizar ? "finalizou" : "editou", "Atendimento", id);
  revalidatePath(`/atendimentos/${id}`);
}

async function vendaDoAtendimento(atendimentoId: string) {
  const s = await requireSession();
  const at = await db.atendimento.findFirstOrThrow({
    where: { id: atendimentoId, clinicaId: s.clinicaId },
    include: { animal: true, venda: true },
  });
  if (at.venda) return { s, venda: at.venda };
  const venda = await db.venda.create({
    data: {
      clinicaId: s.clinicaId,
      atendimentoId,
      animalId: at.animalId,
      tutorId: at.animal.tutorId,
      usuarioId: at.veterinarioId ?? s.userId,
    },
  });
  return { s, venda };
}

/** Lança um produto/serviço do consultório direto na conta do cliente (vai para o caixa). */
export async function lancarItem(atendimentoId: string, fd: FormData) {
  const { s, venda } = await vendaDoAtendimento(atendimentoId);
  const produtoId = opt(fd, "produtoId");
  if (!produtoId) return;
  await adicionarItemVenda(venda.id, s.clinicaId, {
    produtoId,
    quantidade: dec(fd, "quantidade") ?? 1,
    fracionado: bool(fd, "fracionado"),
  });
  revalidatePath(`/atendimentos/${atendimentoId}`);
}

export async function removerItem(atendimentoId: string, itemId: string) {
  const s = await requireSession();
  const item = await db.vendaItem.findFirstOrThrow({
    where: { id: itemId, venda: { clinicaId: s.clinicaId, status: "ABERTA" } },
  });
  await db.$transaction(async (tx) => {
    await tx.vendaItem.delete({ where: { id: itemId } });
    await recalcularVenda(tx, item.vendaId);
  });
  revalidatePath(`/atendimentos/${atendimentoId}`);
}
