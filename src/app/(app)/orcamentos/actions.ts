"use server";

import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditar, requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { dec, int, opt, str } from "@/lib/form";
import { recalcularVenda } from "@/lib/vendas";
import type { StatusOrcamento } from "@prisma/client";

export async function criarOrcamento(fd: FormData) {
  const s = await requireSession();
  const animalId = opt(fd, "animalId");
  const animal = animalId ? await db.animal.findFirstOrThrow({ where: { id: animalId, clinicaId: s.clinicaId } }) : null;
  const tutorId = animal?.tutorId ?? str(fd, "tutorId");
  await db.tutor.findFirstOrThrow({ where: { id: tutorId, clinicaId: s.clinicaId } });
  const orc = await db.orcamento.create({
    data: {
      clinicaId: s.clinicaId,
      tutorId,
      animalId: animal?.id,
      validade: addDays(new Date(), int(fd, "validadeDias") ?? 15),
      observacoes: opt(fd, "observacoes"),
    },
  });
  redirect(`/orcamentos/${orc.id}`);
}

async function orcamentoDaClinica(id: string) {
  const s = await requireSession();
  const orc = await db.orcamento.findFirstOrThrow({ where: { id, clinicaId: s.clinicaId }, include: { itens: true } });
  return { s, orc };
}

export async function adicionarItemOrcamento(id: string, fd: FormData) {
  const { s } = await orcamentoDaClinica(id);
  const produtoId = opt(fd, "produtoId");
  const produto = produtoId ? await db.produto.findFirst({ where: { id: produtoId, clinicaId: s.clinicaId } }) : null;
  const descricao = produto?.nome ?? str(fd, "descricao");
  if (!descricao) return;
  await db.orcamentoItem.create({
    data: {
      orcamentoId: id,
      produtoId: produto?.id,
      descricao,
      quantidade: dec(fd, "quantidade") ?? 1,
      valorUnit: dec(fd, "valorUnit") ?? Number(produto?.precoVenda ?? 0),
    },
  });
  revalidatePath(`/orcamentos/${id}`);
}

export async function removerItemOrcamento(id: string, itemId: string) {
  await orcamentoDaClinica(id);
  await db.orcamentoItem.delete({ where: { id: itemId, orcamentoId: id } });
  revalidatePath(`/orcamentos/${id}`);
}

export async function atualizarOrcamento(id: string, fd: FormData) {
  await orcamentoDaClinica(id);
  await db.orcamento.update({
    where: { id },
    data: { desconto: dec(fd, "desconto") ?? 0, observacoes: opt(fd, "observacoes") },
  });
  revalidatePath(`/orcamentos/${id}`);
}

export async function mudarStatusOrcamento(id: string, status: StatusOrcamento) {
  await orcamentoDaClinica(id);
  await db.orcamento.update({ where: { id }, data: { status } });
  revalidatePath(`/orcamentos/${id}`);
}

/** Converte o orçamento aprovado em uma venda aberta no caixa. */
export async function converterEmVenda(id: string) {
  const { s, orc } = await orcamentoDaClinica(id);
  const venda = await db.$transaction(async (tx) => {
    const venda = await tx.venda.create({
      data: {
        clinicaId: s.clinicaId,
        tutorId: orc.tutorId,
        animalId: orc.animalId,
        usuarioId: s.userId,
        desconto: orc.desconto,
        itens: {
          create: orc.itens.map((i) => ({
            produtoId: i.produtoId,
            descricao: i.descricao,
            quantidade: i.quantidade,
            valorUnit: i.valorUnit,
            total: Math.round(Number(i.quantidade) * Number(i.valorUnit) * 100) / 100,
          })),
        },
      },
    });
    await recalcularVenda(tx, venda.id);
    await tx.orcamento.update({ where: { id }, data: { status: "CONVERTIDO" } });
    return venda;
  });
  await auditar("converteu em venda", "Orcamento", id, venda.id);
  redirect(`/vendas/${venda.id}`);
}
