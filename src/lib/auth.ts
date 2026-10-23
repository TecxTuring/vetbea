import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { SESSION_COOKIE, signSession, verifySession, type SessionPayload } from "./session";
import { db } from "./db";

export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
});

/** Sessão obrigatória: redireciona para o login se não houver usuário. */
export async function requireSession(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

export async function requireRole(...papeis: string[]): Promise<SessionPayload> {
  const s = await requireSession();
  if (s.papel !== "ADMIN" && !papeis.includes(s.papel)) redirect("/?erro=permissao");
  return s;
}

export async function startSession(payload: SessionPayload) {
  const token = await signSession(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function endSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function auditar(acao: string, entidade: string, entidadeId?: string, detalhes?: string) {
  const s = await getSession();
  if (!s) return;
  await db.auditoria.create({
    data: { clinicaId: s.clinicaId, usuarioId: s.userId, acao, entidade, entidadeId, detalhes },
  });
}
