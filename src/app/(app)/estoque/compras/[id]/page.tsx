import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl, data, inputDate, qtd, rotulo, whatsappLink } from "@/lib/format";
import { Badge, Card, corStatus, Empty, Field, PageHeader, Table } from "@/components/ui";
import { PrintButton, SubmitButton } from "@/components/client";
import { Picker } from "@/components/picker";
import {
  adicionarItemPedido,
  atualizarPedido,
  cancelarPedido,
  marcarEnviado,
  receberPedido,
  removerItemPedido,
} from "../../actions";

export default async function Pedido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  const pedido = await db.pedidoCompra.findFirst({
    where: { id, clinicaId: s.clinicaId },
    include: { fornecedor: true, itens: { include: { produto: true } } },
  });
  if (!pedido) notFound();
  const fornecedores = await db.fornecedor.findMany({ where: { clinicaId: s.clinicaId }, orderBy: { nome: "asc" } });
  const editavel = pedido.status === "RASCUNHO" || pedido.status === "ENVIADO";
  const total = pedido.itens.reduce((a, i) => a + Number(i.quantidade) * Number(i.custoUnit), 0);
  const wa = whatsappLink(
    pedido.fornecedor?.telefone,
    `Olá! Gostaria de fazer o seguinte pedido:\n\n${pedido.itens.map((i) => `• ${i.produto.nome} — ${qtd(i.quantidade)} ${i.produto.unidade}`).join("\n")}`,
  );

  return (
    <>
      <PageHeader
        back="/estoque/compras"
        title={
          <span className="flex items-center gap-3">
            Pedido de compra <Badge color={corStatus(pedido.status)}>{rotulo(pedido.status)}</Badge>
          </span>
        }
        subtitle={`Criado em ${data(pedido.createdAt)}${pedido.recebidoEm ? ` · recebido em ${data(pedido.recebidoEm)}` : ""}`}
        actions={
          <>
            <PrintButton />
            {wa && editavel && (
              <a href={wa} target="_blank" className="btn-secondary">
                Enviar ao fornecedor
              </a>
            )}
            {pedido.status === "RASCUNHO" && (
              <form action={marcarEnviado.bind(null, id)}>
                <SubmitButton className="btn-secondary">Marcar como enviado</SubmitButton>
              </form>
            )}
            {editavel && (
              <form action={cancelarPedido.bind(null, id)}>
                <SubmitButton className="btn-ghost text-red-600" confirm="Cancelar o pedido?">
                  Cancelar
                </SubmitButton>
              </form>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {editavel && (
            <form action={adicionarItemPedido.bind(null, id)} className="card no-print grid gap-3 p-5 sm:grid-cols-5">
              <Field label="Produto" className="sm:col-span-2">
                <Picker tipo="produtos" name="produtoId" required />
              </Field>
              <Field label="Quantidade">
                <input name="quantidade" defaultValue="1" className="input" />
              </Field>
              <Field label="Custo unit.">
                <input name="custoUnit" placeholder="atual" className="input" />
              </Field>
              <div className="flex items-end">
                <SubmitButton className="btn-primary w-full">Adicionar</SubmitButton>
              </div>
            </form>
          )}
          <Card title={`Itens · ${pedido.fornecedor?.nome ?? "sem fornecedor"}`} padded={false} className="print-area">
            {pedido.itens.length === 0 ? (
              <Empty>Nenhum item.</Empty>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th className="text-right">Estoque atual</th>
                    <th className="text-right">Qtd.</th>
                    <th className="text-right">Custo</th>
                    <th className="text-right">Total</th>
                    {editavel && <th className="no-print" />}
                  </tr>
                </thead>
                <tbody>
                  {pedido.itens.map((i) => (
                    <tr key={i.id}>
                      <td>{i.produto.nome}</td>
                      <td className="text-right text-slate-500">{qtd(i.produto.estoqueAtual)}</td>
                      <td className="text-right">{qtd(i.quantidade)}</td>
                      <td className="text-right">{brl(i.custoUnit)}</td>
                      <td className="text-right">{brl(Number(i.quantidade) * Number(i.custoUnit))}</td>
                      {editavel && (
                        <td className="no-print w-8">
                          <form action={removerItemPedido.bind(null, id, i.id)}>
                            <button className="text-slate-400 hover:text-red-600">✕</button>
                          </form>
                        </td>
                      )}
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={4} className="font-semibold">
                      Total
                    </td>
                    <td className="text-right font-semibold">{brl(total)}</td>
                    {editavel && <td className="no-print" />}
                  </tr>
                </tbody>
              </Table>
            )}
          </Card>
        </div>

        <div className="no-print space-y-6">
          <Card title="Dados do pedido">
            <form action={atualizarPedido.bind(null, id)} className="space-y-3">
              <Field label="Fornecedor">
                <select name="fornecedorId" defaultValue={pedido.fornecedorId ?? ""} disabled={!editavel} className="input">
                  <option value="">—</option>
                  {fornecedores.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Número da NF">
                <input name="numeroNF" defaultValue={pedido.numeroNF ?? ""} disabled={!editavel} className="input" />
              </Field>
              <Field label="Observações">
                <textarea name="observacoes" rows={2} defaultValue={pedido.observacoes ?? ""} disabled={!editavel} className="input" />
              </Field>
              {editavel && <SubmitButton className="btn-secondary">Salvar</SubmitButton>}
            </form>
          </Card>
          {editavel && pedido.itens.length > 0 && (
            <Card title="Receber mercadoria">
              <form action={receberPedido.bind(null, id)} className="space-y-3">
                <p className="text-sm text-slate-600">Dá entrada de {pedido.itens.length} item(ns) no estoque e atualiza o custo.</p>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="lancarConta" defaultChecked /> Lançar em contas a pagar
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="1º vencimento">
                    <input type="date" name="vencimento" defaultValue={inputDate(new Date(Date.now() + 30 * 86400000))} className="input" />
                  </Field>
                  <Field label="Parcelas">
                    <input name="parcelas" defaultValue="1" className="input" />
                  </Field>
                </div>
                <SubmitButton className="btn-accent w-full">Receber pedido</SubmitButton>
              </form>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
