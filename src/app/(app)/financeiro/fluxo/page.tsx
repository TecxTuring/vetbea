import { addMonths, eachDayOfInterval, endOfMonth, format, startOfMonth } from "date-fns";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl, fmt } from "@/lib/format";
import { Card, PageHeader, Stat, Table } from "@/components/ui";
import { FinanceiroNav } from "../nav";
import Link from "next/link";

export const metadata = { title: "Fluxo de caixa" };

export default async function Fluxo({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const s = await requireSession();
  const { mes } = await searchParams;
  const ref = mes ? new Date(mes + "-15T12:00:00") : new Date();
  const ini = startOfMonth(ref);
  const fim = endOfMonth(ref);

  const [realizadas, previstas, saldoAnterior] = await Promise.all([
    db.contaFinanceira.findMany({
      where: { clinicaId: s.clinicaId, status: "PAGA", pagoEm: { gte: ini, lte: fim } },
      select: { tipo: true, valorPago: true, valor: true, pagoEm: true },
    }),
    db.contaFinanceira.findMany({
      where: { clinicaId: s.clinicaId, status: "ABERTA", vencimento: { gte: ini, lte: fim } },
      select: { tipo: true, valor: true, vencimento: true },
    }),
    db.contaFinanceira.groupBy({
      by: ["tipo"],
      where: { clinicaId: s.clinicaId, status: "PAGA", pagoEm: { lt: ini } },
      _sum: { valorPago: true },
    }),
  ]);
  const inicial =
    Number(saldoAnterior.find((x) => x.tipo === "RECEBER")?._sum.valorPago ?? 0) -
    Number(saldoAnterior.find((x) => x.tipo === "PAGAR")?._sum.valorPago ?? 0);

  let saldo = inicial;
  const dias = eachDayOfInterval({ start: ini, end: fim }).map((d) => {
    const k = format(d, "yyyy-MM-dd");
    const sameDay = (x: Date | null) => !!x && format(x, "yyyy-MM-dd") === k;
    const entradas = realizadas.filter((c) => c.tipo === "RECEBER" && sameDay(c.pagoEm)).reduce((a, c) => a + Number(c.valorPago ?? c.valor), 0);
    const saidas = realizadas.filter((c) => c.tipo === "PAGAR" && sameDay(c.pagoEm)).reduce((a, c) => a + Number(c.valorPago ?? c.valor), 0);
    const prevE = previstas.filter((c) => c.tipo === "RECEBER" && sameDay(c.vencimento)).reduce((a, c) => a + Number(c.valor), 0);
    const prevS = previstas.filter((c) => c.tipo === "PAGAR" && sameDay(c.vencimento)).reduce((a, c) => a + Number(c.valor), 0);
    saldo += entradas - saidas + prevE - prevS;
    return { d, entradas, saidas, prevE, prevS, saldo };
  });
  const totE = dias.reduce((a, x) => a + x.entradas, 0);
  const totS = dias.reduce((a, x) => a + x.saidas, 0);
  const totPE = dias.reduce((a, x) => a + x.prevE, 0);
  const totPS = dias.reduce((a, x) => a + x.prevS, 0);
  const qs = (d: Date) => `/financeiro/fluxo?mes=${format(d, "yyyy-MM")}`;

  return (
    <>
      <PageHeader
        title="Financeiro"
        actions={
          <>
            <Link href={qs(addMonths(ref, -1))} className="btn-secondary">
              ←
            </Link>
            <span className="text-sm font-medium capitalize">{fmt(ref, "MMMM yyyy")}</span>
            <Link href={qs(addMonths(ref, 1))} className="btn-secondary">
              →
            </Link>
          </>
        }
      />
      <FinanceiroNav active="fluxo" />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Saldo inicial" value={brl(inicial)} />
        <Stat label="Entradas (realizadas + previstas)" value={brl(totE + totPE)} hint={`Previsto: ${brl(totPE)}`} tone="good" />
        <Stat label="Saídas (realizadas + previstas)" value={brl(totS + totPS)} hint={`Previsto: ${brl(totPS)}`} tone="bad" />
        <Stat label="Saldo projetado no fim do mês" value={brl(saldo)} tone={saldo >= 0 ? "good" : "bad"} />
      </div>
      <Card padded={false}>
        <Table>
          <thead>
            <tr>
              <th>Dia</th>
              <th className="text-right">Entradas</th>
              <th className="text-right">Saídas</th>
              <th className="text-right">A receber</th>
              <th className="text-right">A pagar</th>
              <th className="text-right">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {dias
              .filter((x) => x.entradas || x.saidas || x.prevE || x.prevS)
              .map((x) => (
                <tr key={x.d.toISOString()}>
                  <td>{fmt(x.d, "dd/MM EEE")}</td>
                  <td className="text-right text-emerald-700">{x.entradas ? brl(x.entradas) : ""}</td>
                  <td className="text-right text-red-600">{x.saidas ? brl(x.saidas) : ""}</td>
                  <td className="text-right text-emerald-700/70 italic">{x.prevE ? brl(x.prevE) : ""}</td>
                  <td className="text-right text-red-600/70 italic">{x.prevS ? brl(x.prevS) : ""}</td>
                  <td className={`text-right font-medium ${x.saldo < 0 ? "text-red-600" : ""}`}>{brl(x.saldo)}</td>
                </tr>
              ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
