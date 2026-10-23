"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { startSession } from "@/lib/auth";
import { str } from "@/lib/form";
import { criarDadosIniciais } from "@/lib/setup";

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function cadastrar(_: { erro?: string } | undefined, fd: FormData) {
  const clinicaNome = str(fd, "clinica");
  const nome = str(fd, "nome");
  const email = str(fd, "email").toLowerCase();
  const senha = str(fd, "senha");
  if (!clinicaNome || !nome || !email) return { erro: "Preencha todos os campos" };
  if (senha.length < 8) return { erro: "A senha deve ter pelo menos 8 caracteres" };
  if (await db.usuario.findUnique({ where: { email } })) return { erro: "E-mail já cadastrado" };

  let slug = slugify(clinicaNome) || "clinica";
  if (await db.clinica.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;

  const clinica = await db.clinica.create({ data: { nome: clinicaNome, slug } });
  const usuario = await db.usuario.create({
    data: {
      clinicaId: clinica.id,
      nome,
      email,
      senhaHash: await bcrypt.hash(senha, 10),
      papel: "ADMIN",
    },
  });
  await criarDadosIniciais(clinica.id);
  await startSession({ userId: usuario.id, clinicaId: clinica.id, nome, papel: "ADMIN" });
  redirect("/");
}
