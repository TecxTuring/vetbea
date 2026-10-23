import Link from "next/link";
import { subDays } from "date-fns";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl, data } from "@/lib/format";
import { Card, Empty, PageHeader, Table } from "@/components/ui";
import { FidelizacaoNav } from "../nav";

export const metadata = { title: "Ranking de clientes" };

export default async function Ranking({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const s = await requireSession();
  const { dias = "365" } = await searchParams;
  const desde = subDays(new Date(), Number(dias) || 365);
  const grupos = await db.venda.groupBy({
    by: ["tutorId"],
    where: { clinicaId: s.clinicaId, status: "FINALIZADA", tutorId: { not: null }, finalizadaEm: { gte: desde } },
    _sum: { total: true },
    _count: true,
    _max: { finalizadaEm: true },
    orderBy: { _sum: { total: "desc" } },
    take: 50,
  });
  const tutores = await db.tutor.findMany({ where: { id: { in: grupos.map((g) => g.tutorId!) } } });
  const medalha = ["🥇", "🥈", "🥉"];
  return (
    <>
      <PageHeader title="Fidelização" />
      <FidelizacaoNav active="ranking" />
      <form className="mb-4 flex gap-2">
        <select name="dias" defaultValue={dias} className="input w-48">
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
          <option value="180">Últimos 6 meses</option>
          <option value="365">Últimos 12 meses</option>
        </select>
        <button className="btn-secondary">Atualizar</button>
      </form>
      <Card title="Melhores consumidores" padded={false}>
        {grupos.length === 0 ? (
          <Empty>Sem vendas no período.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th className="text-right">Compras</th>
                <th className="text-right">Ticket médio</th>
                <th>Última compra</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {grupos.map((g, i) => {
                const t = tutores.find((x) => x.id === g.tutorId);
                const total = Number(g._sum.total ?? 0);
                return (
                  <tr key={g.tutorId}>
                    <td className="text-lg">{medalha[i] ?? <span className="text-sm text-slate-500">{i + 1}</span>}</td>
                    <td>
                      <Link href={`/clientes/${g.tutorId}`} className="link">
                        {t?.nome}
                      </Link>
                    </td>
                    <td className="text-right">{g._count}</td>
                    <td className="text-right">{brl(total / g._count)}</td>
                    <td>{data(g._max.finalizadaEm)}</td>
                    <td className="text-right font-semibold">{brl(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
