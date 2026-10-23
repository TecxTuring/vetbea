"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import type { Papel, TipoModelo } from "@prisma/client";
import { auditar, requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { falha } from "@/lib/flash";
import { bool, int, opt, str } from "@/lib/form";
import { ehClinicaDemo } from "@/lib/demo";

export async function salvarClinica(fd: FormData) {
  const s = await requireRole("ADMIN");
  if (await ehClinicaDemo(s.clinicaId)) falha("/configuracoes", "Na demonstração os dados da clínica não podem ser alterados.");
  await db.clinica.update({
    where: { id: s.clinicaId },
    data: {
      nome: str(fd, "nome"),
      cnpj: opt(fd, "cnpj"),
      telefone: opt(fd, "telefone"),
      email: opt(fd, "email"),
      endereco: opt(fd, "endereco"),
      cidade: opt(fd, "cidade"),
      uf: opt(fd, "uf"),
      sobre: opt(fd, "sobre"),
    },
  });
  await auditar("editou", "Clinica", s.clinicaId);
  revalidatePath("/configuracoes");
}

export async function salvarUsuario(fd: FormData) {
  const s = await requireRole("ADMIN");
  if (await ehClinicaDemo(s.clinicaId)) falha("/configuracoes/usuarios", "Na demonstração não é possível criar ou alterar usuários.");
  const id = opt(fd, "id");
  const email = str(fd, "email").toLowerCase();
  const senha = str(fd, "senha");
  const dados = {
    nome: str(fd, "nome"),
    email,
    papel: str(fd, "papel") as Papel,
    crmv: opt(fd, "crmv"),
    cor: str(fd, "cor") || "#0d9488",
    ativo: id ? bool(fd, "ativo") : true,
  };
  const existente = await db.usuario.findUnique({ where: { email } });
  if (existente && existente.id !== id) falha("/configuracoes/usuarios", "E-mail já usado por outro usuário");
  if (id) {
    if (id === s.userId && !dados.ativo) falha("/configuracoes/usuarios", "Você não pode desativar o próprio usuário");
    await db.usuario.update({
      where: { id, clinicaId: s.clinicaId },
      data: { ...dados, ...(senha ? { senhaHash: await bcrypt.hash(senha, 10) } : {}) },
    });
  } else {
    if (senha.length < 8) falha("/configuracoes/usuarios", "A senha deve ter pelo menos 8 caracteres");
    await db.usuario.create({ data: { ...dados, clinicaId: s.clinicaId, senhaHash: await bcrypt.hash(senha, 10) } });
  }
  await auditar(id ? "editou" : "criou", "Usuario", id ?? email);
  revalidatePath("/configuracoes/usuarios");
}

export async function salvarModelo(fd: FormData) {
  const s = await requireRole("VETERINARIO");
  const id = opt(fd, "id");
  const data = { nome: str(fd, "nome"), tipo: str(fd, "tipo") as TipoModelo, conteudo: str(fd, "conteudo") };
  if (id) await db.modeloDocumento.update({ where: { id, clinicaId: s.clinicaId }, data });
  else await db.modeloDocumento.create({ data: { ...data, clinicaId: s.clinicaId } });
  revalidatePath("/configuracoes/modelos");
}

export async function excluirModelo(id: string) {
  const s = await requireRole("VETERINARIO");
  await db.modeloDocumento.delete({ where: { id, clinicaId: s.clinicaId } });
  revalidatePath("/configuracoes/modelos");
}

export async function salvarProtocolo(fd: FormData) {
  const s = await requireRole("VETERINARIO");
  const id = opt(fd, "id");
  const data = {
    nome: str(fd, "nome"),
    especie: str(fd, "especie"),
    vacina: str(fd, "vacina"),
    doses: int(fd, "doses") ?? 1,
    intervaloDias: int(fd, "intervaloDias") ?? 21,
    reforcoDias: int(fd, "reforcoDias") ?? 365,
    ativo: id ? bool(fd, "ativo") : true,
  };
  if (id) await db.protocoloVacina.update({ where: { id, clinicaId: s.clinicaId }, data });
  else await db.protocoloVacina.create({ data: { ...data, clinicaId: s.clinicaId } });
  revalidatePath("/configuracoes/protocolos");
}

export async function salvarBox(fd: FormData) {
  const s = await requireRole("VETERINARIO", "AUXILIAR");
  const id = opt(fd, "id");
  const data = { nome: str(fd, "nome"), tipo: str(fd, "tipo") || "Geral", ativo: id ? bool(fd, "ativo") : true };
  if (id) await db.box.update({ where: { id, clinicaId: s.clinicaId }, data });
  else await db.box.create({ data: { ...data, clinicaId: s.clinicaId } });
  revalidatePath("/configuracoes/boxes");
}

export async function salvarModeloPrescricao(fd: FormData) {
  const s = await requireRole("VETERINARIO");
  const id = opt(fd, "id");
  // uma linha por medicamento: medicamento ; dose ; via ; a cada N horas
  const itens = str(fd, "itens")
    .split("\n")
    .map((l) => l.split(";").map((x) => x.trim()))
    .filter((p) => p[0])
    .map(([medicamento, dose = "", via = "VO", freq = "24"]) => ({
      medicamento,
      dose,
      via,
      frequenciaHoras: Math.max(parseInt(freq) || 24, 1),
    }));
  const data = { nome: str(fd, "nome"), itens };
  if (id) await db.modeloPrescricao.update({ where: { id, clinicaId: s.clinicaId }, data });
  else await db.modeloPrescricao.create({ data: { ...data, clinicaId: s.clinicaId } });
  revalidatePath("/configuracoes/boxes");
}
