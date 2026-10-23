import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl, data, rotulo } from "@/lib/format";
import { Badge, Card, corStatus, Empty, PageHeader, Table } from "@/components/ui";

export const metadata = { title: "Orçamentos" };

export default async function Orcamentos() {
  const s = await requireSession();
  const lista = await db.orcamento.findMany({
    where: { clinicaId: s.clinicaId },
    include: { tutor: true, animal: true, itens: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <>
      <PageHeader
        title="Orçamentos"
        actions={
          <Link href="/orcamentos/novo" className="btn-primary">
            Novo orçamento
          </Link>
        }
      />
      <Card padded={false}>
        {lista.length === 0 ? (
          <Empty>Nenhum orçamento.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Cliente</th>
                <th>Animal</th>
                <th>Validade</th>
                <th className="text-right">Valor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((o) => {
                const total = o.itens.reduce((a, i) => a + Number(i.quantidade) * Number(i.valorUnit), 0) - Number(o.desconto);
                return (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/orcamentos/${o.id}`} className="link">
                        {data(o.createdAt)}
                      </Link>
                    </td>
                    <td>{o.tutor.nome}</td>
                    <td>{o.animal?.nome ?? "—"}</td>
                    <td>{data(o.validade)}</td>
                    <td className="text-right">{brl(total)}</td>
                    <td>
                      <Badge color={corStatus(o.status)}>{rotulo(o.status)}</Badge>
                    </td>
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
