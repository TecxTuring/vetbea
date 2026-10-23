import Link from "next/link";
import { startOfDay } from "date-fns";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl, data, telefone, whatsappLink } from "@/lib/format";
import { Card, Empty, PageHeader, Stat, Table } from "@/components/ui";
import { FinanceiroNav } from "../nav";

export const metadata = { title: "Débitos e créditos de clientes" };

export default async function ClientesFinanceiro() {
  const s = await requireSession();
  const [debitos, creditos] = await Promise.all([
    db.contaFinanceira.findMany({
      where: { clinicaId: s.clinicaId, tipo: "RECEBER", status: "ABERTA", tutorId: { not: null }, forma: null },
      include: { tutor: true },
      orderBy: { vencimento: "asc" },
    }),
    db.tutor.findMany({ where: { clinicaId: s.clinicaId, saldoCredito: { gt: 0 } }, orderBy: { saldoCredito: "desc" } }),
  ]);
  const porTutor = new Map<string, { tutor: (typeof debitos)[number]["tutor"]; total: number; maisAntigo: Date }>();
  for (const d of debitos) {
    const atual = porTutor.get(d.tutorId!) ?? { tutor: d.tutor, total: 0, maisAntigo: d.vencimento };
    atual.total += Number(d.valor);
    if (d.vencimento < atual.maisAntigo) atual.maisAntigo = d.vencimento;
    porTutor.set(d.tutorId!, atual);
  }
  const lista = [...porTutor.values()].sort((a, b) => b.total - a.total);
  const hoje = startOfDay(new Date());

  return (
    <>
      <PageHeader title="Financeiro" />
      <FinanceiroNav active="clientes" />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Clientes em débito" value={lista.length} />
        <Stat label="Total em débito" value={brl(lista.reduce((a, x) => a + x.total, 0))} tone="bad" />
        <Stat label="Clientes com crédito" value={creditos.length} />
        <Stat label="Créditos a consumir" value={brl(creditos.reduce((a, t) => a + Number(t.saldoCredito), 0))} tone="good" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Clientes em débito" padded={false}>
          {lista.length === 0 ? (
            <Empty>Nenhum cliente em débito. 🎉</Empty>
          ) : (
            <Table>
              <tbody>
                {lista.map(({ tutor, total, maisAntigo }) => {
                  const wa = whatsappLink(
                    tutor?.whatsapp ?? tutor?.telefone,
                    `Olá, ${tutor?.nome.split(" ")[0]}! Identificamos um saldo em aberto de ${brl(total)} em nossa clínica. Podemos ajudar com o pagamento?`,
                  );
                  return (
                    <tr key={tutor!.id}>
                      <td>
                        <Link href={`/clientes/${tutor!.id}`} className="link">
                          {tutor!.nome}
                        </Link>
                        <p className="text-xs text-slate-500">{telefone(tutor?.whatsapp ?? tutor?.telefone)}</p>
                      </td>
                      <td className={maisAntigo < hoje ? "text-red-600" : ""}>desde {data(maisAntigo)}</td>
                      <td className="text-right font-medium">{brl(total)}</td>
                      <td className="text-right">
                        {wa && (
                          <a href={wa} target="_blank" className="btn-secondary btn-sm">
                            Cobrar
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>
        <Card title="Clientes com crédito" padded={false}>
          {creditos.length === 0 ? (
            <Empty>Nenhum cliente com crédito.</Empty>
          ) : (
            <Table>
              <tbody>
                {creditos.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <Link href={`/clientes/${t.id}`} className="link">
                        {t.nome}
                      </Link>
                    </td>
                    <td className="text-right font-medium text-emerald-700">{brl(t.saldoCredito)}</td>
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
