"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { startSession } from "@/lib/auth";
import { str } from "@/lib/form";
import { garantirDemo } from "@/lib/demo";

export async function login(_: { erro?: string } | undefined, fd: FormData) {
  const email = str(fd, "email").toLowerCase();
  const senha = str(fd, "senha");
  const usuario = await db.usuario.findUnique({ where: { email } });
  if (!usuario || !usuario.ativo || !(await bcrypt.compare(senha, usuario.senhaHash))) {
    return { erro: "E-mail ou senha inválidos" };
  }
  await startSession({
    userId: usuario.id,
    clinicaId: usuario.clinicaId,
    nome: usuario.nome,
    papel: usuario.papel,
  });
  redirect("/");
}

/** Entra na clínica de demonstração (criada/renovada automaticamente). */
export async function entrarDemo() {
  const usuario = await garantirDemo();
  await startSession({
    userId: usuario.id,
    clinicaId: usuario.clinicaId,
    nome: usuario.nome,
    papel: usuario.papel,
  });
  redirect("/");
}
