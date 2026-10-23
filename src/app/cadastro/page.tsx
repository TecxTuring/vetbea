"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Logo } from "@/components/logo";
import { cadastrar } from "./actions";

export default function CadastroPage() {
  const [state, action, pending] = useActionState(cadastrar, undefined);
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="card w-full max-w-md p-8">
        <Logo size="lg" />
        <h1 className="mt-6 text-xl font-semibold text-slate-800">Cadastre sua clínica</h1>
        <p className="mb-6 text-sm text-slate-500">Leva menos de um minuto.</p>
        <form action={action} className="space-y-4">
          <label className="block">
            <span className="label">Nome da clínica</span>
            <input name="clinica" required className="input" />
          </label>
          <label className="block">
            <span className="label">Seu nome</span>
            <input name="nome" required className="input" />
          </label>
          <label className="block">
            <span className="label">E-mail</span>
            <input name="email" type="email" required className="input" />
          </label>
          <label className="block">
            <span className="label">Senha (mín. 8 caracteres)</span>
            <input name="senha" type="password" minLength={8} required className="input" />
          </label>
          {state?.erro && <p className="text-sm text-red-600">{state.erro}</p>}
          <button disabled={pending} className="btn-primary w-full">
            {pending ? "Criando…" : "Criar conta"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          Já tem conta?{" "}
          <Link href="/login" className="link">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
