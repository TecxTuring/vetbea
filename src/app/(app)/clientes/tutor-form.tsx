import type { Tutor } from "@prisma/client";
import { Field } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { inputDate } from "@/lib/format";
import { ESPECIES } from "@/lib/constantes";

export function TutorForm({
  action,
  tutor,
  comAnimal = false,
}: {
  action: (fd: FormData) => Promise<void>;
  tutor?: Tutor;
  comAnimal?: boolean;
}) {
  return (
    <form action={action} className="space-y-6">
      <div className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Dados do cliente</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Nome completo *" className="sm:col-span-2">
            <input name="nome" required defaultValue={tutor?.nome} className="input" />
          </Field>
          <Field label="CPF">
            <input name="cpf" defaultValue={tutor?.cpf ?? ""} className="input" />
          </Field>
          <Field label="Nascimento">
            <input name="dataNascimento" type="date" defaultValue={inputDate(tutor?.dataNascimento)} className="input" />
          </Field>
          <Field label="Telefone">
            <input name="telefone" defaultValue={tutor?.telefone ?? ""} className="input" />
          </Field>
          <Field label="WhatsApp">
            <input name="whatsapp" defaultValue={tutor?.whatsapp ?? ""} className="input" />
          </Field>
          <Field label="E-mail" className="sm:col-span-2">
            <input name="email" type="email" defaultValue={tutor?.email ?? ""} className="input" />
          </Field>
          <Field label="CEP">
            <input name="cep" defaultValue={tutor?.cep ?? ""} className="input" />
          </Field>
          <Field label="Endereço" className="sm:col-span-3">
            <input name="endereco" defaultValue={tutor?.endereco ?? ""} className="input" />
          </Field>
          <Field label="Bairro">
            <input name="bairro" defaultValue={tutor?.bairro ?? ""} className="input" />
          </Field>
          <Field label="Cidade">
            <input name="cidade" defaultValue={tutor?.cidade ?? ""} className="input" />
          </Field>
          <Field label="UF">
            <input name="uf" maxLength={2} defaultValue={tutor?.uf ?? ""} className="input uppercase" />
          </Field>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" name="aceitaMensagens" defaultChecked={tutor?.aceitaMensagens ?? true} />
            Aceita receber mensagens
          </label>
          <Field label="Observações" className="sm:col-span-2 lg:col-span-4">
            <textarea name="observacoes" rows={2} defaultValue={tutor?.observacoes ?? ""} className="input" />
          </Field>
        </div>
      </div>

      {comAnimal && (
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Primeiro animal (opcional)</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Nome do animal">
              <input name="animalNome" className="input" />
            </Field>
            <Field label="Espécie">
              <select name="animalEspecie" className="input">
                {ESPECIES.map((e) => (
                  <option key={e}>{e}</option>
                ))}
              </select>
            </Field>
            <Field label="Raça">
              <input name="animalRaca" className="input" />
            </Field>
            <Field label="Sexo">
              <select name="animalSexo" className="input">
                <option value="">—</option>
                <option value="M">Macho</option>
                <option value="F">Fêmea</option>
              </select>
            </Field>
            <Field label="Nascimento">
              <input name="animalNascimento" type="date" className="input" />
            </Field>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <SubmitButton>Salvar</SubmitButton>
      </div>
    </form>
  );
}
