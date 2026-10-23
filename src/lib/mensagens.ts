import { addDays, endOfDay, startOfDay, subDays } from "date-fns";
import type { CanalMensagem, Mensagem, Tutor } from "@prisma/client";
import { db } from "./db";
import { data, hora } from "./format";
import { ehClinicaDemo } from "./demo";

const appUrl = () => process.env.APP_URL ?? "";
const primeiroNome = (n: string) => n.split(" ")[0];

/**
 * Gera as mensagens automáticas do dia para uma clínica (idempotente):
 * lembretes de agendamento, vacinas, aniversários dos pets e pesquisa de satisfação.
 */
export async function gerarMensagensAutomaticas(clinicaId: string) {
  const clinica = await db.clinica.findUniqueOrThrow({ where: { id: clinicaId } });
  const hoje = new Date();
  const amanha = addDays(hoje, 1);
  let criadas = 0;

  // 1. Lembrete de agendamentos de amanhã
  const agendamentos = await db.agendamento.findMany({
    where: {
      clinicaId,
      lembreteEnviado: false,
      status: { in: ["AGENDADO", "CONFIRMADO"] },
      inicio: { gte: startOfDay(amanha), lte: endOfDay(amanha) },
      tutor: { aceitaMensagens: true },
    },
    include: { tutor: true, animal: true },
  });
  for (const a of agendamentos) {
    if (!a.tutor) continue;
    await db.mensagem.create({
      data: {
        clinicaId,
        tutorId: a.tutor.id,
        tipo: "LEMBRETE_AGENDA",
        conteudo: `Olá, ${primeiroNome(a.tutor.nome)}! Lembrete: ${a.animal?.nome ?? "seu pet"} tem horário amanhã (${data(a.inicio)}) às ${hora(a.inicio)} na ${clinica.nome}. Responda para confirmar. 🐾`,
      },
    });
    await db.agendamento.update({ where: { id: a.id }, data: { lembreteEnviado: true } });
    criadas++;
  }

  // 2. Vacinas previstas para os próximos 3 dias (ou atrasadas há até 15 dias)
  const vacinas = await db.vacinaAplicada.findMany({
    where: {
      clinicaId,
      aplicadaEm: null,
      lembreteEnviado: false,
      proximaDose: { gte: subDays(hoje, 15), lte: endOfDay(addDays(hoje, 3)) },
      animal: { obito: false, tutor: { aceitaMensagens: true } },
    },
    include: { animal: { include: { tutor: true } } },
  });
  for (const v of vacinas) {
    await db.mensagem.create({
      data: {
        clinicaId,
        tutorId: v.animal.tutorId,
        tipo: "LEMBRETE_VACINA",
        conteudo: `Olá, ${primeiroNome(v.animal.tutor.nome)}! A vacina ${v.nome} de ${v.animal.nome} está prevista para ${data(v.proximaDose)}. Vamos agendar? 💉`,
      },
    });
    await db.vacinaAplicada.update({ where: { id: v.id }, data: { lembreteEnviado: true } });
    criadas++;
  }

  // 3. Aniversário dos pets
  const aniversariantes = await db.$queryRaw<{ id: string; nome: string; tutorId: string; tutorNome: string }[]>`
    SELECT a.id, a.nome, a."tutorId", t.nome AS "tutorNome" FROM "Animal" a
    JOIN "Tutor" t ON t.id = a."tutorId"
    WHERE a."clinicaId" = ${clinicaId} AND NOT a.obito AND t."aceitaMensagens"
      AND a."dataNascimento" IS NOT NULL
      AND EXTRACT(MONTH FROM a."dataNascimento") = ${hoje.getMonth() + 1}
      AND EXTRACT(DAY FROM a."dataNascimento") = ${hoje.getDate()}`;
  for (const a of aniversariantes) {
    const ja = await db.mensagem.findFirst({
      where: { clinicaId, tutorId: a.tutorId, tipo: "ANIVERSARIO", createdAt: { gte: startOfDay(hoje) }, conteudo: { contains: a.nome } },
    });
    if (ja) continue;
    await db.mensagem.create({
      data: {
        clinicaId,
        tutorId: a.tutorId,
        tipo: "ANIVERSARIO",
        conteudo: `Parabéns, ${a.nome}! 🎂🐾 Toda a equipe da ${clinica.nome} deseja um dia muito feliz. ${primeiroNome(a.tutorNome)}, obrigado por confiar na gente!`,
      },
    });
    criadas++;
  }

  // 4. Pesquisa de satisfação (NPS) — dia seguinte ao atendimento, no máximo 1 a cada 90 dias por tutor
  const atendidosOntem = await db.atendimento.findMany({
    where: { clinicaId, finalizado: true, data: { gte: startOfDay(subDays(hoje, 1)), lte: endOfDay(subDays(hoje, 1)) } },
    include: { animal: { include: { tutor: true } } },
  });
  const tutoresVistos = new Set<string>();
  for (const at of atendidosOntem) {
    const tutor = at.animal.tutor;
    if (!tutor.aceitaMensagens || tutoresVistos.has(tutor.id)) continue;
    tutoresVistos.add(tutor.id);
    const recente = await db.pesquisaNps.findFirst({ where: { tutorId: tutor.id, createdAt: { gte: subDays(hoje, 90) } } });
    if (recente) continue;
    const pesquisa = await db.pesquisaNps.create({ data: { clinicaId, tutorId: tutor.id } });
    await db.mensagem.create({
      data: {
        clinicaId,
        tutorId: tutor.id,
        tipo: "NPS",
        conteudo: `Olá, ${primeiroNome(tutor.nome)}! Como foi o atendimento de ${at.animal.nome} na ${clinica.nome}? Sua opinião leva 10 segundos: ${appUrl()}/r/nps/${pesquisa.token}`,
      },
    });
    criadas++;
  }

  return criadas;
}

