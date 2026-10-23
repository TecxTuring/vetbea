import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Field, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { ConfigNav } from "./nav";
import { salvarClinica } from "./actions";

export const metadata = { title: "Configurações" };

export default async function Configuracoes() {
  const s = await requireSession();
  const c = await db.clinica.findUniqueOrThrow({ where: { id: s.clinicaId } });
  return (
    <>
      <PageHeader title="Configurações" />
      <ConfigNav active="clinica" />
      <form action={salvarClinica} className="card grid max-w-4xl gap-4 p-5 sm:grid-cols-2">
        <Field label="Nome da clínica *">
          <input name="nome" required defaultValue={c.nome} className="input" />
        </Field>
        <Field label="CNPJ">
          <input name="cnpj" defaultValue={c.cnpj ?? ""} className="input" />
        </Field>
        <Field label="Telefone / WhatsApp">
          <input name="telefone" defaultValue={c.telefone ?? ""} className="input" />
        </Field>
        <Field label="E-mail">
          <input name="email" defaultValue={c.email ?? ""} className="input" />
        </Field>
        <Field label="Endereço" className="sm:col-span-2">
          <input name="endereco" defaultValue={c.endereco ?? ""} className="input" />
        </Field>
        <Field label="Cidade">
          <input name="cidade" defaultValue={c.cidade ?? ""} className="input" />
        </Field>
        <Field label="UF">
          <input name="uf" maxLength={2} defaultValue={c.uf ?? ""} className="input uppercase" />
        </Field>
        <Field label="Sobre a clínica (aparece no site)" className="sm:col-span-2">
          <textarea name="sobre" rows={3} defaultValue={c.sobre ?? ""} className="input" />
        </Field>
        <p className="text-xs text-slate-500 sm:col-span-2">Endereço do site: /site/{c.slug}</p>
        <div>
          <SubmitButton>Salvar</SubmitButton>
        </div>
      </form>
    </>
  );
}
