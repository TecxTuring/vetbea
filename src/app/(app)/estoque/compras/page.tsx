import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl, data, rotulo } from "@/lib/format";
import { Badge, Card, corStatus, Empty, Field, PageHeader, Table } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { EstoqueNav } from "../nav";
import { criarPedido, importarXml } from "../actions";

export const metadata = { title: "Compras" };

export default async function Compras() {
  const s = await requireSession();
  const [pedidos, fornecedores] = await Promise.all([
    db.pedidoCompra.findMany({
      where: { clinicaId: s.clinicaId },
      include: { fornecedor: true, itens: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.fornecedor.findMany({ where: { clinicaId: s.clinicaId }, orderBy: { nome: "asc" } }),
  ]);
  return (
    <>
      <PageHeader title="Estoque" />
      <EstoqueNav active="compras" />
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card title="Novo pedido de compra">
          <form action={criarPedido} className="flex flex-wrap items-end gap-3">
            <Field label="Fornecedor" className="min-w-48 flex-1">
              <select name="fornecedorId" className="input">
                <option value="">—</option>
                {fornecedores.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </Field>
            <SubmitButton>Criar pedido</SubmitButton>
          </form>
        </Card>
        <Card title="Registrar compra pelo XML da NF-e">
          <form action={importarXml} className="flex flex-wrap items-end gap-3">
            <Field label="Arquivo XML" className="min-w-48 flex-1">
              <input type="file" name="xml" accept=".xml,text/xml" required className="input" />
            </Field>
            <SubmitButton>Importar</SubmitButton>
          </form>
          <p className="mt-2 text-xs text-slate-500">
            Fornecedor e produtos são identificados pelo CNPJ e código de barras; os que não existirem são cadastrados.
          </p>
        </Card>
      </div>
      <Card padded={false}>
        {pedidos.length === 0 ? (
          <Empty>Nenhum pedido de compra.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Fornecedor</th>
                <th>NF</th>
                <th className="text-right">Itens</th>
                <th className="text-right">Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/estoque/compras/${p.id}`} className="link">
                      {data(p.createdAt)}
                    </Link>
                  </td>
                  <td>{p.fornecedor?.nome ?? "—"}</td>
                  <td>{p.numeroNF ?? "—"}</td>
                  <td className="text-right">{p.itens.length}</td>
                  <td className="text-right">{brl(p.itens.reduce((a, i) => a + Number(i.quantidade) * Number(i.custoUnit), 0))}</td>
                  <td>
                    <Badge color={corStatus(p.status)}>{rotulo(p.status)}</Badge>
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
