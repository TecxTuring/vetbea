import type { Prisma } from "@prisma/client";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl } from "@/lib/format";
import { code128Svg } from "@/lib/barcode";
import { Card, Empty, PageHeader, Table } from "@/components/ui";
import { PrintButton } from "@/components/client";
import { EstoqueNav } from "../nav";

export const metadata = { title: "Etiquetas" };

export default async function Etiquetas({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const s = await requireSession();
  const sp = await searchParams;
  const selecionados = Object.entries(sp)
    .filter(([k, v]) => k.startsWith("n_") && Number(v) > 0)
    .map(([k, v]) => ({ id: k.slice(2), n: Math.min(Number(v), 200) }));

  if (sp.imprimir && selecionados.length > 0) {
    const produtos = await db.produto.findMany({ where: { clinicaId: s.clinicaId, id: { in: selecionados.map((x) => x.id) } } });
    const etiquetas = selecionados.flatMap(({ id, n }) => {
      const p = produtos.find((x) => x.id === id);
      return p ? Array.from({ length: n }, () => p) : [];
    });
    return (
      <>
        <PageHeader title="Etiquetas" back="/estoque/etiquetas" actions={<PrintButton />} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-4 print:gap-1">
          {etiquetas.map((p, i) => {
            const codigo = p.codigoBarras || p.id.slice(-10).toUpperCase();
            return (
              <div key={i} className="flex h-32 flex-col justify-between rounded border border-slate-300 bg-white p-2 break-inside-avoid">
                <p className="line-clamp-2 text-xs font-medium leading-tight">{p.nome}</p>
                <p className="text-lg font-bold">{brl(p.precoVenda)}</p>
                <div dangerouslySetInnerHTML={{ __html: code128Svg(codigo, 28).svg }} />
                <p className="text-center font-mono text-[9px]">{codigo}</p>
              </div>
            );
          })}
        </div>
      </>
    );
  }

  const where: Prisma.ProdutoWhereInput = { clinicaId: s.clinicaId, ativo: true, tipo: { not: "SERVICO" } };
  if (sp.q) where.nome = { contains: sp.q, mode: "insensitive" };
  const produtos = await db.produto.findMany({ where, orderBy: { nome: "asc" }, take: 100 });

  return (
    <>
      <PageHeader title="Estoque" />
      <EstoqueNav active="etiquetas" />
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Buscar produto…" className="input max-w-sm" />
        <button className="btn-secondary">Buscar</button>
      </form>
      <form>
        <input type="hidden" name="imprimir" value="1" />
        <Card title="Informe quantas etiquetas de cada produto" padded={false} actions={<button className="btn-primary btn-sm">Gerar etiquetas</button>}>
          {produtos.length === 0 ? (
            <Empty>Nenhum produto.</Empty>
          ) : (
            <Table>
              <tbody>
                {produtos.map((p) => (
                  <tr key={p.id}>
                    <td>{p.nome}</td>
                    <td className="text-slate-500">{p.codigoBarras ?? "sem código"}</td>
                    <td>{brl(p.precoVenda)}</td>
                    <td className="w-24">
                      <input name={`n_${p.id}`} type="number" min={0} placeholder="0" className="input py-1" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </form>
    </>
  );
}
