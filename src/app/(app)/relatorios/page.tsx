import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl, fmt, inputDate, rotulo } from "@/lib/format";
import { BarrasH, Colunas } from "@/components/barras";
import { Card, PageHeader, Stat, Table } from "@/components/ui";

export const metadata = { title: "Relatórios" };

export default async function Relatorios({ searchParams }: { searchParams: Promise<{ de?: string; ate?: string }> }) {
  const s = await requireRole("FINANCEIRO");
  const sp = await searchParams;
  const hoje = new Date();
  const de = sp.de ? new Date(sp.de + "T00:00:00") : startOfMonth(hoje);
  const ate = sp.ate ? new Date(sp.ate + "T23:59:59") : endOfMonth(hoje);
  const c = s.clinicaId;
  const doze = startOfMonth(subMonths(hoje, 11));

  const [vendas12, itens, pagamentos, atendimentos, novosClientes, especies, despesas] = await Promise.all([
    db.venda.findMany({
      where: { clinicaId: c, status: "FINALIZADA", finalizadaEm: { gte: doze } },
      select: { total: true, finalizadaEm: true },
    }),
    db.vendaItem.findMany({
      where: { venda: { clinicaId: c, status: "FINALIZADA", finalizadaEm: { gte: de, lte: ate } } },
      include: { produto: { select: { categoria: true, tipo: true, comissaoPct: true } }, venda: { select: { usuarioId: true } } },
    }),
    db.pagamento.groupBy({
      by: ["forma"],
      where: { venda: { clinicaId: c, status: "FINALIZADA", finalizadaEm: { gte: de, lte: ate } } },
      _sum: { valor: true },
    }),
    db.atendimento.groupBy({
      by: ["veterinarioId"],
      where: { clinicaId: c, data: { gte: de, lte: ate } },
      _count: true,
    }),
    db.tutor.count({ where: { clinicaId: c, createdAt: { gte: de, lte: ate } } }),
    db.animal.groupBy({ by: ["especie"], where: { clinicaId: c, obito: false }, _count: true }),
    db.contaFinanceira.aggregate({
      where: { clinicaId: c, tipo: "PAGAR", status: "PAGA", pagoEm: { gte: de, lte: ate } },
      _sum: { valorPago: true },
    }),
  ]);
  const usuarios = await db.usuario.findMany({ where: { clinicaId: c }, select: { id: true, nome: true } });
  const nome = new Map(usuarios.map((u) => [u.id, u.nome]));

  const meses = Array.from({ length: 12 }, (_, i) => subMonths(startOfMonth(hoje), 11 - i));
  const porMes = meses.map((m) => ({
    rotulo: fmt(m, "MMM"),
    valor: vendas12
      .filter((v) => format(v.finalizadaEm!, "yyyy-MM") === format(m, "yyyy-MM"))
      .reduce((a, v) => a + Number(v.total), 0),
  }));

  const agrupar = (chave: (i: (typeof itens)[number]) => string) => {
    const m = new Map<string, number>();
    for (const i of itens) m.set(chave(i), (m.get(chave(i)) ?? 0) + Number(i.total));
    return [...m.entries()].map(([rotulo, valor]) => ({ rotulo, valor })).sort((a, b) => b.valor - a.valor);
  };
  const porCategoria = agrupar((i) => i.produto?.categoria ?? (i.produto ? rotulo(i.produto.tipo) : "Avulso")).slice(0, 10);
  const topItens = agrupar((i) => i.descricao).slice(0, 10);
  const faturamento = itens.reduce((a, i) => a + Number(i.total), 0);

  // comissões: % do produto sobre o valor vendido, atribuída ao vendedor/veterinário da venda
  const comissoes = new Map<string, { base: number; comissao: number }>();
  for (const i of itens) {
    const pct = Number(i.produto?.comissaoPct ?? 0);
    const uid = i.venda.usuarioId;
    if (!uid || pct <= 0) continue;
    const atual = comissoes.get(uid) ?? { base: 0, comissao: 0 };
    atual.base += Number(i.total);
    atual.comissao += (Number(i.total) * pct) / 100;
    comissoes.set(uid, atual);
  }

  return (
    <>
      <PageHeader
        title="Relatórios"
        actions={
          <form className="flex gap-2">
            <input type="date" name="de" defaultValue={inputDate(de)} className="input w-40" />
            <input type="date" name="ate" defaultValue={inputDate(ate)} className="input w-40" />
            <button className="btn-secondary">Aplicar</button>
          </form>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Faturamento no período" value={brl(faturamento)} tone="good" />
        <Stat label="Despesas pagas" value={brl(despesas._sum.valorPago)} tone="bad" />
        <Stat label="Atendimentos" value={atendimentos.reduce((a, x) => a + x._count, 0)} />
        <Stat label="Novos clientes" value={novosClientes} />
      </div>

      <Card title="Faturamento mensal (últimos 12 meses)" className="mb-6">
        <Colunas dados={porMes} />
      </Card>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card title="Faturamento por categoria">
          <BarrasH dados={porCategoria} />
        </Card>
        <Card title="Produtos e serviços mais vendidos">
          <BarrasH dados={topItens} />
        </Card>
        <Card title="Recebimentos por forma de pagamento">
          <BarrasH
            dados={pagamentos
              .map((p) => ({ rotulo: rotulo(p.forma), valor: Number(p._sum.valor ?? 0) }))
              .sort((a, b) => b.valor - a.valor)}
          />
        </Card>
        <Card title="Pacientes ativos por espécie">
          <BarrasH moeda={false} dados={especies.map((e) => ({ rotulo: e.especie, valor: e._count })).sort((a, b) => b.valor - a.valor)} />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Atendimentos por veterinário" padded={false}>
          <Table>
            <tbody>
              {atendimentos
                .sort((a, b) => b._count - a._count)
                .map((a) => (
                  <tr key={a.veterinarioId ?? "—"}>
                    <td>{a.veterinarioId ? nome.get(a.veterinarioId) : "Sem veterinário"}</td>
                    <td className="text-right font-medium">{a._count}</td>
                  </tr>
                ))}
            </tbody>
          </Table>
        </Card>
        <Card title="Comissões no período" padded={false}>
          <Table>
            <thead>
              <tr>
                <th>Profissional</th>
                <th className="text-right">Base</th>
                <th className="text-right">Comissão</th>
              </tr>
            </thead>
            <tbody>
              {[...comissoes.entries()].map(([uid, v]) => (
                <tr key={uid}>
                  <td>{nome.get(uid)}</td>
                  <td className="text-right">{brl(v.base)}</td>
                  <td className="text-right font-medium">{brl(v.comissao)}</td>
                </tr>
              ))}
              {comissoes.size === 0 && (
                <tr>
                  <td colSpan={3} className="text-slate-500">
                    Nenhuma comissão. Defina o % de comissão no cadastro dos serviços.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card>
      </div>
    </>
  );
}
