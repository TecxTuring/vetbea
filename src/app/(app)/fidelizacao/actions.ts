"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { CanalMensagem } from "@prisma/client";
import { auditar, requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { falha } from "@/lib/flash";
import { str } from "@/lib/form";
import { gerarMensagensAutomaticas, processarFila } from "@/lib/mensagens";
import { publicoCampanha } from "@/lib/campanhas";

export async function gerarAgora() {
  const s = await requireSession();
  await gerarMensagensAutomaticas(s.clinicaId);
  await processarFila(s.clinicaId);
  revalidatePath("/fidelizacao");
}

/** Marca como enviada após o envio manual pelo WhatsApp Web. */
export async function marcarEnviada(id: string) {
  const s = await requireSession();
  await db.mensagem.update({ where: { id, clinicaId: s.clinicaId }, data: { status: "ENVIADA", enviadaEm: new Date() } });
  revalidatePath("/fidelizacao");
}

export async function descartarMensagem(id: string) {
  const s = await requireSession();
  await db.mensagem.delete({ where: { id, clinicaId: s.clinicaId } });
  revalidatePath("/fidelizacao");
}

export async function criarCampanha(fd: FormData) {
  const s = await requireSession();
  const filtro = str(fd, "filtro") || "TODOS";
  const canal = (str(fd, "canal") || "SMS") as CanalMensagem;
  const mensagem = str(fd, "mensagem");
  if (!mensagem) falha("/fidelizacao/campanhas", "Escreva a mensagem");
  const tutores = await db.tutor.findMany({ where: publicoCampanha(s.clinicaId, filtro) });
  const comContato = tutores.filter((t) => (canal === "EMAIL" ? t.email : t.whatsapp ?? t.telefone));
  const campanha = await db.campanha.create({
    data: { clinicaId: s.clinicaId, nome: str(fd, "nome") || "Campanha", canal, mensagem, filtro, total: comContato.length },
  });
  await db.mensagem.createMany({
    data: comContato.map((t) => ({
      clinicaId: s.clinicaId,
      tutorId: t.id,
      canal,
      tipo: "CAMPANHA" as const,
      campanhaId: campanha.id,
      conteudo: mensagem.replace(/\{\{\s*nome\s*\}\}/g, t.nome.split(" ")[0]),
    })),
  });
  await processarFila(s.clinicaId);
  await auditar("criou campanha", "Campanha", campanha.id, `${comContato.length} destinatários`);
  redirect("/fidelizacao/campanhas");
}
