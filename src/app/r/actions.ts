"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { int, opt, str } from "@/lib/form";

// Ações públicas: autorizadas pelo token secreto do link enviado ao tutor.

export async function responderNps(token: string, fd: FormData) {
  const nota = int(fd, "nota");
  if (nota === null || nota < 0 || nota > 10) return;
  await db.pesquisaNps.updateMany({
    where: { token, respondidaEm: null },
    data: { nota, comentario: opt(fd, "comentario")?.slice(0, 1000), respondidaEm: new Date() },
  });
  revalidatePath(`/r/nps/${token}`);
}

export async function responderSolicitacao(token: string, fd: FormData) {
  const resposta = str(fd, "resposta");
  if (resposta !== "APROVADA" && resposta !== "RECUSADA") return;
  await db.solicitacaoTutor.updateMany({
    where: { token, status: "PENDENTE" },
    data: { status: resposta, respondidaEm: new Date() },
  });
  revalidatePath(`/r/solicitacao/${token}`);
}
