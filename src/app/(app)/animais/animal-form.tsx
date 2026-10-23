import type { Animal } from "@prisma/client";
import { Field } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { ESPECIES } from "@/lib/constantes";
import { inputDate } from "@/lib/format";

export function AnimalForm({
  action,
  animal,
  tutores,
  tutorId,
}: {
  action: (fd: FormData) => Promise<void>;
  animal?: Animal;
  tutores?: { id: string; nome: string }[];
  tutorId?: string;
}) {
  return (
    <form action={action} className="card space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tutores && (
          <Field label="Tutor *" className="sm:col-span-2">
            <select name="tutorId" required defaultValue={tutorId} className="input">
              <option value="">Selecione…</option>
              {tutores.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Nome *" className={tutores ? "" : "sm:col-span-2"}>
          <input name="nome" required defaultValue={animal?.nome} className="input" />
        </Field>
        <Field label="Espécie">
          <select name="especie" defaultValue={animal?.especie ?? "Canina"} className="input">
            {ESPECIES.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </Field>
        <Field label="Raça">
          <input name="raca" defaultValue={animal?.raca ?? ""} className="input" />
        </Field>
        <Field label="Sexo">
          <select name="sexo" defaultValue={animal?.sexo ?? ""} className="input">
            <option value="">—</option>
            <option value="M">Macho</option>
            <option value="F">Fêmea</option>
          </select>
        </Field>
        <Field label="Nascimento">
          <input name="dataNascimento" type="date" defaultValue={inputDate(animal?.dataNascimento)} className="input" />
        </Field>
        <Field label="Peso (kg)">
          <input name="peso" defaultValue={animal?.peso ? Number(animal.peso) : ""} className="input" />
        </Field>
        <Field label="Pelagem">
          <input name="pelagem" defaultValue={animal?.pelagem ?? ""} className="input" />
        </Field>
        <Field label="Microchip">
          <input name="microchip" defaultValue={animal?.microchip ?? ""} className="input" />
        </Field>
        <div className="flex items-end gap-4 pb-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="castrado" defaultChecked={animal?.castrado} /> Castrado
          </label>
          {animal && (
            <label className="flex items-center gap-2">
              <input type="checkbox" name="obito" defaultChecked={animal.obito} /> Óbito
            </label>
          )}
        </div>
        <Field label="Alergias" className="sm:col-span-2">
          <input name="alergias" defaultValue={animal?.alergias ?? ""} className="input" />
        </Field>
        <Field label="Observações" className="sm:col-span-2 lg:col-span-4">
          <textarea name="observacoes" rows={2} defaultValue={animal?.observacoes ?? ""} className="input" />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton>Salvar</SubmitButton>
      </div>
    </form>
  );
}
