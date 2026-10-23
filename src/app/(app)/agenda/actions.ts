"use server";

import { addMinutes } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditar, requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { int, opt, str } from "@/lib/form";
import type { StatusAgendamento, TipoAgendamento } from "@prisma/client";

export async function criarAgendamento(fd: FormData) {
  const s = await requireSession();
  const animalId = opt(fd, "animalId");
  const animal = animalId
    ? await db.animal.findFirstOrThrow({ where: { id: animalId, clinicaId: s.clinicaId } })
    : null;
  const inicio = new Date(str(fd, "inicio"));
  if (isNaN(inicio.getTime())) throw new Error("Data inválida");
  const duracao = int(fd, "duracao") ?? 30;
  const veterinarioId = opt(fd, "veterinarioId");

  // evita dois agendamentos sobrepostos para o mesmo veterinário
  if (veterinarioId) {
    const conflito = await db.agendamento.findFirst({
      where: {
        clinicaId: s.clinicaId,
        veterinarioId,
        status: { notIn: ["CANCELADO", "FALTOU"] },
        inicio: { lt: addMinutes(inicio, duracao) },
        fim: { gt: inicio },
      },
    });
    if (conflito && !fd.get("forcar")) {
      redirect(`/agenda?data=${str(fd, "inicio").slice(0, 10)}&conflito=1`);
    }
  }

  const ag = await db.agendamento.create({
    data: {
      clinicaId: s.clinicaId,
      animalId: animal?.id,
      tutorId: animal?.tutorId ?? opt(fd, "tutorId"),
      veterinarioId,
      tipo: (str(fd, "tipo") || "CONSULTA") as TipoAgendamento,
      inicio,
      fim: addMinutes(inicio, duracao),
      observacoes: opt(fd, "observacoes"),
    },
  });
  await auditar("criou", "Agendamento", ag.id);
  redirect(`/agenda?data=${str(fd, "inicio").slice(0, 10)}`);
}

export async function mudarStatus(id: string, status: StatusAgendamento) {
  const s = await requireSession();
  await db.agendamento.update({ where: { id, clinicaId: s.clinicaId }, data: { status } });
  revalidatePath("/agenda");
  revalidatePath("/");
}

/** Inicia o atendimento clínico a partir do agendamento. */
export async function iniciarAtendimento(id: string) {
  const s = await requireSession();
  const ag = await db.agendamento.findFirstOrThrow({
    where: { id, clinicaId: s.clinicaId },
    include: { atendimento: true },
  });
  if (ag.atendimento) redirect(`/atendimentos/${ag.atendimento.id}`);
  if (!ag.animalId) throw new Error("Agendamento sem animal");
  const at = await db.atendimento.create({
    data: {
      clinicaId: s.clinicaId,
      animalId: ag.animalId,
      veterinarioId: ag.veterinarioId ?? s.userId,
      agendamentoId: ag.id,
      tipo: ag.tipo === "RETORNO" ? "Retorno" : ag.tipo === "VACINA" ? "Vacinação" : "Consulta",
    },
  });
  await db.agendamento.update({ where: { id }, data: { status: "EM_ATENDIMENTO" } });
  redirect(`/atendimentos/${at.id}`);
}

export async function excluirAgendamento(id: string) {
  const s = await requireSession();
  await db.agendamento.update({ where: { id, clinicaId: s.clinicaId }, data: { status: "CANCELADO" } });
  revalidatePath("/agenda");
}
