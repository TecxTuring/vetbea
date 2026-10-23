import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { idade } from "@/lib/format";
import { ESPECIES } from "@/lib/constantes";
import { Badge, Card, Empty, PageHeader, SearchBar, Table } from "@/components/ui";

export const metadata = { title: "Animais" };

export default async function Animais({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; especie?: string }>;
}) {
  const s = await requireSession();
  const { q = "", especie = "" } = await searchParams;
  const where: Prisma.AnimalWhereInput = { clinicaId: s.clinicaId };
  if (q) {
    where.OR = [
      { nome: { contains: q, mode: "insensitive" } },
      { microchip: { contains: q } },
      { tutor: { nome: { contains: q, mode: "insensitive" } } },
    ];
  }
  if (especie) where.especie = especie;
  const animais = await db.animal.findMany({
    where,
    include: { tutor: { select: { id: true, nome: true } } },
    orderBy: { nome: "asc" },
    take: 100,
  });

  return (
    <>
      <PageHeader
        title="Animais"
        actions={
          <Link href="/animais/novo" className="btn-primary">
            Novo animal
          </Link>
        }
      />
      <SearchBar placeholder="Buscar por nome, tutor ou microchip…" defaultValue={q}>
        <select name="especie" defaultValue={especie} className="input w-40">
          <option value="">Todas as espécies</option>
          {ESPECIES.map((e) => (
            <option key={e}>{e}</option>
          ))}
        </select>
      </SearchBar>
      <Card padded={false}>
        {animais.length === 0 ? (
          <Empty>Nenhum animal encontrado.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Espécie / raça</th>
                <th>Sexo</th>
                <th>Idade</th>
                <th>Tutor</th>
              </tr>
            </thead>
            <tbody>
              {animais.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link href={`/animais/${a.id}`} className="link">
                      {a.nome}
                    </Link>{" "}
                    {a.obito && <Badge>Óbito</Badge>}
                  </td>
                  <td>
                    {a.especie} {a.raca && <span className="text-slate-500">· {a.raca}</span>}
                  </td>
                  <td>{a.sexo === "M" ? "Macho" : a.sexo === "F" ? "Fêmea" : "—"}</td>
                  <td>{idade(a.dataNascimento)}</td>
                  <td>
                    <Link href={`/clientes/${a.tutor.id}`} className="hover:underline">
                      {a.tutor.nome}
                    </Link>
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
