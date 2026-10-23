"use server";

import { addDays, addHours } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { StatusInternacao, Triagem } from "@prisma/client";
import { auditar, requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { falha } from "@/lib/flash";
import { bool, date, dec, int, opt, str } from "@/lib/form";
import { adicionarItemVenda } from "@/lib/vendas";

const HORIZONTE_DIAS = 7;

async function internacaoDaClinica(id: string) {
  const s = await requireSession();
  const internacao = await db.internacao.findFirstOrThrow({
    where: { id, clinicaId: s.clinicaId },
    include: { animal: { include: { tutor: true } } },
  });
  return { s, internacao };
}

/** Cria os horários de aplicação de uma prescrição até o fim (ou próximos 7 dias). */
function horarios(inicio: Date, frequenciaHoras: number, fim?: Date | null) {
  const limite = fim ?? addDays(inicio, HORIZONTE_DIAS);
  const lista: Date[] = [];
  for (let t = inicio; t <= limite && lista.length < 500; t = addHours(t, Math.max(frequenciaHoras, 1))) lista.push(t);
  return lista;
}

async function criarPrescricao(
  internacaoId: string,
  p: { medicamento: string; dose: string; via: string; frequenciaHoras: number; inicio?: Date; fim?: Date | null; observacao?: string | null },
) {
  const inicio = p.inicio ?? new Date();
  return db.prescricao.create({
    data: {
      internacaoId,
      medicamento: p.medicamento,
      dose: p.dose,
      via: p.via,
      frequenciaHoras: p.frequenciaHoras,
      inicio,
      fim: p.fim ?? null,
      observacao: p.observacao ?? null,
      aplicacoes: { create: horarios(inicio, p.frequenciaHoras, p.fim).map((previstoEm) => ({ previstoEm })) },
    },
  });
}

export async function internar(fd: FormData) {
  const s = await requireSession();
  const animal = await db.animal.findFirst({ where: { id: str(fd, "animalId"), clinicaId: s.clinicaId } });
  if (!animal) falha("/internacao/nova", "Selecione o animal");
  const ativa = await db.internacao.findFirst({ where: { animalId: animal.id, status: "INTERNADO" } });
  if (ativa) redirect(`/internacao/${ativa.id}`);
  const boxId = opt(fd, "boxId");
  if (boxId) {
    const ocupado = await db.internacao.findFirst({ where: { boxId, status: "INTERNADO" } });
    if (ocupado) falha("/internacao/nova", "Este box já está ocupado");
  }
  const internacao = await db.internacao.create({
    data: {
      clinicaId: s.clinicaId,
      animalId: animal.id,
      veterinarioId: opt(fd, "veterinarioId") ?? s.userId,
      boxId,
      triagem: (str(fd, "triagem") || "NAO_URGENTE") as Triagem,
      motivo: str(fd, "motivo"),
    },
  });
  const modeloId = opt(fd, "modeloId");
  if (modeloId) {
    const modelo = await db.modeloPrescricao.findFirst({ where: { id: modeloId, clinicaId: s.clinicaId } });
    for (const item of (modelo?.itens ?? []) as { medicamento: string; dose: string; via: string; frequenciaHoras: number }[]) {
      await criarPrescricao(internacao.id, item);
    }
  }
  await auditar("internou", "Internacao", internacao.id, animal.nome);
  redirect(`/internacao/${internacao.id}`);
}

export async function atualizarInternacao(id: string, fd: FormData) {
  await internacaoDaClinica(id);
  const boxId = opt(fd, "boxId");
  if (boxId) {
    const ocupado = await db.internacao.findFirst({ where: { boxId, status: "INTERNADO", id: { not: id } } });
    if (ocupado) falha(`/internacao/${id}`, "Este box já está ocupado");
  }
  await db.internacao.update({
    where: { id },
    data: { boxId, triagem: str(fd, "triagem") as Triagem, motivo: str(fd, "motivo") },
  });
  revalidatePath(`/internacao/${id}`);
}

export async function adicionarPrescricao(id: string, fd: FormData) {
  await internacaoDaClinica(id);
  const frequenciaHoras = int(fd, "frequenciaHoras") ?? 0;
  if (!str(fd, "medicamento") || frequenciaHoras <= 0) falha(`/internacao/${id}`, "Informe medicamento e frequência");
  await criarPrescricao(id, {
    medicamento: str(fd, "medicamento"),
    dose: str(fd, "dose"),
    via: str(fd, "via"),
    frequenciaHoras,
    inicio: date(fd, "inicio") ?? new Date(),
    fim: date(fd, "fim"),
    observacao: opt(fd, "observacao"),
  });
  revalidatePath(`/internacao/${id}`);
}

export async function aplicarModelo(id: string, fd: FormData) {
  const { s } = await internacaoDaClinica(id);
  const modelo = await db.modeloPrescricao.findFirstOrThrow({ where: { id: str(fd, "modeloId"), clinicaId: s.clinicaId } });
  for (const item of modelo.itens as { medicamento: string; dose: string; via: string; frequenciaHoras: number }[]) {
    await criarPrescricao(id, item);
  }
  revalidatePath(`/internacao/${id}`);
}

export async function suspenderPrescricao(id: string, prescricaoId: string) {
  await internacaoDaClinica(id);
  await db.$transaction([
    db.prescricao.update({ where: { id: prescricaoId, internacaoId: id }, data: { ativa: false, fim: new Date() } }),
    db.aplicacaoPrescricao.deleteMany({ where: { prescricaoId, realizadoEm: null, previstoEm: { gt: new Date() } } }),
  ]);
  revalidatePath(`/internacao/${id}`);
}

export async function registrarAplicacao(id: string, aplicacaoId: string, fd: FormData) {
  const { s } = await internacaoDaClinica(id);
  await db.aplicacaoPrescricao.update({
    where: { id: aplicacaoId, prescricao: { internacaoId: id } },
    data: { realizadoEm: new Date(), responsavel: s.nome, observacao: opt(fd, "observacao") },
  });
  revalidatePath(`/internacao/${id}`);
}

export async function desfazerAplicacao(id: string, aplicacaoId: string) {
  await internacaoDaClinica(id);
  await db.aplicacaoPrescricao.update({
    where: { id: aplicacaoId, prescricao: { internacaoId: id } },
    data: { realizadoEm: null, responsavel: null },
  });
  revalidatePath(`/internacao/${id}`);
}

export async function registrarParametros(id: string, fd: FormData) {
  const { s } = await internacaoDaClinica(id);
  await db.parametroClinico.create({
    data: {
      internacaoId: id,
      temperatura: dec(fd, "temperatura"),
      fc: int(fd, "fc"),
      fr: int(fd, "fr"),
      pas: int(fd, "pas"),
      glicemia: int(fd, "glicemia"),
      tpc: opt(fd, "tpc"),
      mucosas: opt(fd, "mucosas"),
      hidratacao: opt(fd, "hidratacao"),
      dor: int(fd, "dor"),
      observacao: opt(fd, "observacao"),
      responsavel: s.nome,
    },
  });
  revalidatePath(`/internacao/${id}`);
}

export async function registrarEvolucao(id: string, fd: FormData) {
  const { s } = await internacaoDaClinica(id);
  const texto = str(fd, "texto");
  if (!texto) return;
  await db.evolucao.create({ data: { internacaoId: id, texto, trocaTurno: bool(fd, "trocaTurno"), responsavel: s.nome } });
  revalidatePath(`/internacao/${id}`);
}

/** Envia ao tutor um pedido de autorização (procedimento, exame, custo extra). */
export async function criarSolicitacao(id: string, fd: FormData) {
  const { s, internacao } = await internacaoDaClinica(id);
  const sol = await db.solicitacaoTutor.create({
    data: { internacaoId: id, titulo: str(fd, "titulo"), descricao: str(fd, "descricao"), valor: dec(fd, "valor") },
  });
  await db.mensagem.create({
    data: {
      clinicaId: s.clinicaId,
      tutorId: internacao.animal.tutorId,
      tipo: "SOLICITACAO",
      conteudo: `Olá, ${internacao.animal.tutor.nome.split(" ")[0]}! Precisamos da sua autorização para "${sol.titulo}" de ${internacao.animal.nome}. Acesse: ${process.env.APP_URL ?? ""}/r/solicitacao/${sol.token}`,
    },
  });
  revalidatePath(`/internacao/${id}`);
}

export async function lancarDiaria(id: string) {
  const { s, internacao } = await internacaoDaClinica(id);
  let venda = await db.venda.findFirst({
    where: { clinicaId: s.clinicaId, animalId: internacao.animalId, status: "ABERTA", atendimentoId: null },
  });
  if (!venda) {
    venda = await db.venda.create({
      data: { clinicaId: s.clinicaId, animalId: internacao.animalId, tutorId: internacao.animal.tutorId, usuarioId: s.userId },
    });
  }
  const diaria = await db.produto.findFirst({
    where: { clinicaId: s.clinicaId, nome: { contains: "diária", mode: "insensitive" }, tipo: "SERVICO" },
  });
  await adicionarItemVenda(venda.id, s.clinicaId, {
    produtoId: diaria?.id,
    descricao: "Diária de internação",
    quantidade: 1,
    valorUnit: diaria ? null : 0,
  });
  revalidatePath(`/internacao/${id}`);
}

export async function darAlta(id: string, fd: FormData) {
  await internacaoDaClinica(id);
  const status = (str(fd, "status") || "ALTA") as StatusInternacao;
  await db.$transaction([
    db.internacao.update({
      where: { id },
      data: { status, saida: new Date(), resumoAlta: opt(fd, "resumoAlta") },
    }),
    db.prescricao.updateMany({ where: { internacaoId: id, ativa: true }, data: { ativa: false, fim: new Date() } }),
    db.aplicacaoPrescricao.deleteMany({ where: { prescricao: { internacaoId: id }, realizadoEm: null, previstoEm: { gt: new Date() } } }),
  ]);
  if (status === "OBITO") {
    const i = await db.internacao.findUniqueOrThrow({ where: { id } });
    await db.animal.update({ where: { id: i.animalId }, data: { obito: true } });
  }
  await auditar(status === "OBITO" ? "registrou óbito" : "deu alta", "Internacao", id);
  revalidatePath(`/internacao/${id}`);
}
