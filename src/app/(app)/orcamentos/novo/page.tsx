import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Field, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { Picker } from "@/components/picker";
import { criarOrcamento } from "../actions";

export const metadata = { title: "Novo orçamento" };

export default async function NovoOrcamento({ searchParams }: { searchParams: Promise<{ animal?: string }> }) {
  const s = await requireSession();
  const { animal: animalId } = await searchParams;
  const animal = animalId ? await db.animal.findFirst({ where: { id: animalId, clinicaId: s.clinicaId } }) : null;
  return (
    <>
      <PageHeader title="Novo orçamento" back="/orcamentos" />
      <form action={criarOrcamento} className="card grid max-w-3xl gap-4 p-5 sm:grid-cols-2">
        <Field label="Animal">
          <Picker tipo="animais" name="animalId" initial={animal ? { id: animal.id, label: animal.nome } : null} />
        </Field>
        <Field label="ou Cliente (sem animal)">
          <Picker tipo="tutores" name="tutorId" />
        </Field>
        <Field label="Validade (dias)">
          <input name="validadeDias" defaultValue="15" className="input" />
        </Field>
        <Field label="Observações">
          <input name="observacoes" className="input" />
        </Field>
        <div className="sm:col-span-2">
          <SubmitButton>Criar orçamento</SubmitButton>
        </div>
      </form>
    </>
  );
}