/**
 * Envia a mensagem pelo provedor configurado. Sem provedor configurado, a mensagem fica pendente
 * para envio manual pelo WhatsApp Web (botão "Enviar" na fila de mensagens).
 */
export async function enviarMensagem(m: Mensagem & { tutor: Tutor }): Promise<boolean> {
  const destino = destinoPara(m.canal, m.tutor);
  if (!destino) {
    await db.mensagem.update({ where: { id: m.id }, data: { status: "ERRO" } });
    return false;
  }
  const url = process.env[`${m.canal}_WEBHOOK_URL`];
  if (!url) return false; // envio manual
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env[`${m.canal}_WEBHOOK_TOKEN`] ? { Authorization: `Bearer ${process.env[`${m.canal}_WEBHOOK_TOKEN`]}` } : {}),
      },
      body: JSON.stringify({ to: destino, message: m.conteudo, canal: m.canal }),
    });
    await db.mensagem.update({
      where: { id: m.id },
      data: r.ok ? { status: "ENVIADA", enviadaEm: new Date() } : { status: "ERRO" },
    });
    return r.ok;
  } catch {
    await db.mensagem.update({ where: { id: m.id }, data: { status: "ERRO" } });
    return false;
  }
}

export function destinoPara(canal: CanalMensagem, tutor: Tutor): string | null {
  if (canal === "EMAIL") return tutor.email;
  const fone = (tutor.whatsapp ?? tutor.telefone)?.replace(/\D/g, "");
  if (!fone) return null;
  return fone.length <= 11 ? `55${fone}` : fone;
}

export async function processarFila(clinicaId: string) {
  if (await ehClinicaDemo(clinicaId)) return 0; // a demonstração nunca envia mensagens reais
  const pendentes = await db.mensagem.findMany({
    where: { clinicaId, status: "PENDENTE" },
    include: { tutor: true },
    take: 200,
  });
  let enviadas = 0;
  for (const m of pendentes) if (await enviarMensagem(m)) enviadas++;
  return enviadas;
}
