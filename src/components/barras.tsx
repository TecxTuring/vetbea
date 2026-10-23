import { brl } from "@/lib/format";

/** Gráfico de colunas de uma série (ex.: faturamento mensal). Tooltip nativo por coluna. */
export function Colunas({ dados, moeda = true }: { dados: { rotulo: string; valor: number }[]; moeda?: boolean }) {
  const max = Math.max(...dados.map((d) => d.valor), 1);
  const f = (v: number) => (moeda ? brl(v) : v.toLocaleString("pt-BR"));
  return (
    <div className="flex h-56 items-end gap-1.5 border-b border-slate-200 pt-6" role="img">
      {dados.map((d) => (
        <div key={d.rotulo} className="group relative flex h-full flex-1 flex-col items-center justify-end">
          <span className="pointer-events-none absolute -top-5 hidden rounded bg-slate-800 px-1.5 py-0.5 text-[10px] whitespace-nowrap text-white group-hover:block">
            {d.rotulo}: {f(d.valor)}
          </span>
          <div
            className="w-full max-w-12 rounded-t-[4px] bg-brand-500 transition group-hover:bg-brand-700"
            style={{ height: `${(d.valor / max) * 100}%`, minHeight: d.valor > 0 ? 2 : 0 }}
            title={`${d.rotulo}: ${f(d.valor)}`}
          />
          <span className="mt-1 text-[10px] text-slate-500">{d.rotulo}</span>
        </div>
      ))}
    </div>
  );
}

/** Barras horizontais com rótulo e valor (ranking por categoria). */
export function BarrasH({ dados, moeda = true }: { dados: { rotulo: string; valor: number }[]; moeda?: boolean }) {
  const max = Math.max(...dados.map((d) => d.valor), 1);
  const f = (v: number) => (moeda ? brl(v) : v.toLocaleString("pt-BR"));
  if (dados.length === 0) return <p className="py-6 text-center text-sm text-slate-500">Sem dados no período.</p>;
  return (
    <ul className="space-y-2.5">
      {dados.map((d) => (
        <li key={d.rotulo} title={`${d.rotulo}: ${f(d.valor)}`}>
          <div className="mb-0.5 flex justify-between text-xs">
            <span className="truncate text-slate-700">{d.rotulo}</span>
            <span className="font-medium text-slate-800">{f(d.valor)}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-brand-500" style={{ width: `${(d.valor / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
