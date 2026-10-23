"use server";

import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormaPagamento } from "@prisma/client";
import { auditar, requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { bool, dec, int, opt, str } from "@/lib/form";
import { adicionarItemVenda, recalcularVenda } from "@/lib/vendas";
import { falha } from "@/lib/flash";

/** Prazos e taxas padrão das maquininhas (podem ser ajustados no pagamento). */
const PRAZO_CARTAO: Partial<Record<FormaPagamento, number>> = { DEBITO: 1, CREDITO: 30 };

export async function novaVenda(fd: FormData) {
  const s = await requireSession();
  const tutorId = opt(fd, "tutorId");
  if (tutorId) await db.tutor.findFirstOrThrow({ where: { id: tutorId, clinicaId: s.clinicaId } });
  const caixa = await db.caixa.findFirst({ where: { clinicaId: s.clinicaId, fechadoEm: null } });
  const venda = await db.venda.create({
    data: { clinicaId: s.clinicaId, tutorId, usuarioId: s.userId, caixaId: caixa?.id },
  });
  redirect(`/vendas/${venda.id}`);
}

async function vendaAberta(id: string) {
  const s = await requireSession();
  const venda = await db.venda.findFirstOrThrow({
    where: { id, clinicaId: s.clinicaId },
    include: { itens: { include: { produto: true } }, pagamentos: true, tutor: true },
  });
  if (venda.status !== "ABERTA") falha(`/vendas/${id}`, "Esta venda não está mais aberta");
  return { s, venda };
}

export async function definirCliente(id: string, fd: FormData) {
  await vendaAberta(id);
  await db.venda.update({ where: { id }, data: { tutorId: opt(fd, "tutorId") } });
  revalidatePath(`/vendas/${id}`);
}

export async function adicionarItem(id: string, fd: FormData) {
  const { s } = await vendaAberta(id);
  const produtoId = opt(fd, "produtoId");
  if (!produtoId) return;
  await adicionarItemVenda(id, s.clinicaId, {
    produtoId,
    quantidade: dec(fd, "quantidade") ?? 1,
    valorUnit: dec(fd, "valorUnit"),
    fracionado: bool(fd, "fracionado"),
  });
  revalidatePath(`/vendas/${id}`);
}

export async function removerItem(id: string, itemId: string) {
  await vendaAberta(id);
  await db.$transaction(async (tx) => {
    await tx.vendaItem.delete({ where: { id: itemId, vendaId: id } });
    await recalcularVenda(tx, id);
  });
  revalidatePath(`/vendas/${id}`);
}

export async function aplicarDesconto(id: string, fd: FormData) {
  const { venda } = await vendaAberta(id);
  const bruto = venda.itens.reduce((a, i) => a + Number(i.total), 0);
  let desconto = dec(fd, "desconto") ?? 0;
  if (str(fd, "tipo") === "pct") desconto = Math.round(bruto * desconto) / 100;
  await db.$transaction(async (tx) => {
    await tx.venda.update({ where: { id }, data: { desconto: Math.min(desconto, bruto) } });
    await recalcularVenda(tx, id);
  });
  revalidatePath(`/vendas/${id}`);
}

export async function adicionarPagamento(id: string, fd: FormData) {
  const { venda } = await vendaAberta(id);
  const forma = str(fd, "forma") as FormaPagamento;
  const pago = venda.pagamentos.reduce((a, p) => a + Number(p.valor), 0);
  const restante = Math.round((Number(venda.total) - pago) * 100) / 100;
  const valor = dec(fd, "valor") ?? restante;
  if (valor <= 0) return;

  if (forma === "CREDITO_CLIENTE") {
    if (!venda.tutor) falha(`/vendas/${id}`, "Selecione o cliente para usar crédito");
    if (Number(venda.tutor.saldoCredito) < valor) falha(`/vendas/${id}`, "Saldo de crédito insuficiente");
  }
  if (forma === "A_PRAZO" && !venda.tutorId) falha(`/vendas/${id}`, "Selecione o cliente para vender a prazo");

  const prazo = PRAZO_CARTAO[forma];
  await db.pagamento.create({
    data: {
      vendaId: id,
      forma,
      valor,
      parcelas: int(fd, "parcelas") ?? 1,
      taxaPct: dec(fd, "taxaPct") ?? 0,
      previsaoRecebimento: prazo ? addDays(new Date(), prazo) : null,
    },
  });
  revalidatePath(`/vendas/${id}`);
}

export async function removerPagamento(id: string, pagamentoId: string) {
  await vendaAberta(id);
  await db.pagamento.delete({ where: { id: pagamentoId, vendaId: id } });
  revalidatePath(`/vendas/${id}`);
}

/**
 * Finaliza a venda: baixa estoque, integra ao financeiro (contas a receber / recebidas),
 * consome crédito do cliente e registra débito para vendas a prazo.
 */
export async function finalizarVenda(id: string) {
  const { s, venda } = await vendaAberta(id);
  if (venda.itens.length === 0) falha(`/vendas/${id}`, "Adicione itens à venda");
  const pago = venda.pagamentos.reduce((a, p) => a + Number(p.valor), 0);
  if (Math.round(pago * 100) < Math.round(Number(venda.total) * 100)) {
    falha(`/vendas/${id}`, "Os pagamentos não cobrem o total da venda");
  }
  const caixa = await db.caixa.findFirst({ where: { clinicaId: s.clinicaId, fechadoEm: null }, orderBy: { abertoEm: "desc" } });
  const agora = new Date();
  const nomeCliente = venda.tutor?.nome ?? "Consumidor";

  await db.$transaction(async (tx) => {
    // estoque
    for (const item of venda.itens) {
      const p = item.produto;
      if (!p || !p.controlaEstoque) continue;
      const baixa = item.fracionado && p.fatorFracao ? Number(item.quantidade) / Number(p.fatorFracao) : Number(item.quantidade);
      await tx.produto.update({ where: { id: p.id }, data: { estoqueAtual: { decrement: baixa } } });
      await tx.movimentoEstoque.create({
        data: {
          clinicaId: s.clinicaId,
          produtoId: p.id,
          tipo: "SAIDA_VENDA",
          quantidade: -baixa,
          referencia: id,
          usuarioId: s.userId,
        },
      });
    }

    // financeiro
    for (const pg of venda.pagamentos) {
      const valor = Number(pg.valor);
      if (pg.forma === "CREDITO_CLIENTE") {
        await tx.tutor.update({ where: { id: venda.tutorId! }, data: { saldoCredito: { decrement: valor } } });
        continue;
      }
      if (pg.forma === "A_PRAZO") {
        await tx.contaFinanceira.create({
          data: {
            clinicaId: s.clinicaId,
            tipo: "RECEBER",
            descricao: `Venda a prazo — ${nomeCliente}`,
            categoria: "Vendas",
            valor,
            vencimento: addDays(agora, 30),
            tutorId: venda.tutorId,
            vendaId: id,
          },
        });
        continue;
      }
      const cartao = pg.forma === "DEBITO" || pg.forma === "CREDITO";
      const liquido = Math.round(valor * (1 - Number(pg.taxaPct) / 100) * 100) / 100;
      await tx.contaFinanceira.create({
        data: {
          clinicaId: s.clinicaId,
          tipo: "RECEBER",
          descricao: `Venda ${cartao ? `(${pg.forma === "DEBITO" ? "débito" : `crédito ${pg.parcelas}x`})` : ""} — ${nomeCliente}`,
          categoria: "Vendas",
          valor: cartao ? liquido : valor,
          vencimento: pg.previsaoRecebimento ?? agora,
          status: cartao ? "ABERTA" : "PAGA", // cartão fica a receber até a conciliação
          pagoEm: cartao ? null : agora,
          valorPago: cartao ? null : valor,
          forma: pg.forma,
          tutorId: venda.tutorId,
          vendaId: id,
        },
      });
    }

    // troco em dinheiro: pagamento acima do total
    const troco = Math.round((pago - Number(venda.total)) * 100) / 100;
    if (troco > 0 && caixa) {
      await tx.movimentoCaixa.create({
        data: { caixaId: caixa.id, tipo: "PAGAMENTO", forma: "DINHEIRO", valor: troco, descricao: `Troco da venda` },
      });
    }

    await tx.venda.update({
      where: { id },
      data: { status: "FINALIZADA", finalizadaEm: agora, caixaId: venda.caixaId ?? caixa?.id },
    });
    if (venda.atendimentoId) {
      await tx.atendimento.update({ where: { id: venda.atendimentoId }, data: { finalizado: true } });
    }
  });
  await auditar("finalizou", "Venda", id, String(venda.total));
  redirect(`/vendas/${id}`);
}

/** Cancela uma venda finalizada: estorna estoque, financeiro e crédito. */
export async function cancelarVenda(id: string) {
  const s = await requireSession();
  const venda = await db.venda.findFirstOrThrow({
    where: { id, clinicaId: s.clinicaId },
    include: { itens: { include: { produto: true } }, pagamentos: true },
  });
  if (venda.status === "CANCELADA") return;
  await db.$transaction(async (tx) => {
    if (venda.status === "FINALIZADA") {
      for (const item of venda.itens) {
        const p = item.produto;
        if (!p || !p.controlaEstoque) continue;
        const qtd = item.fracionado && p.fatorFracao ? Number(item.quantidade) / Number(p.fatorFracao) : Number(item.quantidade);
        await tx.produto.update({ where: { id: p.id }, data: { estoqueAtual: { increment: qtd } } });
        await tx.movimentoEstoque.create({
          data: { clinicaId: s.clinicaId, produtoId: p.id, tipo: "ESTORNO_VENDA", quantidade: qtd, referencia: id, usuarioId: s.userId },
        });
      }
      for (const pg of venda.pagamentos) {
        if (pg.forma === "CREDITO_CLIENTE" && venda.tutorId) {
          await tx.tutor.update({ where: { id: venda.tutorId }, data: { saldoCredito: { increment: pg.valor } } });
        }
      }
      await tx.contaFinanceira.updateMany({ where: { vendaId: id }, data: { status: "CANCELADA" } });
    }
    await tx.venda.update({ where: { id }, data: { status: "CANCELADA" } });
  });
  await auditar("cancelou", "Venda", id);
  revalidatePath(`/vendas/${id}`);
}
