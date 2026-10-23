import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { rotulo } from "@/lib/format";
import { Field, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { Picker } from "@/components/picker";
import { internar } from "../actions";

export const metadata = { title: "Nova internação" };

export default async function NovaInternacao({ searchParams }: { searchParams: Promise<{ animal?: string }> }) {
  const s = await requireSession();
  const { animal: animalId } = await searchParams;
  const [animal, boxes, ocupados, vets, modelos] = await Promise.all([
    animalId ? db.animal.findFirst({ where: { id: animalId, clinicaId: s.clinicaId } }) : null,
    db.box.findMany({ where: { clinicaId: s.clinicaId, ativo: true }, orderBy: { nome: "asc" } }),
    db.internacao.findMany({ where: { clinicaId: s.clinicaId, status: "INTERNADO", boxId: { not: null } }, select: { boxId: true } }),
    db.usuario.findMany({ where: { clinicaId: s.clinicaId, ativo: true, papel: { in: ["VETERINARIO", "ADMIN"] } }, orderBy: { nome: "asc" } }),
    db.modeloPrescricao.findMany({ where: { clinicaId: s.clinicaId }, orderBy: { nome: "asc" } }),
  ]);
  const ocupadosSet = new Set(ocupados.map((o) => o.boxId));
  return (
    <>
      <PageHeader title="Nova internação" back="/internacao" />
      <form action={internar} className="card grid max-w-4xl gap-4 p-5 sm:grid-cols-2">
        <Field label="Paciente *">
          <Picker tipo="animais" name="animalId" required initial={animal ? { id: animal.id, label: animal.nome } : null} />
        </Field>
        <Field label="Triagem (classificação de risco)">
          <select name="triagem" defaultValue="NAO_URGENTE" className="input">
            {["EMERGENCIA", "MUITO_URGENTE", "URGENTE", "POUCO_URGENTE", "NAO_URGENTE"].map((t) => (
              <option key={t} value={t}>
                {rotulo(t)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Motivo da internação *" className="sm:col-span-2">
          <input name="motivo" required className="input" />
        </Field>
        <Field label="Box">
          <select name="boxId" className="input">
            <option value="">— sem box —</option>
            {boxes.map((b) => (
              <option key={b.id} value={b.id} disabled={ocupadosSet.has(b.id)}>
                {b.nome} ({b.tipo}){ocupadosSet.has(b.id) ? " — ocupado" : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Veterinário responsável">
          <select name="veterinarioId" defaultValue={s.userId} className="input">
            {vets.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nome}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Modelo de prescrição (opcional)" className="sm:col-span-2">
          <select name="modeloId" className="input">
            <option value="">—</option>
            {modelos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <SubmitButton>Internar</SubmitButton>
        </div>
      </form>
    </>
  );
}
