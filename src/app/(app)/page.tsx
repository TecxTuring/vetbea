import Link from "next/link";
import { addDays, endOfDay, startOfDay, startOfMonth } from "date-fns";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl, data, hora, rotulo } from "@/lib/format";
import { Badge, Card, corStatus, Empty, PageHeader, Stat } from "@/components/ui";

export default async function Inicio({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const s = await requireSession();
  const { erro } = await searchParams;
  const c = s.clinicaId;
  const hoje = new Date();
  const ini = startOfDay(hoje);
  const fim = endOfDay(hoje);

  const [agendaHoje, internados, vendasMes, contasHoje, vacinasSemana, estoqueBaixo, aniversariantes, exames] =
    await Promise.all([
      db.agendamento.findMany({
        where: { clinicaId: c, inicio: { gte: ini, lte: fim }, status: { not: "CANCELADO" } },
        include: { animal: true, tutor: true, veterinario: true },
        orderBy: { inicio: "asc" },
      }),
      db.internacao.count({ where: { clinicaId: c, status: "INTERNADO" } }),
      db.venda.aggregate({
        where: { clinicaId: c, status: "FINALIZADA", finalizadaEm: { gte: startOfMonth(hoje) } },
        _sum: { total: true },
        _count: true,
      }),
      db.contaFinanceira.findMany({
        where: { clinicaId: c, status: "ABERTA", vencimento: { lte: fim } },
        select: { tipo: true, valor: true },
      }),
      db.vacinaAplicada.findMany({
        where: { clinicaId: c, aplicadaEm: null, proximaDose: { gte: ini, lte: addDays(fim, 7) } },
        include: { animal: { include: { tutor: true } } },
        orderBy: { proximaDose: "asc" },
        take: 8,
      }),
      db.$queryRaw<{ id: string; nome: string; estoqueAtual: number; estoqueMinimo: number }[]>`
        SELECT id, nome, "estoqueAtual"::float, "estoqueMinimo"::float FROM "Produto"
        WHERE "clinicaId" = ${c} AND ativo AND "controlaEstoque" AND "estoqueAtual" <= "estoqueMinimo"
        ORDER BY nome LIMIT 8`,
      db.$queryRaw<{ id: string; nome: string; especie: string }[]>`
        SELECT id, nome, especie FROM "Animal"
        WHERE "clinicaId" = ${c} AND NOT obito AND "dataNascimento" IS NOT NULL
          AND EXTRACT(MONTH FROM "dataNascimento") = ${hoje.getMonth() + 1}
          AND EXTRACT(DAY FROM "dataNascimento") = ${hoje.getDate()}`,
      db.exame.count({ where: { clinicaId: c, status: { in: ["SOLICITADO", "COLETADO"] } } }),
    ]);

  const pagarHoje = contasHoje.filter((x) => x.tipo === "PAGAR").reduce((a, x) => a + Number(x.valor), 0);
  const receberHoje = contasHoje.filter((x) => x.tipo === "RECEBER").reduce((a, x) => a + Number(x.valor), 0);

  return (
    <>
      <PageHeader
        title={`Olá, ${s.nome.split(" ")[0]}!`}
        subtitle={data(hoje) + " · resumo do dia"}
        actions={
          <>
            <Link href="/agenda?novo=1" className="btn-secondary">
              Novo agendamento
            </Link>
            <Link href="/vendas/nova" className="btn-primary">
              Nova venda
            </Link>
          </>
        }
      />

      {erro === "permissao" && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          Você não tem permissão para acessar essa área.
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Agendamentos hoje" value={agendaHoje.length} href="/agenda" />
        <Stat label="Pets internados" value={internados} href="/internacao" />
        <Stat
          label="Vendas no mês"
          value={brl(vendasMes._sum.total)}
          hint={`${vendasMes._count} vendas`}
          href="/vendas"
          tone="good"
        />
        <Stat
          label="Contas vencendo hoje"
          value={brl(pagarHoje)}
          hint={`A receber: ${brl(receberHoje)}`}
          href="/financeiro"
          tone={pagarHoje > 0 ? "warn" : "default"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card
          title="Agenda de hoje"
          className="lg:col-span-2"
          padded={false}
          actions={
            <Link href="/agenda" className="link text-xs">
              Ver agenda
            </Link>
          }
        >
          {agendaHoje.length === 0 ? (
            <Empty>Nenhum agendamento para hoje.</Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {agendaHoje.map((a) => (
                <li key={a.id} className="flex items-center gap-4 px-5 py-3">
                  <span className="w-12 text-sm font-semibold text-slate-700">{hora(a.inicio)}</span>
                  <span
                    className="h-8 w-1 rounded-full"
                    style={{ background: a.veterinario?.cor ?? "#94a3b8" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {a.animal ? (
                        <Link href={`/animais/${a.animal.id}`} className="hover:underline">
                          {a.animal.nome}
                        </Link>
                      ) : (
                        "—"
                      )}{" "}
                      <span className="font-normal text-slate-500">· {a.tutor?.nome}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {rotulo(a.tipo)} {a.veterinario && `· ${a.veterinario.nome}`}
                    </p>
                  </div>
                  <Badge color={corStatus(a.status)}>{rotulo(a.status)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card title="Vacinas próximas (7 dias)" padded={false}>
            {vacinasSemana.length === 0 ? (
              <Empty>Nenhuma vacina prevista.</Empty>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {vacinasSemana.map((v) => (
                  <li key={v.id} className="flex justify-between px-5 py-2.5">
                    <Link href={`/animais/${v.animalId}?aba=vacinas`} className="hover:underline">
                      <span className="font-medium">{v.animal.nome}</span>{" "}
                      <span className="text-slate-500">· {v.nome}</span>
                    </Link>
                    <span className="text-slate-500">{data(v.proximaDose)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Estoque baixo" padded={false}>
            {estoqueBaixo.length === 0 ? (
              <Empty>Estoque em dia.</Empty>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {estoqueBaixo.map((p) => (
                  <li key={p.id} className="flex justify-between px-5 py-2.5">
                    <Link href={`/estoque/produtos/${p.id}`} className="hover:underline">
                      {p.nome}
                    </Link>
                    <span className="font-medium text-red-600">{p.estoqueAtual}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Lembretes">
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/exames" className="hover:underline">
                  🧪 {exames} exame(s) aguardando resultado
                </Link>
              </li>
              <li>
                🎂 {aniversariantes.length} pet(s) fazendo aniversário hoje
                {aniversariantes.length > 0 && (
                  <span className="text-slate-500">: {aniversariantes.map((a) => a.nome).join(", ")}</span>
                )}
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
