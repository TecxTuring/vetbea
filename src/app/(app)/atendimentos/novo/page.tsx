import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Field, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { Picker } from "@/components/picker";
import { novoAtendimento } from "../actions";

export const metadata = { title: "Novo atendimento" };

export default async function NovoAtendimento({ searchParams }: { searchParams: Promise<{ animal?: string }> }) {
  const s = await requireSession();
  const { animal: animalId } = await searchParams;
  const [animal, vets] = await Promise.all([
    animalId ? db.animal.findFirst({ where: { id: animalId, clinicaId: s.clinicaId } }) : null,
    db.usuario.findMany({
      where: { clinicaId: s.clinicaId, ativo: true, papel: { in: ["VETERINARIO", "ADMIN"] } },
      orderBy: { nome: "asc" },
    }),
  ]);
  return (
    <>
      <PageHeader title="Novo atendimento" back="/atendimentos" />
      <form action={novoAtendimento} className="card grid max-w-3xl gap-4 p-5 sm:grid-cols-3">
        <Field label="Animal *">
          <Picker tipo="animais" name="animalId" required initial={animal ? { id: animal.id, label: animal.nome } : null} />
        </Field>
        <Field label="Tipo">
          <select name="tipo" className="input">
            {["Consulta", "Retorno", "Emergência", "Vacinação", "Cirurgia", "Procedimento", "Teleconsulta"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Veterinário">
          <select name="veterinarioId" defaultValue={s.userId} className="input">
            {vets.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nome}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-3">
          <SubmitButton>Iniciar atendimento</SubmitButton>
        </div>
      </form>
    </>
  );
}
