import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl, dataHora, qtd, rotulo } from "@/lib/format";
import { FORMAS_PAGAMENTO } from "@/lib/constantes";
import { Badge, Card, corStatus, Empty, Field, PageHeader, Table } from "@/components/ui";
import { PrintButton, SubmitButton } from "@/components/client";
import { Picker } from "@/components/picker";
import {
  adicionarItem,
  adicionarPagamento,
  aplicarDesconto,
  cancelarVenda,
  definirCliente,
  finalizarVenda,
  removerItem,
  removerPagamento,
} from "../actions";

export default async function Venda({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  const venda = await db.venda.findFirst({
    where: { id, clinicaId: s.clinicaId },
    include: {
      itens: true,
      pagamentos: true,
      tutor: true,
      animal: true,
      usuario: true,
      atendimento: true,
      clinica: true,
    },
  });
  if (!venda) notFound();
  const aberta = venda.status === "ABERTA";
  const bruto = venda.itens.reduce((a, i) => a + Number(i.total), 0);
  const pago = venda.pagamentos.reduce((a, p) => a + Number(p.valor), 0);
  const restante = Math.round((Number(venda.total) - pago) * 100) / 100;

  return (
    <>
      <PageHeader
        back="/vendas"
        title={
          <span className="flex items-center gap-3">
            Venda <Badge color={corStatus(venda.status)}>{rotulo(venda.status)}</Badge>
          </span>
        }
        subtitle={`${dataHora(venda.createdAt)} · ${venda.usuario?.nome ?? ""}`}
        actions={
          <>
            {venda.atendimento && (
              <Link href={`/atendimentos/${venda.atendimento.id}`} className="btn-secondary">
                Ver atendimento
              </Link>
            )}
            {venda.status === "FINALIZADA" && <PrintButton label="Imprimir recibo" />}
            {venda.status !== "CANCELADA" && (
              <form action={cancelarVenda.bind(null, id)}>
                <SubmitButton className="btn-ghost text-red-600" confirm="Cancelar esta venda? Estoque e financeiro serão estornados.">
                  Cancelar venda
                </SubmitButton>
              </form>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {aberta && (
            <form action={adicionarItem.bind(null, id)} className="card no-print grid gap-3 p-5 sm:grid-cols-6">
              <Field label="Produto ou serviço (nome ou código de barras)" className="sm:col-span-3">
                <Picker tipo="produtos" name="produtoId" required />
              </Field>
              <Field label="Qtd.">
                <input name="quantidade" defaultValue="1" className="input" />
              </Field>
              <Field label="Preço (opcional)">
                <input name="valorUnit" className="input" />
              </Field>
              <div className="flex flex-col justify-end gap-1">
                <label className="flex items-center gap-1 text-xs text-slate-600">
                  <input type="checkbox" name="fracionado" /> fracionado
                </label>
                <SubmitButton className="btn-primary">Adicionar</SubmitButton>
              </div>
            </form>
          )}

          <Card title="Itens" padded={false} className="print-area">
            <div className="hidden px-5 pt-5 print:block">
              <p className="text-lg font-bold">{venda.clinica.nome}</p>
              <p className="text-sm">Recibo · {dataHora(venda.finalizadaEm ?? venda.createdAt)}</p>
              <p className="text-sm">Cliente: {venda.tutor?.nome ?? "Consumidor"}</p>
            </div>
            {venda.itens.length === 0 ? (
              <Empty>Nenhum item.</Empty>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th className="text-right">Qtd.</th>
                    <th className="text-right">Unitário</th>
                    <th className="text-right">Total</th>
                    {aberta && <th className="no-print" />}
                  </tr>
                </thead>
                <tbody>
                  {venda.itens.map((i) => (
                    <tr key={i.id}>
                      <td>{i.descricao}</td>
                      <td className="text-right">{qtd(i.quantidade)}</td>
                      <td className="text-right">{brl(i.valorUnit)}</td>
                      <td className="text-right">{brl(i.total)}</td>
                      {aberta && (
                        <td className="no-print w-8">
                          <form action={removerItem.bind(null, id, i.id)}>
                            <button className="text-slate-400 hover:text-red-600">✕</button>
                          </form>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
            <div className="ml-auto w-72 space-y-1 p-5 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{brl(bruto)}</span>
              </div>
              <div className="flex justify-between">
                <span>Desconto</span>
                <span>- {brl(venda.desconto)}</span>
              </div>
              <div className="flex justify-between border-t pt-1 text-lg font-semibold">
                <span>Total</span>
                <span>{brl(venda.total)}</span>
              </div>
              {venda.pagamentos.length > 0 && (
                <div className="space-y-0.5 border-t pt-2 text-xs text-slate-600">
                  {venda.pagamentos.map((p) => (
                    <div key={p.id} className="flex justify-between">
                      <span>
                        {rotulo(p.forma)} {p.parcelas > 1 && `${p.parcelas}x`}
                      </span>
                      <span>{brl(p.valor)}</span>
                    </div>
                  ))}
                  {pago > Number(venda.total) && (
                    <div className="flex justify-between font-medium">
                      <span>Troco</span>
                      <span>{brl(pago - Number(venda.total))}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="no-print space-y-6">
          <Card title="Cliente">
            {aberta ? (
              <form action={definirCliente.bind(null, id)} className="space-y-2">
                <Picker tipo="tutores" name="tutorId" initial={venda.tutor ? { id: venda.tutor.id, label: venda.tutor.nome } : null} />
                <SubmitButton className="btn-secondary btn-sm">Definir cliente</SubmitButton>
              </form>
            ) : (
              <p className="text-sm">{venda.tutor?.nome ?? "Consumidor"}</p>
            )}
            {venda.tutor && (
              <p className="mt-2 text-xs text-slate-500">
                Crédito disponível: <strong className="text-emerald-700">{brl(venda.tutor.saldoCredito)}</strong>
              </p>
            )}
          </Card>

          {aberta && (
            <>
              <Card title="Desconto">
                <form action={aplicarDesconto.bind(null, id)} className="flex gap-2">
                  <input name="desconto" placeholder="0,00" className="input" />
                  <select name="tipo" className="input w-20">
                    <option value="valor">R$</option>
                    <option value="pct">%</option>
                  </select>
                  <SubmitButton className="btn-secondary">Aplicar</SubmitButton>
                </form>
              </Card>

              <Card title="Pagamento">
                <form action={adicionarPagamento.bind(null, id)} className="space-y-2">
                  <select name="forma" className="input">
                    {FORMAS_PAGAMENTO.map((f) => (
                      <option key={f} value={f}>
                        {rotulo(f)}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <input name="valor" placeholder={restante.toFixed(2).replace(".", ",")} className="input" />
                    <input name="parcelas" placeholder="Parc." className="input w-20" />
                    <input name="taxaPct" placeholder="Taxa %" className="input w-24" />
                  </div>
                  <SubmitButton className="btn-secondary w-full">Adicionar pagamento</SubmitButton>
                </form>
                {venda.pagamentos.length > 0 && (
                  <ul className="mt-3 divide-y divide-slate-100 text-sm">
                    {venda.pagamentos.map((p) => (
                      <li key={p.id} className="flex items-center justify-between py-1.5">
                        <span>
                          {rotulo(p.forma)} {p.parcelas > 1 && `${p.parcelas}x`}
                        </span>
                        <span className="flex items-center gap-2">
                          {brl(p.valor)}
                          <form action={removerPagamento.bind(null, id, p.id)}>
                            <button className="text-slate-400 hover:text-red-600">✕</button>
                          </form>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 flex justify-between border-t pt-2 text-sm font-medium">
                  <span>{restante > 0 ? "Falta receber" : "Troco"}</span>
                  <span className={restante > 0 ? "text-red-600" : "text-emerald-700"}>{brl(Math.abs(restante))}</span>
                </div>
              </Card>

              <form action={finalizarVenda.bind(null, id)}>
                <SubmitButton className="btn-accent w-full py-3 text-base">Finalizar venda</SubmitButton>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
