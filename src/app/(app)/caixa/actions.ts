"use server";

import { revalidatePath } from "next/cache";
import { auditar, requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { falha } from "@/lib/flash";
import { dec, str } from "@/lib/form";

export async function abrirCaixa(fd: FormData) {
  const s = await requireSession();
  const aberto = await db.caixa.findFirst({ where: { clinicaId: s.clinicaId, fechadoEm: null } });
  if (aberto) falha("/caixa", "Já existe um caixa aberto");
  const caixa = await db.caixa.create({
    data: { clinicaId: s.clinicaId, usuarioId: s.userId, saldoInicial: dec(fd, "saldoInicial") ?? 0 },
  });
  // vendas abertas passam a pertencer a este caixa
  await db.venda.updateMany({ where: { clinicaId: s.clinicaId, status: "ABERTA", caixaId: null }, data: { caixaId: caixa.id } });
  await auditar("abriu", "Caixa", caixa.id);
  revalidatePath("/caixa");
}

export async function movimentarCaixa(caixaId: string, fd: FormData) {
  const s = await requireSession();
  await db.caixa.findFirstOrThrow({ where: { id: caixaId, clinicaId: s.clinicaId, fechadoEm: null } });
  const valor = dec(fd, "valor");
  if (!valor || valor <= 0) falha("/caixa", "Informe um valor");
  const tipo = str(fd, "tipo") as "SUPRIMENTO" | "SANGRIA";
  await db.movimentoCaixa.create({
    data: { caixaId, tipo, valor, descricao: str(fd, "descricao") || (tipo === "SANGRIA" ? "Sangria" : "Suprimento") },
  });
  revalidatePath("/caixa");
}

export async function fecharCaixa(caixaId: string, fd: FormData) {
  const s = await requireSession();
  await db.caixa.findFirstOrThrow({ where: { id: caixaId, clinicaId: s.clinicaId, fechadoEm: null } });
  await db.caixa.update({
    where: { id: caixaId },
    data: { fechadoEm: new Date(), saldoFinal: dec(fd, "saldoFinal") ?? 0 },
  });
  await auditar("fechou", "Caixa", caixaId);
  revalidatePath("/caixa");
}
