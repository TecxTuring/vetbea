import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { data } from "@/lib/format";
import { Badge, Card, Empty, Field, PageHeader, Table } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { EstoqueNav } from "../nav";
import { criarInventario } from "../actions";

export const metadata = { title: "Inventário" };

export default async function Inventarios() {
  const s = await requireSession();
  const [inventarios, categorias] = await Promise.all([
    db.inventario.findMany({
      where: { clinicaId: s.clinicaId },
      include: { _count: { select: { itens: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.produto.findMany({
      where: { clinicaId: s.clinicaId, categoria: { not: null }, controlaEstoque: true },
      distinct: ["categoria"],
      select: { categoria: true },
    }),
  ]);
  return (
    <>
      <PageHeader title="Estoque" />
      <EstoqueNav active="inventario" />
      <Card title="Novo inventário" className="mb-6">
        <form action={criarInventario} className="flex flex-wrap items-end gap-3">
          <Field label="Descrição" className="min-w-48 flex-1">
            <input name="descricao" placeholder="Inventário mensal" className="input" />
          </Field>
          <Field label="Categoria (opcional)">
            <select name="categoria" className="input w-56">
              <option value="">Todos os produtos</option>
              {categorias.map((c) => (
                <option key={c.categoria}>{c.categoria}</option>
              ))}
            </select>
          </Field>
          <SubmitButton>Iniciar contagem</SubmitButton>
        </form>
        <p className="mt-2 text-xs text-slate-500">A contagem pode ser feita pelo celular, direto na tela do inventário.</p>
      </Card>
      <Card padded={false}>
        {inventarios.length === 0 ? (
          <Empty>Nenhum inventário.</Empty>
        ) : (
          <Table>
            <tbody>
              {inventarios.map((i) => (
                <tr key={i.id}>
                  <td>
                    <Link href={`/estoque/inventario/${i.id}`} className="link">
                      {i.descricao}
                    </Link>
                  </td>
                  <td>{data(i.createdAt)}</td>
                  <td>{i._count.itens} produtos</td>
                  <td>{i.finalizado ? <Badge color="green">Finalizado</Badge> : <Badge color="yellow">Em contagem</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
