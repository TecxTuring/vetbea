import Link from "next/link";
import type { TipoMovimento } from "@prisma/client";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { dataHora, qtd, rotulo } from "@/lib/format";
import { Card, Empty, PageHeader, Table } from "@/components/ui";
import { EstoqueNav } from "../nav";

export const metadata = { title: "Movimentações de estoque" };

const TIPOS = ["ENTRADA_COMPRA", "SAIDA_VENDA", "CONSUMO_INTERNO", "AVARIA", "VENCIMENTO", "DOACAO", "DEVOLUCAO_FORNECEDOR", "AJUSTE_INVENTARIO", "ESTORNO_VENDA"];

export default async function Movimentos({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const s = await requireSession();
  const { tipo } = await searchParams;
  const movimentos = await db.movimentoEstoque.findMany({
    where: { clinicaId: s.clinicaId, ...(tipo ? { tipo: tipo as TipoMovimento } : {}) },
    include: { produto: true },
    orderBy: { data: "desc" },
    take: 200,
  });
  return (
    <>
      <PageHeader title="Estoque" />
      <EstoqueNav active="movimentos" />
      <form className="mb-4 flex gap-2">
        <select name="tipo" defaultValue={tipo ?? ""} className="input w-64">
          <option value="">Todos os tipos</option>
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {rotulo(t)}
            </option>
          ))}
        </select>
        <button className="btn-secondary">Filtrar</button>
      </form>
      <Card padded={false}>
        {movimentos.length === 0 ? (
          <Empty>Nenhuma movimentação.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th>Tipo</th>
                <th>Observação</th>
                <th className="text-right">Qtd.</th>
              </tr>
            </thead>
            <tbody>
              {movimentos.map((m) => (
                <tr key={m.id}>
                  <td>{dataHora(m.data)}</td>
                  <td>
                    <Link href={`/estoque/produtos/${m.produtoId}`} className="link">
                      {m.produto.nome}
                    </Link>
                  </td>
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
