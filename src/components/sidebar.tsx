"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import {
  BarChart3,
  BedDouble,
  CalendarDays,
  ClipboardList,
  FileText,
  HeartHandshake,
  Home,
  Menu,
  Package,
  PawPrint,
  Settings,
  ShoppingCart,
  Stethoscope,
  Syringe,
  Users,
  Wallet,
  X,
  FlaskConical,
  Receipt,
} from "lucide-react";
import { Logo } from "./logo";

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const grupos: { titulo?: string; itens: Item[] }[] = [
  {
    itens: [
      { href: "/", label: "Início", icon: Home },
      { href: "/agenda", label: "Agenda", icon: CalendarDays },
    ],
  },
  {
    titulo: "Atendimento",
    itens: [
      { href: "/clientes", label: "Clientes", icon: Users },
      { href: "/animais", label: "Animais", icon: PawPrint },
      { href: "/atendimentos", label: "Atendimentos", icon: Stethoscope },
      { href: "/vacinas", label: "Vacinas", icon: Syringe },
      { href: "/exames", label: "Exames", icon: FlaskConical },
      { href: "/orcamentos", label: "Orçamentos", icon: FileText },
      { href: "/internacao", label: "Internação", icon: BedDouble },
    ],
  },
  {
    titulo: "Gestão",
    itens: [
      { href: "/vendas", label: "Vendas", icon: ShoppingCart },
      { href: "/caixa", label: "Caixa", icon: Receipt },
      { href: "/estoque", label: "Estoque", icon: Package },
      { href: "/financeiro", label: "Financeiro", icon: Wallet },
    ],
  },
  {
    titulo: "Relacionamento",
    itens: [
      { href: "/fidelizacao", label: "Fidelização", icon: HeartHandshake },
      { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
      { href: "/auditoria", label: "Auditoria", icon: ClipboardList },
      { href: "/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
];

export function Sidebar({ clinica, usuario, papel }: { clinica: string; usuario: string; papel: string }) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);

  const ativo = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      {/* Barra superior no celular */}
      <div className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <Logo />
        <button onClick={() => setAberto(true)} className="btn-ghost p-2" aria-label="Abrir menu">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {aberto && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={() => setAberto(false)} />
      )}

      <aside
        className={clsx(
          "no-print fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-brand-900 text-brand-50 transition-transform lg:translate-x-0",
          aberto ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Logo dark />
          <button onClick={() => setAberto(false)} className="lg:hidden" aria-label="Fechar menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {grupos.map((g, i) => (
            <div key={i} className="mb-4">
              {g.titulo && (
                <p className="mb-1 px-3 text-[11px] font-semibold tracking-wider text-brand-300/80 uppercase">
                  {g.titulo}
                </p>
              )}
              {g.itens.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setAberto(false)}
                    className={clsx(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                      ativo(item.href)
                        ? "bg-brand-700 font-medium text-white"
                        : "text-brand-100/90 hover:bg-brand-800 hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-brand-800 px-5 py-4 text-xs">
          <p className="truncate font-medium text-white">{usuario}</p>
          <p className="truncate text-brand-300">
            {papel} · {clinica}
          </p>
          <form action="/logout" method="post" className="mt-2">
            <button className="text-brand-200 hover:text-white hover:underline">Sair</button>
          </form>
        </div>
      </aside>
    </>
  );
}
