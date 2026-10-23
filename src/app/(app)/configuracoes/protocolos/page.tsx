import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { ESPECIES } from "@/lib/constantes";
import { Card, Collapsible, Field, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { ConfigNav } from "../nav";
import { salvarProtocolo } from "../actions";

export const metadata = { title: "Protocolos de vacina" };

type P = { id: string; nome: string; especie: string; vacina: string; doses: number; intervaloDias: number; reforcoDias: number; ativo: boolean };

function Campos({ p }: { p?: P }) {
  return (
    <>
      {p && <input type="hidden" name="id" value={p.id} />}
      <Field label="Nome do protocolo *">
        <input name="nome" required defaultValue={p?.nome} className="input" />
      </Field>
      <Field label="Espécie">
        <select name="especie" defaultValue={p?.especie ?? "Canina"} className="input">
          {ESPECIES.map((e) => (
            <option key={e}>{e}</option>
          ))}
        </select>
      </Field>
      <Field label="Vacina *">
        <input name="vacina" required defaultValue={p?.vacina} className="input" />
      </Field>
      <Field label="Nº de doses">
        <input name="doses" type="number" min={1} defaultValue={p?.doses ?? 1} className="input" />
      </Field>
      <Field label="Intervalo entre doses (dias)">
        <input name="intervaloDias" type="number" min={0} defaultValue={p?.intervaloDias ?? 21} className="input" />
      </Field>
      <Field label="Reforço após (dias)">
        <input name="reforcoDias" type="number" min={1} defaultValue={p?.reforcoDias ?? 365} className="input" />
      </Field>
    </>
  );
}

export default async function Protocolos() {
  const s = await requireSession();
  const protocolos = await db.protocoloVacina.findMany({ where: { clinicaId: s.clinicaId }, orderBy: [{ especie: "asc" }, { nome: "asc" }] });
  return (
    <>
      <PageHeader title="Configurações" />
      <ConfigNav active="protocolos" />
      <Collapsible label="Novo protocolo" className="mb-6">
        <form action={salvarProtocolo} className="grid gap-3 sm:grid-cols-3">
          <Campos />
          <div>
            <SubmitButton>Criar</SubmitButton>
          </div>
        </form>
      </Collapsible>
      <div className="space-y-3">
        {protocolos.map((p) => (
          <Card key={p.id} title={`${p.nome} · ${p.especie}`}>
            <form action={salvarProtocolo} className="grid gap-3 sm:grid-cols-3">
              <Campos p={p} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="ativo" defaultChecked={p.ativo} /> Ativo
              </label>
              <div>
                <SubmitButton className="btn-secondary">Salvar</SubmitButton>
              </div>
            </form>
          </Card>
        ))}
      </div>
    </>
  );
}
