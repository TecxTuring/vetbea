import { endOfMonth, startOfDay, startOfMonth } from "date-fns";
import type { Prisma, StatusConta, TipoConta } from "@prisma/client";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl, data, inputDate, rotulo } from "@/lib/format";
import { CATEGORIAS_DESPESA, CATEGORIAS_RECEITA, FORMAS_PAGAMENTO } from "@/lib/constantes";
import { Badge, Card, Collapsible, corStatus, Empty, Field, PageHeader, Stat, Table } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { FinanceiroNav } from "./nav";
import { baixarConta, cancelarConta, criarConta, estornarConta } from "./actions";

export const metadata = { title: "Financeiro" };

export default async function Financeiro({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; status?: string; de?: string; ate?: string }>;
}) {
  const s = await requireSession();
  const sp = await searchParams;
  const hoje = new Date();
  const de = sp.de ? new Date(sp.de + "T00:00:00") : startOfMonth(hoje);
  const ate = sp.ate ? new Date(sp.ate + "T23:59:59") : endOfMonth(hoje);
  const status = (sp.status ?? "ABERTA") as StatusConta | "TODAS" | "VENCIDAS";

  const where: Prisma.ContaFinanceiraWhereInput = { clinicaId: s.clinicaId };
  if (sp.tipo) where.tipo = sp.tipo as TipoConta;
  if (status === "VENCIDAS") {
    where.status = "ABERTA";
    where.vencimento = { lt: startOfDay(hoje) };
  } else {
    where.vencimento = { gte: de, lte: ate };
    if (status !== "TODAS") where.status = status;
  }

  const [contas, fornecedores, resumo, vencidas] = await Promise.all([
    db.contaFinanceira.findMany({
      where,
      include: { fornecedor: true, tutor: true },
      orderBy: { vencimento: "asc" },
      take: 300,
    }),
    db.fornecedor.findMany({ where: { clinicaId: s.clinicaId }, orderBy: { nome: "asc" } }),
    db.contaFinanceira.groupBy({
      by: ["tipo", "status"],
      where: { clinicaId: s.clinicaId, vencimento: { gte: de, lte: ate }, status: { not: "CANCELADA" } },
      _sum: { valor: true },
    }),
    db.contaFinanceira.groupBy({
      by: ["tipo"],
      where: { clinicaId: s.clinicaId, status: "ABERTA", vencimento: { lt: startOfDay(hoje) } },
      _sum: { valor: true },
    }),
  ]);
  const soma = (tipo: string, st?: string) =>
    resumo.filter((r) => r.tipo === tipo && (!st || r.status === st)).reduce((a, r) => a + Number(r._sum.valor ?? 0), 0);
  const vencidoPagar = Number(vencidas.find((v) => v.tipo === "PAGAR")?._sum.valor ?? 0);
  const vencidoReceber = Number(vencidas.find((v) => v.tipo === "RECEBER")?._sum.valor ?? 0);

  return (
    <>
      <PageHeader title="Financeiro" />
      <FinanceiroNav active="contas" />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="A receber no período" value={brl(soma("RECEBER", "ABERTA"))} hint={`Recebido: ${brl(soma("RECEBER", "PAGA"))}`} tone="good" />
        <Stat label="A pagar no período" value={brl(soma("PAGAR", "ABERTA"))} hint={`Pago: ${brl(soma("PAGAR", "PAGA"))}`} tone="warn" />
        <Stat label="Recebimentos vencidos" value={brl(vencidoReceber)} href="/financeiro?status=VENCIDAS&tipo=RECEBER" tone={vencidoReceber ? "bad" : "default"} />
        <Stat label="Pagamentos vencidos" value={brl(vencidoPagar)} href="/financeiro?status=VENCIDAS&tipo=PAGAR" tone={vencidoPagar ? "bad" : "default"} />
      </div>

      <Collapsible label="Nova conta" className="mb-6">
        <form action={criarConta} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Field label="Tipo">
            <select name="tipo" className="input">
              <option value="PAGAR">A pagar (despesa)</option>
              <option value="RECEBER">A receber (receita)</option>
            </select>
          </Field>
          <Field label="Descrição *" className="lg:col-span-2">
            <input name="descricao" required className="input" />
          </Field>
          <Field label="Categoria">
            <input name="categoria" list="categorias" className="input" />
            <datalist id="categorias">
              {[...CATEGORIAS_DESPESA, ...CATEGORIAS_RECEITA].map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Valor *">
            <input name="valor" required className="input" />
          </Field>
          <Field label="Vencimento *">
            <input name="vencimento" type="date" required defaultValue={inputDate(hoje)} className="input" />
          </Field>
          <Field label="Fornecedor">
            <select name="fornecedorId" className="input">
              <option value="">—</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Repetir (meses)">
            <input name="repetir" type="number" min={1} max={60} defaultValue={1} className="input" />
          </Field>
          <Field label="Forma (se já paga)">
            <select name="forma" className="input">
              <option value="">—</option>
              {FORMAS_PAGAMENTO.slice(0, 5).map((f) => (
                <option key={f} value={f}>
                  {rotulo(f)}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" name="jaPaga" /> Já está paga
          </label>
          <Field label="Observações" className="lg:col-span-2">
            <input name="observacoes" className="input" />
          </Field>
          <div className="flex items-end">
            <SubmitButton className="btn-primary w-full">Salvar</SubmitButton>
          </div>
        </form>
      </Collapsible>

      <form className="mb-4 flex flex-wrap gap-2">
        <select name="tipo" defaultValue={sp.tipo ?? ""} className="input w-40">
          <option value="">Pagar e receber</option>
          <option value="PAGAR">A pagar</option>
          <option value="RECEBER">A receber</option>
        </select>
        <select name="status" defaultValue={status} className="input w-36">
          <option value="ABERTA">Em aberto</option>
          <option value="VENCIDAS">Vencidas</option>
          <option value="PAGA">Pagas</option>
          <option value="CANCELADA">Canceladas</option>
          <option value="TODAS">Todas</option>
        </select>
        <input type="date" name="de" defaultValue={inputDate(de)} className="input w-40" />
        <input type="date" name="ate" defaultValue={inputDate(ate)} className="input w-40" />
        <button className="btn-secondary">Filtrar</button>
      </form>

      <Card padded={false}>
        {contas.length === 0 ? (
          <Empty>Nenhuma conta encontrada.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Vencimento</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th className="text-right">Valor</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {contas.map((c) => {
                const vencida = c.status === "ABERTA" && c.vencimento < startOfDay(hoje);
                return (
                  <tr key={c.id}>
                    <td className={vencida ? "font-medium text-red-600" : ""}>{data(c.vencimento)}</td>
                    <td>
                      <span className={c.tipo === "PAGAR" ? "text-red-600" : "text-emerald-700"}>{c.tipo === "PAGAR" ? "▼" : "▲"}</span>{" "}
                      {c.descricao}
                      {(c.fornecedor || c.tutor) && (
                        <p className="text-xs text-slate-500">{c.fornecedor?.nome ?? c.tutor?.nome}</p>
                      )}
                    </td>
                    <td className="text-slate-600">{c.categoria}</td>
                    <td className="text-right font-medium">{brl(c.valor)}</td>
                    <td>
                      <Badge color={vencida ? "red" : corStatus(c.status)}>{vencida ? "Vencida" : rotulo(c.status)}</Badge>
                      {c.pagoEm && <p className="text-xs text-slate-500">{data(c.pagoEm)}</p>}
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        {c.status === "ABERTA" && (
                          <>
                            <form action={baixarConta.bind(null, c.id)} className="flex gap-1">
                              <select name="forma" className="input w-28 py-1 text-xs">
                                {FORMAS_PAGAMENTO.slice(0, 5).map((f) => (
                                  <option key={f} value={f}>
                                    {rotulo(f)}
                                  </option>
                                ))}
                              </select>
                              <SubmitButton className="btn-primary btn-sm">{c.tipo === "PAGAR" ? "Pagar" : "Receber"}</SubmitButton>
                            </form>
                            <form action={cancelarConta.bind(null, c.id)}>
                              <SubmitButton className="btn-ghost btn-sm" confirm="Cancelar esta conta?">
                                ✕
                              </SubmitButton>
                            </form>
                          </>
                        )}
                        {c.status === "PAGA" && (
                          <form action={estornarConta.bind(null, c.id)}>
                            <SubmitButton className="btn-ghost btn-sm" confirm="Estornar a baixa?">
                              Estornar
                            </SubmitButton>
                          </form>
                        )}
                      </div>
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
