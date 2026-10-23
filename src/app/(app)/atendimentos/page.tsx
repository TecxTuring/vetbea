import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { dataHora } from "@/lib/format";
import { Badge, Card, Empty, PageHeader, Table } from "@/components/ui";

export const metadata = { title: "Atendimentos" };

export default async function Atendimentos({ searchParams }: { searchParams: Promise<{ abertos?: string }> }) {
  const s = await requireSession();
  const { abertos } = await searchParams;
  const lista = await db.atendimento.findMany({
    where: { clinicaId: s.clinicaId, ...(abertos ? { finalizado: false } : {}) },
    include: { animal: { include: { tutor: true } }, veterinario: true },
    orderBy: { data: "desc" },
    take: 100,
  });
  return (
    <>
      <PageHeader
        title="Atendimentos"
        subtitle="Consultas e procedimentos registrados"
        actions={
          <>
            <Link href={abertos ? "/atendimentos" : "/atendimentos?abertos=1"} className="btn-secondary">
              {abertos ? "Ver todos" : "Só em aberto"}
            </Link>
            <Link href="/atendimentos/novo" className="btn-primary">
              Novo atendimento
            </Link>
          </>
        }
      />
      <Card padded={false}>
        {lista.length === 0 ? (
          <Empty>Nenhum atendimento.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Animal</th>
                <th>Tutor</th>
                <th>Tipo</th>
                <th>Veterinário</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link href={`/atendimentos/${a.id}`} className="link">
                      {dataHora(a.data)}
                    </Link>
                  </td>
                  <td>{a.animal.nome}</td>
                  <td>{a.animal.tutor.nome}</td>
                  <td>{a.tipo}</td>
                  <td>{a.veterinario?.nome ?? "—"}</td>
                  <td>{a.finalizado ? <Badge color="green">Finalizado</Badge> : <Badge color="yellow">Em aberto</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
