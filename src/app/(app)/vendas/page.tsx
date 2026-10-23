import Link from "next/link";
import { startOfDay, endOfDay } from "date-fns";
import type { Prisma, StatusVenda } from "@prisma/client";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl, dataHora, inputDate, rotulo } from "@/lib/format";
import { Badge, Card, corStatus, Empty, PageHeader, Stat, Table } from "@/components/ui";

export const metadata = { title: "Vendas" };

export default async function Vendas({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string; status?: string }>;
}) {
  const s = await requireSession();
  const sp = await searchParams;
  const de = sp.de ? new Date(sp.de + "T00:00:00") : startOfDay(new Date());
  const ate = sp.ate ? new Date(sp.ate + "T23:59:59") : endOfDay(new Date());
  const where: Prisma.VendaWhereInput = {
    clinicaId: s.clinicaId,
    createdAt: { gte: de, lte: ate },
    ...(sp.status ? { status: sp.status as StatusVenda } : {}),
  };
  const [vendas, abertas] = await Promise.all([
    db.venda.findMany({
      where,
      include: { tutor: true, animal: true, usuario: true, pagamentos: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    db.venda.count({ where: { clinicaId: s.clinicaId, status: "ABERTA" } }),
  ]);
  const finalizadas = vendas.filter((v) => v.status === "FINALIZADA");
  const total = finalizadas.reduce((a, v) => a + Number(v.total), 0);

  return (
    <>
      <PageHeader
        title="Vendas"
        actions={
          <Link href="/vendas/nova" className="btn-primary">
            Nova venda
          </Link>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Faturamento no período" value={brl(total)} tone="good" />
        <Stat label="Vendas finalizadas" value={finalizadas.length} />
        <Stat label="Ticket médio" value={brl(finalizadas.length ? total / finalizadas.length : 0)} />
        <Stat label="Vendas em aberto" value={abertas} href="/vendas?status=ABERTA&de=2000-01-01" tone={abertas ? "warn" : "default"} />
      </div>
      <form className="mb-4 flex flex-wrap gap-2">
        <input type="date" name="de" defaultValue={inputDate(de)} className="input w-40" />
        <input type="date" name="ate" defaultValue={inputDate(ate)} className="input w-40" />
        <select name="status" defaultValue={sp.status ?? ""} className="input w-40">
          <option value="">Todas</option>
          <option value="ABERTA">Abertas</option>
          <option value="FINALIZADA">Finalizadas</option>
          <option value="CANCELADA">Canceladas</option>
        </select>
        <button className="btn-secondary">Filtrar</button>
      </form>
      <Card padded={false}>
        {vendas.length === 0 ? (
          <Empty>Nenhuma venda no período.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Pagamento</th>
                <th className="text-right">Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {vendas.map((v) => (
                <tr key={v.id}>
                  <td>
                    <Link href={`/vendas/${v.id}`} className="link">
                      {dataHora(v.createdAt)}
                    </Link>
                  </td>
                  <td>
                    {v.tutor?.nome ?? "Consumidor"} {v.animal && <span className="text-slate-500">· {v.animal.nome}</span>}
                  </td>
                  <td>{v.usuario?.nome ?? "—"}</td>
                  <td className="text-xs text-slate-600">{[...new Set(v.pagamentos.map((p) => rotulo(p.forma)))].join(", ") || "—"}</td>
                  <td className="text-right">{brl(v.total)}</td>
                  <td>
                    <Badge color={corStatus(v.status)}>{rotulo(v.status)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
