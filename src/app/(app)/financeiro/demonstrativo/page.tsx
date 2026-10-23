import { endOfYear, startOfYear } from "date-fns";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl } from "@/lib/format";
import { Card, PageHeader } from "@/components/ui";
import { FinanceiroNav } from "../nav";

export const metadata = { title: "Demonstrativo financeiro" };

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default async function Demonstrativo({ searchParams }: { searchParams: Promise<{ ano?: string }> }) {
  const s = await requireSession();
  const { ano: anoStr } = await searchParams;
  const ano = Number(anoStr) || new Date().getFullYear();
  const ref = new Date(ano, 6, 1);
  const contas = await db.contaFinanceira.findMany({
    where: { clinicaId: s.clinicaId, status: "PAGA", pagoEm: { gte: startOfYear(ref), lte: endOfYear(ref) } },
    select: { tipo: true, categoria: true, valorPago: true, valor: true, pagoEm: true },
  });

  const tabela = (tipo: "RECEBER" | "PAGAR") => {
    const cats = new Map<string, number[]>();
    for (const c of contas.filter((x) => x.tipo === tipo)) {
      const linha = cats.get(c.categoria) ?? Array(12).fill(0);
      linha[c.pagoEm!.getMonth()] += Number(c.valorPago ?? c.valor);
      cats.set(c.categoria, linha);
    }
    const linhas = [...cats.entries()].sort((a, b) => b[1].reduce((x, y) => x + y, 0) - a[1].reduce((x, y) => x + y, 0));
    const total = Array(12)
      .fill(0)
      .map((_, m) => linhas.reduce((a, [, l]) => a + l[m], 0));
    return { linhas, total };
  };
  const receitas = tabela("RECEBER");
  const despesas = tabela("PAGAR");
  const resultado = receitas.total.map((r, m) => r - despesas.total[m]);
  const soma = (l: number[]) => l.reduce((a, b) => a + b, 0);

  const Linha = ({ nome, valores, className = "" }: { nome: string; valores: number[]; className?: string }) => (
    <tr className={className}>
      <td className="sticky left-0 bg-inherit whitespace-nowrap">{nome}</td>
      {valores.map((v, i) => (
        <td key={i} className={`text-right whitespace-nowrap ${v < 0 ? "text-red-600" : ""}`}>
          {v ? brl(v) : "—"}
        </td>
      ))}
      <td className="text-right font-semibold whitespace-nowrap">{brl(soma(valores))}</td>
    </tr>
  );

  return (
    <>
      <PageHeader
        title="Financeiro"
        actions={
          <>
            <Link href={`/financeiro/demonstrativo?ano=${ano - 1}`} className="btn-secondary">
              ←
            </Link>
            <span className="text-sm font-medium">{ano}</span>
            <Link href={`/financeiro/demonstrativo?ano=${ano + 1}`} className="btn-secondary">
              →
            </Link>
          </>
        }
      />
      <FinanceiroNav active="demonstrativo" />
      <p className="mb-4 text-sm text-slate-600">Regime de caixa: valores efetivamente recebidos e pagos, agrupados por categoria.</p>
      <Card padded={false}>
        <div className="overflow-x-auto">
          <table className="table text-xs">
            <thead>
              <tr>
                <th className="sticky left-0">Categoria</th>
                {MESES.map((m) => (
                  <th key={m} className="text-right">
                    {m}
                  </th>
                ))}
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-emerald-50 font-semibold text-emerald-800">
                <td colSpan={14}>Receitas</td>
              </tr>
              {receitas.linhas.map(([cat, v]) => (
                <Linha key={cat} nome={cat} valores={v} />
              ))}
              <Linha nome="Total de receitas" valores={receitas.total} className="bg-white font-semibold" />
              <tr className="bg-red-50 font-semibold text-red-800">
                <td colSpan={14}>Despesas</td>
              </tr>
              {despesas.linhas.map(([cat, v]) => (
                <Linha key={cat} nome={cat} valores={v} />
              ))}
              <Linha nome="Total de despesas" valores={despesas.total} className="bg-white font-semibold" />
              <Linha nome="Resultado" valores={resultado} className="bg-brand-50 font-bold" />
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
