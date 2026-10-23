import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl, telefone } from "@/lib/format";
import { Card, Empty, PageHeader, SearchBar, Table } from "@/components/ui";

export const metadata = { title: "Clientes" };

export default async function Clientes({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const s = await requireSession();
  const { q = "" } = await searchParams;
  const where: Prisma.TutorWhereInput = { clinicaId: s.clinicaId };
  if (q) {
    where.OR = [
      { nome: { contains: q, mode: "insensitive" } },
      { cpf: { contains: q } },
      { telefone: { contains: q } },
      { email: { contains: q, mode: "insensitive" } },
      { animais: { some: { nome: { contains: q, mode: "insensitive" } } } },
    ];
  }
  const tutores = await db.tutor.findMany({
    where,
    include: { animais: { where: { obito: false }, select: { nome: true } } },
    orderBy: { nome: "asc" },
    take: 100,
  });

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle="Tutores cadastrados"
        actions={
          <Link href="/clientes/novo" className="btn-primary">
            Novo cliente
          </Link>
        }
      />
      <SearchBar placeholder="Buscar por nome, CPF, telefone ou pet…" defaultValue={q} />
      <Card padded={false}>
        {tutores.length === 0 ? (
          <Empty>Nenhum cliente encontrado.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone</th>
                <th>Animais</th>
                <th className="text-right">Crédito</th>
              </tr>
            </thead>
            <tbody>
              {tutores.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link href={`/clientes/${t.id}`} className="link">
                      {t.nome}
                    </Link>
                    {t.email && <p className="text-xs text-slate-500">{t.email}</p>}
                  </td>
                  <td>{telefone(t.whatsapp ?? t.telefone)}</td>
                  <td className="text-slate-600">{t.animais.map((a) => a.nome).join(", ") || "—"}</td>
                  <td className="text-right">{Number(t.saldoCredito) > 0 ? brl(t.saldoCredito) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
