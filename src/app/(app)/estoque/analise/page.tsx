import Link from "next/link";
import { subDays } from "date-fns";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl, qtd } from "@/lib/format";
import { Badge, Card, Empty, PageHeader, Table } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { EstoqueNav } from "../nav";
import { gerarPedidoSugerido } from "../actions";

export const metadata = { title: "Análise de estoque" };

const DIAS_ANALISE = 90;
const DIAS_COBERTURA = 30;

export default async function Analise() {
  const s = await requireSession();
  const desde = subDays(new Date(), DIAS_ANALISE);
  const [produtos, saidas, receita] = await Promise.all([
    db.produto.findMany({ where: { clinicaId: s.clinicaId, ativo: true, controlaEstoque: true } }),
    db.movimentoEstoque.groupBy({
      by: ["produtoId"],
      where: {
        clinicaId: s.clinicaId,
        data: { gte: desde },
        tipo: { in: ["SAIDA_VENDA", "CONSUMO_INTERNO"] },
      },
      _sum: { quantidade: true },
    }),
    db.vendaItem.groupBy({
      by: ["produtoId"],
      where: { venda: { clinicaId: s.clinicaId, status: "FINALIZADA", finalizadaEm: { gte: desde } }, produtoId: { not: null } },
      _sum: { total: true },
    }),
  ]);

  const consumo = new Map(saidas.map((x) => [x.produtoId, Math.abs(Number(x._sum.quantidade ?? 0))]));
  const faturamento = new Map(receita.map((x) => [x.produtoId!, Number(x._sum.total ?? 0)]));

  // Curva ABC por faturamento
  const totalFat = [...faturamento.values()].reduce((a, b) => a + b, 0);
  const ordenados = [...produtos].sort((a, b) => (faturamento.get(b.id) ?? 0) - (faturamento.get(a.id) ?? 0));
  const curva = new Map<string, string>();
  let acumulado = 0;
  for (const p of ordenados) {
    acumulado += faturamento.get(p.id) ?? 0;
    const pct = totalFat ? acumulado / totalFat : 1;
    curva.set(p.id, (faturamento.get(p.id) ?? 0) === 0 ? "-" : pct <= 0.8 ? "A" : pct <= 0.95 ? "B" : "C");
  }

  const linhas = produtos
    .map((p) => {
      const mediaDia = (consumo.get(p.id) ?? 0) / DIAS_ANALISE;
      const estoque = Number(p.estoqueAtual);
      const cobertura = mediaDia > 0 ? estoque / mediaDia : Infinity;
      const necessario = Math.max(mediaDia * DIAS_COBERTURA, Number(p.estoqueMinimo)) - estoque;
      const sugestao = Math.ceil(Math.max(necessario, 0));
      const parado = mediaDia === 0 && estoque > 0;
      return { p, mediaDia, cobertura, sugestao, parado };
    })
    .sort((a, b) => a.cobertura - b.cobertura);

  const comprar = linhas.filter((l) => l.sugestao > 0);
  const parados = linhas.filter((l) => l.parado);
  const valorParado = parados.reduce((a, l) => a + Number(l.p.estoqueAtual) * Number(l.p.precoCusto), 0);

  return (
    <>
      <PageHeader title="Estoque" />
      <EstoqueNav active="analise" />
      <p className="mb-4 text-sm text-slate-600">
        Análise automática com base no consumo dos últimos {DIAS_ANALISE} dias. A sugestão de compra cobre {DIAS_COBERTURA} dias
        ou o estoque mínimo.
      </p>

      <form action={gerarPedidoSugerido}>
        <Card
          title={`Sugestão de compra (${comprar.length})`}
          padded={false}
          className="mb-6"
          actions={comprar.length > 0 && <SubmitButton className="btn-primary btn-sm">Gerar pedido com selecionados</SubmitButton>}
        >
          {comprar.length === 0 ? (
            <Empty>Nenhum produto precisa de reposição agora.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th />
                  <th>Produto</th>
                  <th>Curva</th>
                  <th className="text-right">Estoque</th>
                  <th className="text-right">Consumo/dia</th>
                  <th className="text-right">Dura (dias)</th>
                  <th className="text-right">Comprar</th>
                </tr>
              </thead>
              <tbody>
                {comprar.map(({ p, mediaDia, cobertura, sugestao }) => (
                  <tr key={p.id}>
                    <td>
                      <input type="checkbox" name="produto" value={p.id} defaultChecked />
                    </td>
                    <td>
                      <Link href={`/estoque/produtos/${p.id}`} className="link">
                        {p.nome}
                      </Link>
                    </td>
                    <td>
                      <Badge color={curva.get(p.id) === "A" ? "green" : curva.get(p.id) === "B" ? "yellow" : "gray"}>
                        {curva.get(p.id)}
                      </Badge>
                    </td>
                    <td className="text-right">{qtd(p.estoqueAtual)}</td>
                    <td className="text-right">{mediaDia.toFixed(2)}</td>
                    <td className={`text-right ${cobertura < 7 ? "font-medium text-red-600" : ""}`}>
                      {cobertura === Infinity ? "—" : Math.floor(cobertura)}
                    </td>
                    <td className="text-right">
                      <input name={`qtd_${p.id}`} defaultValue={sugestao} className="input w-20 py-1 text-right" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </form>

      <Card
        title={`Produtos parados — sem saída em ${DIAS_ANALISE} dias (${parados.length})`}
        padded={false}
        actions={<span className="text-xs text-slate-500">Capital parado: {brl(valorParado)}</span>}
      >
        {parados.length === 0 ? (
          <Empty>Nenhum produto parado.</Empty>
        ) : (
          <Table>
            <tbody>
              {parados.map(({ p }) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/estoque/produtos/${p.id}`} className="link">
                      {p.nome}
                    </Link>
                  </td>
                  <td className="text-right">
                    {qtd(p.estoqueAtual)} {p.unidade}
                  </td>
                  <td className="text-right">{brl(Number(p.estoqueAtual) * Number(p.precoCusto))}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
