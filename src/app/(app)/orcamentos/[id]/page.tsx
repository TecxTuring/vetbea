import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl, data, qtd, rotulo, telefone, whatsappLink } from "@/lib/format";
import { Badge, corStatus, Field, PageHeader } from "@/components/ui";
import { PrintButton, SubmitButton } from "@/components/client";
import { Picker } from "@/components/picker";
import {
  adicionarItemOrcamento,
  atualizarOrcamento,
  converterEmVenda,
  mudarStatusOrcamento,
  removerItemOrcamento,
} from "../actions";

export default async function Orcamento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  const orc = await db.orcamento.findFirst({
    where: { id, clinicaId: s.clinicaId },
    include: { tutor: true, animal: true, itens: true, clinica: true },
  });
  if (!orc) notFound();
  const bruto = orc.itens.reduce((a, i) => a + Number(i.quantidade) * Number(i.valorUnit), 0);
  const total = bruto - Number(orc.desconto);
  const editavel = orc.status === "ABERTO";
  const wa = whatsappLink(
    orc.tutor.whatsapp ?? orc.tutor.telefone,
    `Olá, ${orc.tutor.nome.split(" ")[0]}! Segue o orçamento${orc.animal ? ` para ${orc.animal.nome}` : ""}:\n\n${orc.itens
      .map((i) => `• ${i.descricao} (${qtd(i.quantidade)}x) — ${brl(Number(i.quantidade) * Number(i.valorUnit))}`)
      .join("\n")}\n\nTotal: ${brl(total)}\nVálido até ${data(orc.validade)}.`,
  );

  return (
    <>
      <PageHeader
        back="/orcamentos"
        title={
          <span className="flex items-center gap-3">
            Orçamento <Badge color={corStatus(orc.status)}>{rotulo(orc.status)}</Badge>
          </span>
        }
        actions={
          <>
            {wa && (
              <a href={wa} target="_blank" className="btn-secondary">
                Enviar por WhatsApp
              </a>
            )}
            <PrintButton />
            {editavel && (
              <>
                <form action={mudarStatusOrcamento.bind(null, id, "RECUSADO")}>
                  <SubmitButton className="btn-secondary">Recusado</SubmitButton>
                </form>
                <form action={mudarStatusOrcamento.bind(null, id, "APROVADO")}>
                  <SubmitButton className="btn-secondary">Aprovado</SubmitButton>
                </form>
              </>
            )}
            {["ABERTO", "APROVADO"].includes(orc.status) && orc.itens.length > 0 && (
              <form action={converterEmVenda.bind(null, id)}>
                <SubmitButton>Converter em venda</SubmitButton>
              </form>
            )}
          </>
        }
      />

      {editavel && (
        <form action={adicionarItemOrcamento.bind(null, id)} className="card no-print mb-6 grid gap-3 p-5 sm:grid-cols-6">
          <Field label="Produto / serviço" className="sm:col-span-3">
            <Picker tipo="produtos" name="produtoId" />
          </Field>
          <Field label="Qtd.">
            <input name="quantidade" defaultValue="1" className="input" />
          </Field>
          <Field label="Valor unit. (opcional)">
            <input name="valorUnit" className="input" />
          </Field>
          <div className="flex items-end">
            <SubmitButton className="btn-primary w-full">Adicionar</SubmitButton>
          </div>
        </form>
      )}

      <article className="print-area card mx-auto max-w-3xl p-8">
        <header className="mb-6 flex justify-between border-b-2 border-brand-600 pb-4">
          <div>
            <p className="text-xl font-bold text-brand-800">{orc.clinica.nome}</p>
            <p className="text-xs text-slate-500">{telefone(orc.clinica.telefone)}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">ORÇAMENTO</p>
            <p>Emissão: {data(orc.createdAt)}</p>
            <p>Validade: {data(orc.validade)}</p>
          </div>
        </header>
        <p className="mb-4 text-sm">
          <strong>Cliente:</strong> {orc.tutor.nome} {orc.animal && <> · <strong>Paciente:</strong> {orc.animal.nome}</>}
        </p>
        <table className="table">
          <thead>
            <tr>
              <th>Descrição</th>
              <th className="text-right">Qtd.</th>
              <th className="text-right">Unitário</th>
              <th className="text-right">Total</th>
              {editavel && <th className="no-print" />}
            </tr>
          </thead>
          <tbody>
            {orc.itens.map((i) => (
              <tr key={i.id}>
                <td>{i.descricao}</td>
                <td className="text-right">{qtd(i.quantidade)}</td>
                <td className="text-right">{brl(i.valorUnit)}</td>
                <td className="text-right">{brl(Number(i.quantidade) * Number(i.valorUnit))}</td>
                {editavel && (
                  <td className="no-print w-8">
                    <form action={removerItemOrcamento.bind(null, id, i.id)}>
                      <button className="text-slate-400 hover:text-red-600">✕</button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 ml-auto w-64 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{brl(bruto)}</span>
          </div>
          <div className="flex justify-between">
            <span>Desconto</span>
            <span>- {brl(orc.desconto)}</span>
          </div>
          <div className="flex justify-between border-t pt-1 text-base font-semibold">
            <span>Total</span>
            <span>{brl(total)}</span>
          </div>
        </div>
        {orc.observacoes && <p className="mt-6 text-sm whitespace-pre-line text-slate-600">{orc.observacoes}</p>}

        {editavel && (
          <form action={atualizarOrcamento.bind(null, id)} className="no-print mt-6 flex flex-wrap items-end gap-3 border-t pt-4">
            <Field label="Desconto (R$)">
              <input name="desconto" defaultValue={Number(orc.desconto)} className="input w-32" />
            </Field>
            <Field label="Observações" className="flex-1">
              <input name="observacoes" defaultValue={orc.observacoes ?? ""} className="input" />
            </Field>
            <SubmitButton className="btn-secondary">Salvar</SubmitButton>
          </form>
        )}
      </article>
    </>
  );
}
