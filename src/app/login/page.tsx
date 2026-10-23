import Link from "next/link";
import { Logo } from "@/components/logo";
import { LoginForm } from "./form";
import { DemoButton } from "./demo-button";

export const metadata = { title: "Entrar" };

// a primeira entrada do dia na demonstração recria os dados fictícios
export const maxDuration = 60;

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-brand-900 p-12 text-brand-50 lg:flex">
        <Logo dark size="lg" />
        <div>
          <h2 className="text-4xl leading-tight font-semibold text-white">
            Gestão completa para a sua clínica veterinária.
          </h2>
          <p className="mt-4 max-w-md text-brand-200">
            Agenda, prontuário, internação, estoque, financeiro e relacionamento com o tutor em um só lugar.
          </p>
        </div>
        <p className="text-xs text-brand-300">© {new Date().getFullYear()} Mapigo</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-800">Entrar</h1>
          <p className="mb-6 text-sm text-slate-500">Acesse sua conta Mapigo.</p>
          <LoginForm />
          <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" /> ou <span className="h-px flex-1 bg-slate-200" />
          </div>
          <DemoButton />
          <p className="mt-2 text-center text-xs text-slate-500">
            Clínica fictícia com clientes, agenda, internações e financeiro. Os dados são renovados todo dia.
          </p>
          <p className="mt-6 text-center text-sm text-slate-500">
            Ainda não usa o Mapigo?{" "}
            <Link href="/cadastro" className="link">
              Cadastre sua clínica
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
