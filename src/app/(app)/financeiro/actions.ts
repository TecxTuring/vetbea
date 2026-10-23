"use server";

import { addMonths } from "date-fns";
import { revalidatePath } from "next/cache";
import type { FormaPagamento, TipoConta } from "@prisma/client";
import { auditar, requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { falha } from "@/lib/flash";
import { bool, date, dec, int, opt, str } from "@/lib/form";

export async function criarConta(fd: FormData) {
  const s = await requireSession();
  const tipo = str(fd, "tipo") as TipoConta;
  const valor = dec(fd, "valor");
  const vencimento = date(fd, "vencimento");
  if (!valor || !vencimento) falha("/financeiro", "Informe valor e vencimento");
  const repeticoes = Math.min(Math.max(int(fd, "repetir") ?? 1, 1), 60);
  const jaPaga = bool(fd, "jaPaga");
  const forma = (opt(fd, "forma") as FormaPagamento | null) ?? null;
  const descricao = str(fd, "descricao");

  await db.contaFinanceira.createMany({
    data: Array.from({ length: repeticoes }, (_, i) => ({
      clinicaId: s.clinicaId,
      tipo,
      descricao: repeticoes > 1 ? `${descricao} (${i + 1}/${repeticoes})` : descricao,
      categoria: str(fd, "categoria") || "Outros",
      valor,
      vencimento: addMonths(vencimento, i),
      fornecedorId: opt(fd, "fornecedorId"),
      recorrente: repeticoes > 1,
      observacoes: opt(fd, "observacoes"),
      ...(jaPaga && i === 0 ? { status: "PAGA" as const, pagoEm: vencimento, valorPago: valor, forma } : {}),
    })),
  });
  await auditar("criou", "ContaFinanceira", undefined, descricao);
  revalidatePath("/financeiro");
}

/** Baixa (pagamento ou recebimento) de uma conta, com integração ao caixa quando em dinheiro. */
export async function baixarConta(id: string, fd: FormData) {
  const s = await requireSession();
  const conta = await db.contaFinanceira.findFirstOrThrow({ where: { id, clinicaId: s.clinicaId } });
  const valorPago = dec(fd, "valorPago") ?? Number(conta.valor);
  const forma = (str(fd, "forma") || "PIX") as FormaPagamento;
  await db.$transaction(async (tx) => {
    await tx.contaFinanceira.update({
      where: { id },
      data: { status: "PAGA", pagoEm: date(fd, "pagoEm") ?? new Date(), valorPago, forma },
    });
    if (forma === "DINHEIRO") {
      const caixa = await tx.caixa.findFirst({ where: { clinicaId: s.clinicaId, fechadoEm: null } });
      if (caixa) {
        await tx.movimentoCaixa.create({
          data: {
            caixaId: caixa.id,
            tipo: conta.tipo === "PAGAR" ? "PAGAMENTO" : "RECEBIMENTO",
            forma,
            valor: valorPago,
            descricao: conta.descricao,
          },
        });
      }
    }
  });
  await auditar("baixou", "ContaFinanceira", id);
  revalidatePath("/financeiro");
}

export async function estornarConta(id: string) {
  const s = await requireSession();
  await db.contaFinanceira.update({
    where: { id, clinicaId: s.clinicaId },
    data: { status: "ABERTA", pagoEm: null, valorPago: null },
  });
  await auditar("estornou", "ContaFinanceira", id);
  revalidatePath("/financeiro");
}

export async function cancelarConta(id: string) {
  const s = await requireSession();
  await db.contaFinanceira.update({ where: { id, clinicaId: s.clinicaId }, data: { status: "CANCELADA" } });
  await auditar("cancelou", "ContaFinanceira", id);
  revalidatePath("/financeiro");
}

/** Conciliação de cartões: confirma os recebíveis que caíram na conta. */
export async function conciliar(fd: FormData) {
  const s = await requireSession();
  const ids = fd.getAll("conta").map(String);
  if (ids.length === 0) falha("/financeiro/conciliacao", "Selecione os recebimentos a conciliar");
  const contas = await db.contaFinanceira.findMany({ where: { id: { in: ids }, clinicaId: s.clinicaId, status: "ABERTA" } });
  await db.$transaction(
    contas.map((c) =>
      db.contaFinanceira.update({
        where: { id: c.id },
        data: { status: "PAGA", pagoEm: date(fd, "data") ?? new Date(), valorPago: c.valor },
      }),
    ),
  );
  // marca os pagamentos de cartão correspondentes como conciliados
  const vendaIds = contas.map((c) => c.vendaId).filter((x): x is string => !!x);
  await db.pagamento.updateMany({
    where: { vendaId: { in: vendaIds }, forma: { in: ["DEBITO", "CREDITO"] } },
    data: { conciliado: true },
  });
  await auditar("conciliou", "ContaFinanceira", undefined, `${contas.length} recebíveis`);
  revalidatePath("/financeiro/conciliacao");
}
