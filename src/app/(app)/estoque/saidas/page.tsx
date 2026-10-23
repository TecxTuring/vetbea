import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl, dataHora, qtd, rotulo } from "@/lib/format";
import { Card, Empty, Field, PageHeader, Table } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { Picker } from "@/components/picker";
import { EstoqueNav } from "../nav";
import { registrarSaida } from "../actions";

export const metadata = { title: "Outras saídas" };

const TIPOS = ["CONSUMO_INTERNO", "AVARIA", "VENCIMENTO", "DOACAO", "DEVOLUCAO_FORNECEDOR"] as const;

export default async function Saidas() {
  const s = await requireSession();
  const [fornecedores, saidas] = await Promise.all([
    db.fornecedor.findMany({ where: { clinicaId: s.clinicaId }, orderBy: { nome: "asc" } }),
    db.movimentoEstoque.findMany({
      where: { clinicaId: s.clinicaId, tipo: { in: [...TIPOS] } },
      include: { produto: true },
      orderBy: { data: "desc" },
      take: 100,
    }),
  ]);
  const perdaTotal = saidas.reduce((a, m) => a + Math.abs(Number(m.quantidade)) * Number(m.custoUnit ?? 0), 0);

  return (
    <>
      <PageHeader title="Estoque" />
      <EstoqueNav active="saidas" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Registrar saída">
          <form action={registrarSaida} className="space-y-3">
            <Field label="Produto *">
              <Picker tipo="produtos" name="produtoId" required />
            </Field>
            <Field label="Motivo">
              <select name="tipo" className="input">
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {rotulo(t)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Quantidade *">
              <input name="quantidade" required className="input" />
            </Field>
            <Field label="Fornecedor (devolução)">
              <select name="fornecedorId" className="input">
                <option value="">—</option>
                {fornecedores.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="gerarCredito" /> Devolução gera valor a receber do fornecedor
            </label>
            <Field label="Observação">
              <input name="observacao" className="input" />
            </Field>
            <SubmitButton>Registrar saída</SubmitButton>
          </form>
        </Card>
        <Card
          title="Últimas saídas"
          padded={false}
          className="lg:col-span-2"
          actions={<span className="text-xs text-slate-500">Custo total: {brl(perdaTotal)}</span>}
        >
          {saidas.length === 0 ? (
            <Empty>Nenhuma saída registrada.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Produto</th>
                  <th>Motivo</th>
                  <th className="text-right">Qtd.</th>
                  <th className="text-right">Custo</th>
                </tr>
              </thead>
              <tbody>
                {saidas.map((m) => (
                  <tr key={m.id}>
                    <td>{dataHora(m.data)}</td>
                    <td>
                      {m.produto.nome}
                      {m.observacao && <p className="text-xs text-slate-500">{m.observacao}</p>}
                    </td>
                    <td>{rotulo(m.tipo)}</td>
                    <td className="text-right">{qtd(Math.abs(Number(m.quantidade)))}</td>
                    <td className="text-right">{brl(Math.abs(Number(m.quantidade)) * Number(m.custoUnit ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
