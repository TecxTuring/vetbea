import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { VARIAVEIS_MODELO } from "@/lib/template";
import { Badge, Card, Collapsible, Field, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { ConfigNav } from "../nav";
import { excluirModelo, salvarModelo } from "../actions";

export const metadata = { title: "Modelos" };

export default async function Modelos() {
  const s = await requireSession();
  const modelos = await db.modeloDocumento.findMany({ where: { clinicaId: s.clinicaId }, orderBy: [{ tipo: "asc" }, { nome: "asc" }] });
  const campos = (m?: (typeof modelos)[number]) => (
    <>
      {m && <input type="hidden" name="id" value={m.id} />}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Nome *" className="sm:col-span-2">
          <input name="nome" required defaultValue={m?.nome} className="input" />
        </Field>
        <Field label="Tipo">
          <select name="tipo" defaultValue={m?.tipo ?? "RECEITA"} className="input">
            <option value="RECEITA">Receita</option>
            <option value="DOCUMENTO">Documento / termo / atestado</option>
          </select>
        </Field>
      </div>
      <textarea name="conteudo" rows={8} required defaultValue={m?.conteudo} className="input font-mono text-[13px]" />
    </>
  );
  return (
    <>
      <PageHeader title="Configurações" />
      <ConfigNav active="modelos" />
      <p className="mb-4 text-xs text-slate-500">
        Variáveis disponíveis: {VARIAVEIS_MODELO.map((v) => `{{${v}}}`).join(" · ")}
      </p>
      <Collapsible label="Novo modelo" className="mb-6">
        <form action={salvarModelo} className="space-y-3">
          {campos()}
          <SubmitButton>Criar modelo</SubmitButton>
        </form>
      </Collapsible>
      <div className="space-y-3">
        {modelos.map((m) => (
          <Collapsible
            key={m.id}
            label={
              <span className="flex items-center gap-2">
                {m.nome} <Badge color={m.tipo === "RECEITA" ? "blue" : "gray"}>{m.tipo === "RECEITA" ? "Receita" : "Documento"}</Badge>
              </span>
            }
          >
            <form action={salvarModelo} className="space-y-3">
              {campos(m)}
              <div className="flex gap-2">
                <SubmitButton className="btn-secondary">Salvar</SubmitButton>
              </div>
            </form>
            <form action={excluirModelo.bind(null, m.id)} className="mt-2">
              <SubmitButton className="btn-ghost btn-sm text-red-600" confirm="Excluir este modelo?">
                Excluir
              </SubmitButton>
            </form>
          </Collapsible>
        ))}
      </div>
      {modelos.length === 0 && <Card><p className="text-sm text-slate-500">Nenhum modelo.</p></Card>}
    </>
  );
}
