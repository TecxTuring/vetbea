"use client";

import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="label">E-mail</span>
        <input name="email" type="email" required autoFocus className="input" />
      </label>
      <label className="block">
        <span className="label">Senha</span>
        <input name="senha" type="password" required className="input" />
      </label>
      {state?.erro && <p className="text-sm text-red-600">{state.erro}</p>}
      <button disabled={pending} className="btn-primary w-full">
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
