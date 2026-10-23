import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl, dataHora, qtd, rotulo } from "@/lib/format";
import { Card, Empty, PageHeader, Stat, Table } from "@/components/ui";
import { ProdutoForm } from "../../produto-form";
import { atualizarProduto } from "../../actions";

export default async function Produto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  const produto = await db.produto.findFirst({ where: { id, clinicaId: s.clinicaId } });
  if (!produto) notFound();
  const movimentos = await db.movimentoEstoque.findMany({ where: { produtoId: id }, orderBy: { data: "desc" }, take: 50 });
  const margem = Number(produto.precoVenda) > 0 ? (1 - Number(produto.precoCusto) / Number(produto.precoVenda)) * 100 : 0;
  return (
    <>
      <PageHeader title={produto.nome} subtitle={rotulo(produto.tipo)} back="/estoque" />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Estoque atual" value={produto.controlaEstoque ? `${qtd(produto.estoqueAtual)} ${produto.unidade}` : "—"} />
        <Stat label="Preço de venda" value={brl(produto.precoVenda)} />
        <Stat label="Margem" value={`${margem.toFixed(1)}%`} tone={margem > 30 ? "good" : "warn"} />
        <Stat
          label="Preço da fração"
          value={produto.fracionavel && produto.fatorFracao ? brl(Number(produto.precoVenda) / Number(produto.fatorFracao)) : "—"}
          hint={produto.fracionavel ? `por ${produto.unidadeFracao}` : undefined}
        />
      </div>
      <ProdutoForm action={atualizarProduto.bind(null, id)} produto={produto} />
      <Card title="Movimentações" padded={false} className="mt-6">
        {movimentos.length === 0 ? (
          <Empty>Nenhuma movimentação.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Observação</th>
                <th className="text-right">Quantidade</th>
              </tr>
            </thead>
            <tbody>
              {movimentos.map((m) => (
                <tr key={m.id}>
                  <td>{dataHora(m.data)}</td>
                  <td>{rotulo(m.tipo)}</td>
                  <td className="text-slate-600">{m.observacao ?? "—"}</td>
                  <td className={`text-right font-medium ${Number(m.quantidade) < 0 ? "text-red-600" : "text-emerald-700"}`}>
                    {Number(m.quantidade) > 0 && "+"}
                    {qtd(m.quantidade)}
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
