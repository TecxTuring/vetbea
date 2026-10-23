import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl, dataHora, idade, qtd } from "@/lib/format";
import { Badge, Card, Empty, Field, PageHeader, Table } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { Picker } from "@/components/picker";
import { lancarItem, removerItem, salvarAtendimento } from "../actions";

export default async function Atendimento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  const at = await db.atendimento.findFirst({
    where: { id, clinicaId: s.clinicaId },
    include: {
      animal: { include: { tutor: true } },
      veterinario: true,
      venda: { include: { itens: true } },
    },
  });
  if (!at) notFound();
  const anteriores = await db.atendimento.findMany({
    where: { animalId: at.animalId, id: { not: id } },
    orderBy: { data: "desc" },
    take: 5,
  });
  const v = (x: unknown) => (x === null || x === undefined ? "" : String(x));
  const vendaAberta = !at.venda || at.venda.status === "ABERTA";

  return (
    <>
      <PageHeader
        back={`/animais/${at.animalId}`}
        title={
          <span className="flex items-center gap-3">
            {at.tipo} · {at.animal.nome}
            {at.finalizado ? <Badge color="green">Finalizado</Badge> : <Badge color="yellow">Em aberto</Badge>}
          </span>
        }
        subtitle={`${at.animal.especie} · ${at.animal.raca ?? "SRD"} · ${idade(at.animal.dataNascimento)} · Tutor: ${at.animal.tutor.nome} · ${dataHora(at.data)} · ${at.veterinario?.nome ?? ""}`}
        actions={
          <>
            <Link href={`/animais/${at.animalId}?aba=receitas`} className="btn-secondary">
              Receita
            </Link>
            <Link href={`/animais/${at.animalId}?aba=exames`} className="btn-secondary">
              Exames
            </Link>
            <Link href={`/animais/${at.animalId}?aba=vacinas`} className="btn-secondary">
              Vacinas
            </Link>
          </>
        }
      />

      {at.animal.alergias && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          <strong>Alergias:</strong> {at.animal.alergias}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <form action={salvarAtendimento.bind(null, id)} className="space-y-6 lg:col-span-2">
          <Card title="Sinais vitais">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Peso (kg)">
                <input name="peso" defaultValue={v(at.peso ?? at.animal.peso)} className="input" />
              </Field>
              <Field label="Temperatura (°C)">
                <input name="temperatura" defaultValue={v(at.temperatura)} className="input" />
              </Field>
              <Field label="FC (bpm)">
                <input name="fc" defaultValue={v(at.fc)} className="input" />
              </Field>
              <Field label="FR (mpm)">
                <input name="fr" defaultValue={v(at.fr)} className="input" />
              </Field>
              <Field label="TPC">
                <input name="tpc" defaultValue={v(at.tpc)} placeholder="< 2s" className="input" />
              </Field>
              <Field label="Mucosas">
                <input name="mucosas" defaultValue={v(at.mucosas)} placeholder="Normocoradas" className="input" />
              </Field>
              <Field label="Hidratação">
                <input name="hidratacao" defaultValue={v(at.hidratacao)} className="input" />
              </Field>
              <Field label="Tipo">
                <input name="tipo" defaultValue={at.tipo} className="input" />
              </Field>
            </div>
          </Card>
          <Card title="Prontuário">
            <div className="space-y-4">
              <Field label="Queixa principal">
                <textarea name="queixa" rows={2} defaultValue={v(at.queixa)} className="input" />
              </Field>
              <Field label="Anamnese">
                <textarea name="anamnese" rows={4} defaultValue={v(at.anamnese)} className="input" />
              </Field>
              <Field label="Exame físico">
                <textarea name="exameFisico" rows={4} defaultValue={v(at.exameFisico)} className="input" />
              </Field>
              <Field label="Diagnóstico / suspeita">
                <textarea name="diagnostico" rows={2} defaultValue={v(at.diagnostico)} className="input" />
              </Field>
              <Field label="Conduta / tratamento">
                <textarea name="conduta" rows={3} defaultValue={v(at.conduta)} className="input" />
              </Field>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <SubmitButton className="btn-secondary">Salvar</SubmitButton>
              {!at.finalizado && (
                <SubmitButton name="finalizar" value="1">
                  Salvar e finalizar
                </SubmitButton>
              )}
            </div>
          </Card>
        </form>

        <div className="space-y-6">
          <Card
            title="Cobrança (vai para o caixa)"
            padded={false}
            actions={
              at.venda && (
                <Link href={`/vendas/${at.venda.id}`} className="link text-xs">
                  {vendaAberta ? "Receber no caixa →" : "Ver venda"}
                </Link>
              )
            }
          >
            {vendaAberta && (
              <form action={lancarItem.bind(null, id)} className="space-y-2 border-b border-slate-100 p-4">
                <Picker tipo="produtos" name="produtoId" placeholder="Serviço, produto ou medicamento…" required />
                <div className="flex items-center gap-2">
                  <input name="quantidade" defaultValue="1" className="input w-20" />
                  <label className="flex items-center gap-1 text-xs text-slate-600">
                    <input type="checkbox" name="fracionado" /> fracionado
                  </label>
                  <SubmitButton className="btn-primary ml-auto">Lançar</SubmitButton>
                </div>
              </form>
            )}
            {!at.venda || at.venda.itens.length === 0 ? (
              <Empty>Nenhum item lançado.</Empty>
            ) : (
              <Table>
                <tbody>
                  {at.venda.itens.map((i) => (
                    <tr key={i.id}>
                      <td>
                        {i.descricao}
                        <p className="text-xs text-slate-500">
                          {qtd(i.quantidade)} × {brl(i.valorUnit)}
                        </p>
                      </td>
                      <td className="text-right">{brl(i.total)}</td>
                      {vendaAberta && (
                        <td className="w-8">
                          <form action={removerItem.bind(null, id, i.id)}>
                            <button className="text-slate-400 hover:text-red-600">✕</button>
                          </form>
                        </td>
                      )}
                    </tr>
                  ))}
                  <tr>
                    <td className="font-semibold">Total</td>
                    <td className="text-right font-semibold">{brl(at.venda.total)}</td>
                    {vendaAberta && <td />}
                  </tr>
                </tbody>
              </Table>
            )}
          </Card>

          <Card title="Atendimentos anteriores" padded={false}>
            {anteriores.length === 0 ? (
              <Empty>Primeiro atendimento.</Empty>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {anteriores.map((a) => (
                  <li key={a.id} className="px-5 py-3">
                    <Link href={`/atendimentos/${a.id}`} className="link">
                      {dataHora(a.data)} · {a.tipo}
                    </Link>
                    {a.diagnostico && <p className="mt-0.5 line-clamp-2 text-slate-600">{a.diagnostico}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
