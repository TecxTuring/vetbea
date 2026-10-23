import { db } from "./db";

/** Totais do caixa por forma de pagamento e saldo esperado em dinheiro. */
export async function resumoCaixa(caixaId: string) {
  const caixa = await db.caixa.findUniqueOrThrow({
    where: { id: caixaId },
    include: {
      movimentos: { orderBy: { createdAt: "asc" } },
      vendas: { where: { status: "FINALIZADA" }, include: { pagamentos: true, tutor: true } },
      usuario: true,
    },
  });
  const porForma: Record<string, number> = {};
  for (const v of caixa.vendas) {
    for (const p of v.pagamentos) porForma[p.forma] = (porForma[p.forma] ?? 0) + Number(p.valor);
  }
  for (const m of caixa.movimentos) {
    if (m.tipo === "RECEBIMENTO") porForma[m.forma] = (porForma[m.forma] ?? 0) + Number(m.valor);
  }
  const mov = (tipo: string, forma = "DINHEIRO") =>
    caixa.movimentos.filter((m) => m.tipo === tipo && m.forma === forma).reduce((a, m) => a + Number(m.valor), 0);
  const suprimentos = caixa.movimentos.filter((m) => m.tipo === "SUPRIMENTO").reduce((a, m) => a + Number(m.valor), 0);
  const sangrias = caixa.movimentos.filter((m) => m.tipo === "SANGRIA").reduce((a, m) => a + Number(m.valor), 0);
  const saidasDinheiro = mov("PAGAMENTO");
  const esperadoDinheiro =
    Number(caixa.saldoInicial) + (porForma.DINHEIRO ?? 0) + suprimentos - sangrias - saidasDinheiro;
  const totalVendas = caixa.vendas.reduce((a, v) => a + Number(v.total), 0);
  return { caixa, porForma, suprimentos, sangrias, saidasDinheiro, esperadoDinheiro, totalVendas };
}
