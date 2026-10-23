"use client";

import { useFormStatus } from "react-dom";
import clsx from "clsx";
import type { ReactNode } from "react";

export function SubmitButton({
  children,
  className = "btn-primary",
  confirm,
  name,
  value,
}: {
  children: ReactNode;
  className?: string;
  confirm?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={clsx(className)}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? "Salvando…" : children}
    </button>
  );
}

export function PrintButton({ label = "Imprimir" }: { label?: string }) {
  return (
    <button type="button" className="btn-secondary no-print" onClick={() => window.print()}>
      {label}
    </button>
  );
}

export function CopyButton({ text, label = "Copiar link" }: { text: string; label?: string }) {
  return (
    <button
      type="button"
      className="btn-secondary btn-sm"
      onClick={async (e) => {
        const btn = e.currentTarget;
        const url = text.startsWith("/") ? window.location.origin + text : text;
        await navigator.clipboard.writeText(url);
        btn.textContent = "Copiado!";
        setTimeout(() => (btn.textContent = label), 1500);
      }}
    >
      {label}
    </button>
  );
}

/** Select que envia o formulário ao mudar (filtros). */
export function AutoSubmitSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}

/** Textarea com seletor de modelos: escolher um modelo preenche o texto. */
export function ModeloTextarea({
  modelos,
  name = "conteudo",
  rows = 10,
  tituloName,
}: {
  modelos: { id: string; nome: string; conteudo: string }[];
  name?: string;
  rows?: number;
  tituloName?: string;
}) {
  return (
    <div className="space-y-3">
      <select
        className="input"
        defaultValue=""
        onChange={(e) => {
          const m = modelos.find((x) => x.id === e.target.value);
          const form = e.currentTarget.form;
          if (!m || !form) return;
          (form.elements.namedItem(name) as HTMLTextAreaElement).value = m.conteudo;
          if (tituloName) (form.elements.namedItem(tituloName) as HTMLInputElement).value = m.nome;
        }}
      >
        <option value="">Usar um modelo…</option>
        {modelos.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nome}
          </option>
        ))}
      </select>
      <textarea name={name} rows={rows} required className="input font-mono text-[13px]" />
    </div>
  );
}
