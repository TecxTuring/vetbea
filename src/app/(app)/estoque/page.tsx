import Link from "next/link";
import type { Prisma, TipoProduto } from "@prisma/client";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl, qtd, rotulo } from "@/lib/format";
import { Badge, Card, Empty, PageHeader, SearchBar, Stat, Table } from "@/components/ui";
import { EstoqueNav } from "./nav";

export const metadata = { title: "Estoque" };

export default async function Estoque({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string; baixo?: string }>;
}) {
  const s = await requireSession();
  const sp = await searchParams;
  const where: Prisma.ProdutoWhereInput = { clinicaId: s.clinicaId, ativo: true };
  if (sp.q) {
    where.OR = [
      { nome: { contains: sp.q, mode: "insensitive" } },
      { codigoBarras: sp.q },
      { categoria: { contains: sp.q, mode: "insensitive" } },
    ];
  }
  if (sp.tipo) where.tipo = sp.tipo as TipoProduto;
  let produtos = await db.produto.findMany({ where, orderBy: { nome: "asc" }, take: 300 });
  if (sp.baixo) produtos = produtos.filter((p) => p.controlaEstoque && Number(p.estoqueAtual) <= Number(p.estoqueMinimo));

  const comEstoque = await db.produto.findMany({
    where: { clinicaId: s.clinicaId, ativo: true, controlaEstoque: true },
    select: { estoqueAtual: true, estoqueMinimo: true, precoCusto: true, precoVenda: true, validade: true },
  });
  const valorCusto = comEstoque.reduce((a, p) => a + Math.max(Number(p.estoqueAtual), 0) * Number(p.precoCusto), 0);
  const valorVenda = comEstoque.reduce((a, p) => a + Math.max(Number(p.estoqueAtual), 0) * Number(p.precoVenda), 0);
  const baixos = comEstoque.filter((p) => Number(p.estoqueAtual) <= Number(p.estoqueMinimo)).length;
  const em30 = new Date(Date.now() + 30 * 86400000);
  const vencendo = comEstoque.filter((p) => p.validade && p.validade <= em30).length;

  return (
    <>
      <PageHeader
        title="Estoque"
        actions={
          <Link href="/estoque/produtos/novo" className="btn-primary">
            Novo produto / serviço
          </Link>
        }
      />
      <EstoqueNav active="produtos" />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Estoque a preço de custo" value={brl(valorCusto)} />
        <Stat label="Estoque a preço de venda" value={brl(valorVenda)} tone="good" />
        <Stat label="Abaixo do mínimo" value={baixos} href="/estoque?baixo=1" tone={baixos ? "bad" : "default"} />
        <Stat label="Vencendo em 30 dias" value={vencendo} tone={vencendo ? "warn" : "default"} />
      </div>
      <SearchBar placeholder="Nome, código de barras ou categoria…" defaultValue={sp.q}>
        <select name="tipo" defaultValue={sp.tipo ?? ""} className="input w-40">
          <option value="">Todos os tipos</option>
          {["PRODUTO", "MEDICAMENTO", "VACINA", "SERVICO"].map((t) => (
            <option key={t} value={t}>
              {rotulo(t)}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="baixo" value="1" defaultChecked={!!sp.baixo} /> Só estoque baixo
        </label>
      </SearchBar>
      <Card padded={false}>
        {produtos.length === 0 ? (
          <Empty>Nenhum produto encontrado.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Categoria</th>
                <th className="text-right">Custo</th>
                <th className="text-right">Venda</th>
                <th className="text-right">Estoque</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p) => {
                const baixo = p.controlaEstoque && Number(p.estoqueAtual) <= Number(p.estoqueMinimo);
                return (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/estoque/produtos/${p.id}`} className="link">
                        {p.nome}
                      </Link>
                      {p.fracionavel && <span className="ml-2 text-xs text-slate-500">fracionável</span>}
                    </td>
                    <td>
                      <Badge>{rotulo(p.tipo)}</Badge>
                    </td>
                    <td className="text-slate-600">{p.categoria ?? "—"}</td>
                    <td className="text-right">{brl(p.precoCusto)}</td>
                    <td className="text-right">{brl(p.precoVenda)}</td>
                    <td className={`text-right font-medium ${baixo ? "text-red-600" : ""}`}>
                      {p.controlaEstoque ? `${qtd(p.estoqueAtual)} ${p.unidade}` : "—"}
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
