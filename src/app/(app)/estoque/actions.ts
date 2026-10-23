"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TipoMovimento, TipoProduto } from "@prisma/client";
import { auditar, requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { falha } from "@/lib/flash";
import { bool, date, dec, opt, str } from "@/lib/form";
import { lerNFe } from "@/lib/nfe";

// ── Produtos ──

function dadosProduto(fd: FormData) {
  const tipo = (str(fd, "tipo") || "PRODUTO") as TipoProduto;
  return {
    nome: str(fd, "nome"),
    tipo,
    categoria: opt(fd, "categoria"),
    codigoBarras: opt(fd, "codigoBarras"),
    unidade: str(fd, "unidade") || "UN",
    precoCusto: dec(fd, "precoCusto") ?? 0,
    precoVenda: dec(fd, "precoVenda") ?? 0,
    controlaEstoque: tipo === "SERVICO" ? false : bool(fd, "controlaEstoque"),
    estoqueMinimo: dec(fd, "estoqueMinimo") ?? 0,
    fracionavel: bool(fd, "fracionavel"),
    unidadeFracao: opt(fd, "unidadeFracao"),
    fatorFracao: dec(fd, "fatorFracao"),
    validade: date(fd, "validade"),
    comissaoPct: dec(fd, "comissaoPct") ?? 0,
    ativo: fd.has("temAtivo") ? bool(fd, "ativo") : true,
  };
}

export async function criarProduto(fd: FormData) {
  const s = await requireSession();
  const dados = dadosProduto(fd);
  const inicial = dec(fd, "estoqueInicial") ?? 0;
  const p = await db.produto.create({ data: { ...dados, clinicaId: s.clinicaId, estoqueAtual: inicial } });
  if (inicial) {
    await db.movimentoEstoque.create({
      data: {
        clinicaId: s.clinicaId,
        produtoId: p.id,
        tipo: "AJUSTE_INVENTARIO",
        quantidade: inicial,
        custoUnit: dados.precoCusto,
        observacao: "Estoque inicial",
        usuarioId: s.userId,
      },
    });
  }
  await auditar("criou", "Produto", p.id, p.nome);
  redirect(`/estoque/produtos/${p.id}`);
}

export async function atualizarProduto(id: string, fd: FormData) {
  const s = await requireSession();
  await db.produto.update({ where: { id, clinicaId: s.clinicaId }, data: dadosProduto(fd) });
  await auditar("editou", "Produto", id);
  revalidatePath(`/estoque/produtos/${id}`);
}

// ── Outras saídas (consumo interno, avaria, vencimento, doação, devolução) ──

export async function registrarSaida(fd: FormData) {
  const s = await requireSession();
  const produto = await db.produto.findFirst({ where: { id: str(fd, "produtoId"), clinicaId: s.clinicaId } });
  if (!produto) falha("/estoque/saidas", "Selecione um produto");
  const quantidade = dec(fd, "quantidade") ?? 0;
  if (quantidade <= 0) falha("/estoque/saidas", "Quantidade inválida");
  const tipo = str(fd, "tipo") as TipoMovimento;
  const fornecedor = opt(fd, "fornecedorId")
    ? await db.fornecedor.findFirst({ where: { id: str(fd, "fornecedorId"), clinicaId: s.clinicaId } })
    : null;

  await db.$transaction(async (tx) => {
    await tx.produto.update({ where: { id: produto.id }, data: { estoqueAtual: { decrement: quantidade } } });
    await tx.movimentoEstoque.create({
      data: {
        clinicaId: s.clinicaId,
        produtoId: produto.id,
        tipo,
        quantidade: -quantidade,
        custoUnit: produto.precoCusto,
        observacao: [opt(fd, "observacao"), fornecedor && `Fornecedor: ${fornecedor.nome}`].filter(Boolean).join(" · ") || null,
        usuarioId: s.userId,
      },
    });
    // devolução ao fornecedor gera um crédito a receber
    if (tipo === "DEVOLUCAO_FORNECEDOR" && bool(fd, "gerarCredito")) {
      await tx.contaFinanceira.create({
        data: {
          clinicaId: s.clinicaId,
          tipo: "RECEBER",
          descricao: `Devolução de ${produto.nome} ${fornecedor ? `— ${fornecedor.nome}` : ""}`,
          categoria: "Devoluções",
          valor: Math.round(quantidade * Number(produto.precoCusto) * 100) / 100,
          vencimento: new Date(),
          fornecedorId: fornecedor?.id,
        },
      });
    }
  });
  revalidatePath("/estoque/saidas");
}

// ── Fornecedores ──

export async function salvarFornecedor(fd: FormData) {
  const s = await requireSession();
  const id = opt(fd, "id");
  const data = {
    nome: str(fd, "nome"),
    cnpj: opt(fd, "cnpj"),
    telefone: opt(fd, "telefone"),
    email: opt(fd, "email"),
    contato: opt(fd, "contato"),
  };
  if (id) await db.fornecedor.update({ where: { id, clinicaId: s.clinicaId }, data });
  else await db.fornecedor.create({ data: { ...data, clinicaId: s.clinicaId } });
  revalidatePath("/estoque/fornecedores");
}

// ── Pedidos de compra ──

export async function criarPedido(fd: FormData) {
  const s = await requireSession();
  const p = await db.pedidoCompra.create({
    data: { clinicaId: s.clinicaId, fornecedorId: opt(fd, "fornecedorId"), observacoes: opt(fd, "observacoes") },
  });
  redirect(`/estoque/compras/${p.id}`);
}

/** Gera um pedido com as sugestões da análise automática de estoque. */
export async function gerarPedidoSugerido(fd: FormData) {
  const s = await requireSession();
  const ids = fd.getAll("produto").map(String);
  if (ids.length === 0) falha("/estoque/analise", "Selecione ao menos um produto");
  const produtos = await db.produto.findMany({ where: { id: { in: ids }, clinicaId: s.clinicaId } });
  const p = await db.pedidoCompra.create({
    data: {
      clinicaId: s.clinicaId,
      observacoes: "Gerado pela análise automática de estoque",
      itens: {
        create: produtos.map((prod) => ({
          produtoId: prod.id,
          quantidade: Math.max(dec(fd, `qtd_${prod.id}`) ?? 1, 1),
          custoUnit: prod.precoCusto,
        })),
      },
    },
  });
  redirect(`/estoque/compras/${p.id}`);
}

async function pedidoEditavel(id: string) {
  const s = await requireSession();
  const pedido = await db.pedidoCompra.findFirstOrThrow({ where: { id, clinicaId: s.clinicaId }, include: { itens: true } });
  if (pedido.status === "RECEBIDO" || pedido.status === "CANCELADO") falha(`/estoque/compras/${id}`, "Pedido já encerrado");
  return { s, pedido };
}

export async function adicionarItemPedido(id: string, fd: FormData) {
  const { s } = await pedidoEditavel(id);
  const produto = await db.produto.findFirst({ where: { id: str(fd, "produtoId"), clinicaId: s.clinicaId } });
  if (!produto) falha(`/estoque/compras/${id}`, "Selecione um produto");
  await db.pedidoCompraItem.create({
    data: {
      pedidoId: id,
      produtoId: produto.id,
      quantidade: dec(fd, "quantidade") ?? 1,
      custoUnit: dec(fd, "custoUnit") ?? produto.precoCusto,
    },
  });
  revalidatePath(`/estoque/compras/${id}`);
}

export async function removerItemPedido(id: string, itemId: string) {
  await pedidoEditavel(id);
  await db.pedidoCompraItem.delete({ where: { id: itemId, pedidoId: id } });
  revalidatePath(`/estoque/compras/${id}`);
}

export async function atualizarPedido(id: string, fd: FormData) {
  await pedidoEditavel(id);
  await db.pedidoCompra.update({
    where: { id },
    data: { fornecedorId: opt(fd, "fornecedorId"), numeroNF: opt(fd, "numeroNF"), observacoes: opt(fd, "observacoes") },
  });
  revalidatePath(`/estoque/compras/${id}`);
}

export async function marcarEnviado(id: string) {
  await pedidoEditavel(id);
  await db.pedidoCompra.update({ where: { id }, data: { status: "ENVIADO" } });
  revalidatePath(`/estoque/compras/${id}`);
}

export async function cancelarPedido(id: string) {
  await pedidoEditavel(id);
  await db.pedidoCompra.update({ where: { id }, data: { status: "CANCELADO" } });
  revalidatePath(`/estoque/compras/${id}`);
}

/** Recebe a mercadoria: dá entrada no estoque, atualiza custo e lança conta a pagar. */
export async function receberPedido(id: string, fd: FormData) {
  const { s, pedido } = await pedidoEditavel(id);
  if (pedido.itens.length === 0) falha(`/estoque/compras/${id}`, "Pedido sem itens");
  const fornecedor = pedido.fornecedorId ? await db.fornecedor.findUnique({ where: { id: pedido.fornecedorId } }) : null;
  const total = pedido.itens.reduce((a, i) => a + Number(i.quantidade) * Number(i.custoUnit), 0);
  const parcelas = Math.max(Number(str(fd, "parcelas")) || 1, 1);
  const primeiroVenc = date(fd, "vencimento") ?? new Date();

  await db.$transaction(async (tx) => {
    for (const item of pedido.itens) {
      await tx.produto.update({
        where: { id: item.produtoId },
        data: { estoqueAtual: { increment: item.quantidade }, precoCusto: item.custoUnit },
      });
      await tx.movimentoEstoque.create({
        data: {
          clinicaId: s.clinicaId,
          produtoId: item.produtoId,
          tipo: "ENTRADA_COMPRA",
          quantidade: item.quantidade,
          custoUnit: item.custoUnit,
          referencia: id,
          observacao: pedido.numeroNF ? `NF ${pedido.numeroNF}` : null,
          usuarioId: s.userId,
        },
      });
    }
    if (bool(fd, "lancarConta") && total > 0) {
      const valorParcela = Math.round((total / parcelas) * 100) / 100;
      for (let i = 0; i < parcelas; i++) {
        const venc = new Date(primeiroVenc);
        venc.setMonth(venc.getMonth() + i);
        await tx.contaFinanceira.create({
          data: {
            clinicaId: s.clinicaId,
            tipo: "PAGAR",
            descricao: `Compra${pedido.numeroNF ? ` NF ${pedido.numeroNF}` : ""}${fornecedor ? ` — ${fornecedor.nome}` : ""}${parcelas > 1 ? ` (${i + 1}/${parcelas})` : ""}`,
            categoria: "Fornecedores",
            valor: i === parcelas - 1 ? Math.round((total - valorParcela * (parcelas - 1)) * 100) / 100 : valorParcela,
            vencimento: venc,
            fornecedorId: pedido.fornecedorId,
          },
        });
      }
    }
    await tx.pedidoCompra.update({ where: { id }, data: { status: "RECEBIDO", recebidoEm: new Date() } });
  });
  await auditar("recebeu", "PedidoCompra", id);
  revalidatePath(`/estoque/compras/${id}`);
}

/** Importa o XML da NF-e: cria fornecedor/produtos que não existem e monta o pedido para conferência. */
export async function importarXml(fd: FormData) {
  const s = await requireSession();
  const arquivo = fd.get("xml");
  if (!(arquivo instanceof File) || arquivo.size === 0) falha("/estoque/compras", "Selecione o arquivo XML da nota");
  let nfe;
  try {
    nfe = lerNFe(await arquivo.text());
  } catch {
    falha("/estoque/compras", "Não foi possível ler o XML. Verifique se é uma NF-e válida.");
  }
  if (nfe.itens.length === 0) falha("/estoque/compras", "Nenhum item encontrado na nota");

  let fornecedor = nfe.emitente.cnpj
    ? await db.fornecedor.findFirst({ where: { clinicaId: s.clinicaId, cnpj: nfe.emitente.cnpj } })
    : null;
  if (!fornecedor) {
    fornecedor = await db.fornecedor.create({
      data: { clinicaId: s.clinicaId, nome: nfe.emitente.nome || "Fornecedor", cnpj: nfe.emitente.cnpj },
    });
  }

  const itens = [];
  for (const item of nfe.itens) {
    let produto =
      (item.ean && (await db.produto.findFirst({ where: { clinicaId: s.clinicaId, codigoBarras: item.ean } }))) ||
      (await db.produto.findFirst({ where: { clinicaId: s.clinicaId, nome: { equals: item.nome, mode: "insensitive" } } }));
    if (!produto) {
      produto = await db.produto.create({
        data: {
          clinicaId: s.clinicaId,
          nome: item.nome,
          codigoBarras: item.ean,
          unidade: item.unidade || "UN",
          precoCusto: item.valorUnit,
          precoVenda: Math.round(item.valorUnit * 1.8 * 100) / 100, // margem sugerida, revisar
          categoria: "Importado da NF-e",
        },
      });
    }
    itens.push({ produtoId: produto.id, quantidade: item.quantidade, custoUnit: item.valorUnit });
  }

  const pedido = await db.pedidoCompra.create({
    data: {
      clinicaId: s.clinicaId,
      fornecedorId: fornecedor.id,
      status: "ENVIADO",
      numeroNF: nfe.numero,
      chaveNFe: nfe.chave,
      observacoes: "Importado do XML da NF-e — confira os itens e receba a mercadoria",
      itens: { create: itens },
    },
  });
  await auditar("importou XML", "PedidoCompra", pedido.id, nfe.chave ?? undefined);
  redirect(`/estoque/compras/${pedido.id}`);
}

// ── Inventário ──

export async function criarInventario(fd: FormData) {
  const s = await requireSession();
  const categoria = opt(fd, "categoria");
  const produtos = await db.produto.findMany({
    where: { clinicaId: s.clinicaId, ativo: true, controlaEstoque: true, ...(categoria ? { categoria } : {}) },
  });
  const inv = await db.inventario.create({
    data: {
      clinicaId: s.clinicaId,
      descricao: str(fd, "descricao") || `Inventário ${new Date().toLocaleDateString("pt-BR")}`,
      itens: {
        create: produtos.map((p) => ({ produtoId: p.id, sistema: p.estoqueAtual, contado: p.estoqueAtual })),
      },
    },
  });
  redirect(`/estoque/inventario/${inv.id}`);
}

export async function salvarContagem(inventarioId: string, fd: FormData) {
  const s = await requireSession();
  const inv = await db.inventario.findFirstOrThrow({ where: { id: inventarioId, clinicaId: s.clinicaId, finalizado: false } });
  const updates = [];
  for (const [k, v] of fd.entries()) {
    if (!k.startsWith("c_") || String(v).trim() === "") continue;
    const n = Number(String(v).replace(",", "."));
    if (isNaN(n)) continue;
    updates.push(db.inventarioItem.update({ where: { id: k.slice(2), inventarioId: inv.id }, data: { contado: n } }));
  }
  await db.$transaction(updates);
  revalidatePath(`/estoque/inventario/${inventarioId}`);
}

export async function finalizarInventario(inventarioId: string) {
  const s = await requireSession();
  const inv = await db.inventario.findFirstOrThrow({
    where: { id: inventarioId, clinicaId: s.clinicaId, finalizado: false },
    include: { itens: { include: { produto: true } } },
  });
  await db.$transaction(async (tx) => {
    for (const item of inv.itens) {
      // ajuste = contado - estoque no início da contagem; assim vendas feitas durante a contagem são preservadas
      const ajuste = Number(item.contado) - Number(item.sistema);
      if (Math.abs(ajuste) < 0.0005) continue;
      await tx.produto.update({ where: { id: item.produtoId }, data: { estoqueAtual: { increment: ajuste } } });
      await tx.movimentoEstoque.create({
        data: {
          clinicaId: s.clinicaId,
          produtoId: item.produtoId,
          tipo: "AJUSTE_INVENTARIO",
          quantidade: ajuste,
          custoUnit: item.produto.precoCusto,
          referencia: inv.id,
          observacao: inv.descricao,
          usuarioId: s.userId,
        },
      });
    }
    await tx.inventario.update({ where: { id: inv.id }, data: { finalizado: true, finalizadoEm: new Date() } });
  });
  await auditar("finalizou", "Inventario", inv.id);
  revalidatePath(`/estoque/inventario/${inventarioId}`);
}
