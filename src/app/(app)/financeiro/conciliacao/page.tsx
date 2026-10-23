import { startOfDay } from "date-fns";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl, data, inputDate } from "@/lib/format";
import { Card, Empty, Field, PageHeader, Stat, Table } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { FinanceiroNav } from "../nav";
import { conciliar } from "../actions";

export const metadata = { title: "Conciliação de cartões" };

export default async function Conciliacao() {
  const s = await requireSession();
  const recebiveis = await db.contaFinanceira.findMany({
    where: { clinicaId: s.clinicaId, status: "ABERTA", tipo: "RECEBER", forma: { in: ["DEBITO", "CREDITO"] } },
    include: { tutor: true },
    orderBy: { vencimento: "asc" },
  });
  const hoje = startOfDay(new Date());
  const atrasados = recebiveis.filter((r) => r.vencimento < hoje);
  const total = recebiveis.reduce((a, r) => a + Number(r.valor), 0);

  return (
    <>
      <PageHeader title="Financeiro" />
      <FinanceiroNav active="conciliacao" />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat label="Recebíveis de cartão" value={brl(total)} hint={`${recebiveis.length} transações`} />
        <Stat label="Previstos para até hoje" value={brl(atrasados.reduce((a, r) => a + Number(r.valor), 0))} hint="Confira no extrato da operadora" tone={atrasados.length ? "warn" : "default"} />
      </div>
      <form action={conciliar}>
        <Card
          title="Marque as transações que já caíram na conta"
          padded={false}
          actions={
            recebiveis.length > 0 && (
              <div className="flex items-end gap-2">
                <Field label="Data do crédito">
                  <input type="date" name="data" defaultValue={inputDate(new Date())} className="input py-1" />
                </Field>
                <SubmitButton className="btn-primary btn-sm">Conciliar selecionados</SubmitButton>
              </div>
            )
          }
        >
          {recebiveis.length === 0 ? (
            <Empty>Nenhum recebível de cartão pendente.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th />
                  <th>Previsão</th>
                  <th>Descrição</th>
                  <th className="text-right">Valor líquido</th>
                </tr>
              </thead>
              <tbody>
                {recebiveis.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <input type="checkbox" name="conta" value={r.id} defaultChecked={r.vencimento < hoje} />
                    </td>
                    <td className={r.vencimento < hoje ? "font-medium text-amber-700" : ""}>{data(r.vencimento)}</td>
                    <td>{r.descricao}</td>
                    <td className="text-right">{brl(r.valor)}</td>
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
