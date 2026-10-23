import Link from "next/link";
import clsx from "clsx";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: string;
}) {
  return (
    <div className="no-print mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {back && (
          <Link href={back} className="mb-1 inline-block text-xs text-slate-500 hover:text-brand-700">
            ← Voltar
          </Link>
        )}
        <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  actions,
  children,
  className,
  padded = true,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={clsx("card", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={clsx(padded && "p-5")}>{children}</div>
    </section>
  );
}

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={clsx("block", className)}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

const badgeCores: Record<string, string> = {
  gray: "bg-slate-100 text-slate-700",
  green: "bg-emerald-100 text-emerald-800",
  red: "bg-red-100 text-red-700",
  yellow: "bg-amber-100 text-amber-800",
  blue: "bg-sky-100 text-sky-800",
  purple: "bg-violet-100 text-violet-800",
  orange: "bg-orange-100 text-orange-800",
  brand: "bg-brand-100 text-brand-800",
};

export function Badge({ children, color = "gray" }: { children: ReactNode; color?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        badgeCores[color] ?? badgeCores.gray,
      )}
    >
      {children}
    </span>
  );
}

/** Cor padrão para cada status usado no sistema. */
export function corStatus(status: string): string {
  const mapa: Record<string, string> = {
    AGENDADO: "blue",
    CONFIRMADO: "brand",
    AGUARDANDO: "yellow",
    EM_ATENDIMENTO: "purple",
    CONCLUIDO: "green",
    FALTOU: "red",
    CANCELADO: "gray",
    CANCELADA: "gray",
    ABERTA: "yellow",
    ABERTO: "yellow",
    PAGA: "green",
    FINALIZADA: "green",
    APROVADO: "green",
    APROVADA: "green",
    CONVERTIDO: "brand",
    RECUSADO: "red",
    RECUSADA: "red",
    SOLICITADO: "yellow",
    COLETADO: "blue",
    RESULTADO: "green",
    RASCUNHO: "gray",
    ENVIADO: "blue",
    RECEBIDO: "green",
    INTERNADO: "purple",
    ALTA: "green",
    OBITO: "gray",
    TRANSFERIDO: "blue",
    EMERGENCIA: "red",
    MUITO_URGENTE: "orange",
    URGENTE: "yellow",
    POUCO_URGENTE: "green",
    NAO_URGENTE: "blue",
    PENDENTE: "yellow",
    ENVIADA: "green",
    ERRO: "red",
  };
  return mapa[status] ?? "gray";
}

export function Empty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center text-sm text-slate-500">
      <p>{children}</p>
      {action}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  href,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  href?: string;
  tone?: "default" | "good" | "bad" | "warn";
}) {
  const body = (
    <div className="card h-full p-5 transition hover:border-brand-300">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</p>
      <p
        className={clsx(
          "mt-2 text-2xl font-semibold",
          tone === "good" && "text-emerald-700",
          tone === "bad" && "text-red-600",
          tone === "warn" && "text-amber-600",
          tone === "default" && "text-slate-800",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function Tabs({ tabs, active }: { tabs: { key: string; label: string; href: string }[]; active: string }) {
  return (
    <nav className="no-print mb-5 flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={clsx(
            "-mb-px border-b-2 px-4 py-2 text-sm font-medium whitespace-nowrap",
            t.key === active
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-slate-500 hover:text-slate-700",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

/** Painel recolhível usado para formulários de "novo registro". */
export function Collapsible({
  label,
  children,
  open,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  open?: boolean;
  className?: string;
}) {
  return (
    <details className={clsx("card group no-print", className)} open={open}>
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3 text-sm font-semibold text-brand-700 select-none">
        {label}
        <span className="text-slate-400 transition group-open:rotate-45">＋</span>
      </summary>
      <div className="border-t border-slate-100 p-5">{children}</div>
    </details>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="table">{children}</table>
    </div>
  );
}

export function SearchBar({
  placeholder,
  defaultValue,
  children,
}: {
  placeholder: string;
  defaultValue?: string;
  children?: ReactNode;
}) {
  return (
    <form className="no-print mb-4 flex flex-wrap gap-2">
      <input name="q" defaultValue={defaultValue} placeholder={placeholder} className="input max-w-sm" />
      {children}
      <button className="btn-secondary">Buscar</button>
    </form>
  );
}
