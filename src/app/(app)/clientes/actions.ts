"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditar, requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { bool, date, dec, opt, str } from "@/lib/form";

function dadosTutor(fd: FormData) {
  return {
    nome: str(fd, "nome"),
    cpf: opt(fd, "cpf"),
    email: opt(fd, "email"),
    telefone: opt(fd, "telefone"),
    whatsapp: opt(fd, "whatsapp") ?? opt(fd, "telefone"),
    cep: opt(fd, "cep"),
    endereco: opt(fd, "endereco"),
    bairro: opt(fd, "bairro"),
    cidade: opt(fd, "cidade"),
    uf: opt(fd, "uf"),
    dataNascimento: date(fd, "dataNascimento"),
    observacoes: opt(fd, "observacoes"),
    aceitaMensagens: bool(fd, "aceitaMensagens"),
  };
}

export async function criarTutor(fd: FormData) {
  const s = await requireSession();
  const dados = dadosTutor(fd);
  if (!dados.nome) throw new Error("Nome é obrigatório");
  const tutor = await db.tutor.create({ data: { ...dados, clinicaId: s.clinicaId } });

  const animalNome = str(fd, "animalNome");
  if (animalNome) {
    await db.animal.create({
      data: {
        clinicaId: s.clinicaId,
        tutorId: tutor.id,
        nome: animalNome,
        especie: str(fd, "animalEspecie") || "Canina",
        raca: opt(fd, "animalRaca"),
        sexo: opt(fd, "animalSexo"),
        dataNascimento: date(fd, "animalNascimento"),
      },
    });
  }
  await auditar("criou", "Tutor", tutor.id, tutor.nome);
  redirect(`/clientes/${tutor.id}`);
}

export async function atualizarTutor(id: string, fd: FormData) {
  const s = await requireSession();
  await db.tutor.update({ where: { id, clinicaId: s.clinicaId }, data: dadosTutor(fd) });
  await auditar("editou", "Tutor", id);
  redirect(`/clientes/${id}`);
}

/** Lança crédito pré-pago para o cliente (entra no caixa como recebimento). */
export async function adicionarCredito(id: string, fd: FormData) {
  const s = await requireSession();
  const valor = dec(fd, "valor") ?? 0;
  if (valor <= 0) return;
  const forma = (str(fd, "forma") || "DINHEIRO") as "DINHEIRO";
  await db.$transaction(async (tx) => {
    const tutor = await tx.tutor.update({
      where: { id, clinicaId: s.clinicaId },
      data: { saldoCredito: { increment: valor } },
    });
    const caixa = await tx.caixa.findFirst({
      where: { clinicaId: s.clinicaId, fechadoEm: null },
      orderBy: { abertoEm: "desc" },
    });
    if (caixa) {
      await tx.movimentoCaixa.create({
        data: { caixaId: caixa.id, tipo: "RECEBIMENTO", forma, valor, descricao: `Crédito para ${tutor.nome}` },
      });
    }
  });
  await auditar("adicionou crédito", "Tutor", id, String(valor));
  revalidatePath(`/clientes/${id}`);
}

/** Quita débitos (contas a receber em aberto) do cliente. */
export async function quitarDebito(contaId: string, fd: FormData) {
  const s = await requireSession();
  const forma = (str(fd, "forma") || "DINHEIRO") as "DINHEIRO";
  const conta = await db.contaFinanceira.findFirstOrThrow({ where: { id: contaId, clinicaId: s.clinicaId } });
  await db.$transaction(async (tx) => {
    await tx.contaFinanceira.update({
      where: { id: contaId },
      data: { status: "PAGA", pagoEm: new Date(), valorPago: conta.valor, forma },
    });
    const caixa = await tx.caixa.findFirst({
      where: { clinicaId: s.clinicaId, fechadoEm: null },
      orderBy: { abertoEm: "desc" },
    });
    if (caixa) {
      await tx.movimentoCaixa.create({
        data: { caixaId: caixa.id, tipo: "RECEBIMENTO", forma, valor: conta.valor, descricao: conta.descricao },
      });
    }
  });
  await auditar("quitou débito", "ContaFinanceira", contaId);
  revalidatePath(`/clientes/${conta.tutorId}`);
}
