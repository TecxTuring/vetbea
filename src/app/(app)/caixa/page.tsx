import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { resumoCaixa } from "@/lib/caixa";
import { brl, dataHora, hora, rotulo } from "@/lib/format";
import { Card, Empty, Field, PageHeader, Stat, Table } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { abrirCaixa, fecharCaixa, movimentarCaixa } from "./actions";

export const metadata = { title: "Caixa" };

export default async function Caixa() {
  const s = await requireSession();
  const [aberto, historico] = await Promise.all([
    db.caixa.findFirst({ where: { clinicaId: s.clinicaId, fechadoEm: null } }),
    db.caixa.findMany({
      where: { clinicaId: s.clinicaId, fechadoEm: { not: null } },
      include: { usuario: true },
      orderBy: { abertoEm: "desc" },
      take: 15,
    }),
  ]);

  const historicoComResumo = await Promise.all(historico.map((c) => resumoCaixa(c.id)));

  return (
    <>
      <PageHeader title="Caixa" subtitle="Abertura, movimentações e fechamento" />

      {!aberto ? (
        <Card title="Abrir caixa" className="mb-6 max-w-md">
          <form action={abrirCaixa} className="flex items-end gap-3">
            <Field label="Saldo inicial (troco)" className="flex-1">
              <input name="saldoInicial" defaultValue="0" className="input" />
            </Field>
            <SubmitButton>Abrir caixa</SubmitButton>
          </form>
        </Card>
      ) : (
        <CaixaAberto caixaId={aberto.id} />
      )}

      <Card title="Caixas anteriores" padded={false}>
        {historicoComResumo.length === 0 ? (
          <Empty>Nenhum caixa fechado.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Abertura</th>
                <th>Fechamento</th>
                <th>Operador</th>
                <th className="text-right">Vendas</th>
                <th className="text-right">Dinheiro esperado</th>
                <th className="text-right">Contado</th>
                <th className="text-right">Diferença</th>
              </tr>
            </thead>
            <tbody>
              {historicoComResumo.map(({ caixa, totalVendas, esperadoDinheiro }) => {
                const dif = Number(caixa.saldoFinal ?? 0) - esperadoDinheiro;
                return (
                  <tr key={caixa.id}>
                    <td>{dataHora(caixa.abertoEm)}</td>
                    <td>{dataHora(caixa.fechadoEm)}</td>
                    <td>{caixa.usuario.nome}</td>
                    <td className="text-right">{brl(totalVendas)}</td>
                    <td className="text-right">{brl(esperadoDinheiro)}</td>
                    <td className="text-right">{brl(caixa.saldoFinal)}</td>
                    <td className={`text-right font-medium ${Math.abs(dif) < 0.01 ? "text-emerald-700" : "text-red-600"}`}>
                      {brl(dif)}
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

async function CaixaAberto({ caixaId }: { caixaId: string }) {
  const r = await resumoCaixa(caixaId);
  return (
    <div className="mb-6 space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Aberto em" value={hora(r.caixa.abertoEm)} hint={`por ${r.caixa.usuario.nome}`} />
        <Stat label="Vendas" value={brl(r.totalVendas)} hint={`${r.caixa.vendas.length} vendas`} tone="good" />
        <Stat label="Dinheiro na gaveta" value={brl(r.esperadoDinheiro)} hint={`Inicial ${brl(r.caixa.saldoInicial)}`} />
        <Stat label="Sangrias / suprimentos" value={`${brl(r.sangrias)} / ${brl(r.suprimentos)}`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Recebido por forma de pagamento" padded={false}>
          <Table>
            <tbody>
              {Object.entries(r.porForma).map(([forma, v]) => (
                <tr key={forma}>
                  <td>{rotulo(forma)}</td>
                  <td className="text-right font-medium">{brl(v)}</td>
                </tr>
              ))}
              {Object.keys(r.porForma).length === 0 && (
                <tr>
                  <td className="text-slate-500">Nada recebido ainda.</td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card>
        <Card title="Sangria / suprimento">
          <form action={movimentarCaixa.bind(null, caixaId)} className="space-y-2">
            <select name="tipo" className="input">
              <option value="SANGRIA">Sangria (retirada)</option>
              <option value="SUPRIMENTO">Suprimento (entrada)</option>
            </select>
            <input name="valor" placeholder="Valor" className="input" required />
            <input name="descricao" placeholder="Motivo" className="input" />
            <SubmitButton className="btn-secondary w-full">Registrar</SubmitButton>
          </form>
        </Card>
        <Card title="Fechar caixa">
          <form action={fecharCaixa.bind(null, caixaId)} className="space-y-2">
            <Field label="Dinheiro contado na gaveta">
              <input name="saldoFinal" required className="input" />
            </Field>
            <p className="text-xs text-slate-500">Esperado: {brl(r.esperadoDinheiro)}</p>
            <SubmitButton className="btn-danger w-full" confirm="Fechar o caixa?">
              Fechar caixa
            </SubmitButton>
          </form>
        </Card>
      </div>
      <Card title="Movimentos do caixa" padded={false}>
        <Table>
          <tbody>
            {r.caixa.vendas.map((v) => (
              <tr key={v.id}>
                <td>{hora(v.finalizadaEm ?? v.createdAt)}</td>
                <td>
                  <Link href={`/vendas/${v.id}`} className="link">
                    Venda
                  </Link>{" "}
                  · {v.tutor?.nome ?? "Consumidor"}
                </td>
                <td className="text-xs text-slate-500">{v.pagamentos.map((p) => rotulo(p.forma)).join(", ")}</td>
                <td className="text-right">{brl(v.total)}</td>
              </tr>
            ))}
            {r.caixa.movimentos.map((m) => (
              <tr key={m.id}>
                <td>{hora(m.createdAt)}</td>
                <td>
                  {rotulo(m.tipo)} · {m.descricao}
                </td>
                <td className="text-xs text-slate-500">{rotulo(m.forma)}</td>
                <td className={`text-right ${["SANGRIA", "PAGAMENTO"].includes(m.tipo) ? "text-red-600" : ""}`}>
                  {["SANGRIA", "PAGAMENTO"].includes(m.tipo) ? "- " : ""}
                  {brl(m.valor)}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
