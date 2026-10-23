import type { Prisma } from "@prisma/client";
import { db } from "./db";

type Tx = Prisma.TransactionClient;

export async function recalcularVenda(tx: Tx, vendaId: string) {
  const venda = await tx.venda.findUniqueOrThrow({ where: { id: vendaId }, include: { itens: true } });
  const bruto = venda.itens.reduce((a, i) => a + Number(i.total), 0);
  const total = Math.max(bruto - Number(venda.desconto), 0);
  await tx.venda.update({ where: { id: vendaId }, data: { total } });
  return total;
}

/** Adiciona um item à venda. Para produtos fracionados, a quantidade está na unidade de fração. */
export async function adicionarItemVenda(
  vendaId: string,
  clinicaId: string,
  item: { produtoId?: string | null; descricao?: string; quantidade: number; valorUnit?: number | null; fracionado?: boolean },
) {
  return db.$transaction(async (tx) => {
    const venda = await tx.venda.findFirstOrThrow({ where: { id: vendaId, clinicaId } });
    if (venda.status !== "ABERTA") throw new Error("Venda já finalizada");
    let descricao = item.descricao ?? "Item";
    let valorUnit = item.valorUnit ?? 0;
    let fracionado = false;
    if (item.produtoId) {
      const p = await tx.produto.findFirstOrThrow({ where: { id: item.produtoId, clinicaId } });
      fracionado = !!(item.fracionado && p.fracionavel && p.fatorFracao);
      descricao = fracionado ? `${p.nome} (${p.unidadeFracao ?? "fração"})` : p.nome;
      if (item.valorUnit == null) {
        valorUnit = fracionado ? Number(p.precoVenda) / Number(p.fatorFracao) : Number(p.precoVenda);
      }
    }
    valorUnit = Math.round(valorUnit * 100) / 100;
    await tx.vendaItem.create({
      data: {
        vendaId,
        produtoId: item.produtoId ?? null,
        descricao,
        quantidade: item.quantidade,
        fracionado,
        valorUnit,
        total: Math.round(valorUnit * item.quantidade * 100) / 100,
      },
    });
    return recalcularVenda(tx, vendaId);
  });
}
