import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { rotulo } from "@/lib/format";
import { Badge, Card, Collapsible, Field, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { ConfigNav } from "../nav";
import { salvarUsuario } from "../actions";

export const metadata = { title: "Usuários" };

const PAPEIS = ["ADMIN", "VETERINARIO", "AUXILIAR", "RECEPCAO", "FINANCEIRO"];

function UsuarioCampos({ u }: { u?: { id: string; nome: string; email: string; papel: string; crmv: string | null; cor: string; ativo: boolean } }) {
  return (
    <>
      {u && <input type="hidden" name="id" value={u.id} />}
      <Field label="Nome *">
        <input name="nome" required defaultValue={u?.nome} className="input" />
      </Field>
      <Field label="E-mail *">
        <input name="email" type="email" required defaultValue={u?.email} className="input" />
      </Field>
      <Field label="Perfil">
        <select name="papel" defaultValue={u?.papel ?? "VETERINARIO"} className="input">
          {PAPEIS.map((p) => (
            <option key={p} value={p}>
              {rotulo(p)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="CRMV">
        <input name="crmv" defaultValue={u?.crmv ?? ""} className="input" />
      </Field>
      <Field label="Cor na agenda">
        <input name="cor" type="color" defaultValue={u?.cor ?? "#0d9488"} className="input h-10 p-1" />
      </Field>
      <Field label={u ? "Nova senha (opcional)" : "Senha *"}>
        <input name="senha" type="password" minLength={8} required={!u} className="input" />
      </Field>
    </>
  );
}

export default async function Usuarios() {
  const s = await requireRole("ADMIN");
  const usuarios = await db.usuario.findMany({ where: { clinicaId: s.clinicaId }, orderBy: { nome: "asc" } });
  return (
    <>
      <PageHeader title="Configurações" />
      <ConfigNav active="usuarios" />
      <Collapsible label="Novo usuário" className="mb-6">
        <form action={salvarUsuario} className="grid gap-3 sm:grid-cols-3">
          <UsuarioCampos />
          <div>
            <SubmitButton>Criar usuário</SubmitButton>
          </div>
        </form>
      </Collapsible>
      <div className="space-y-3">
        {usuarios.map((u) => (
          <Card
            key={u.id}
            title={
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: u.cor }} />
                {u.nome} <Badge>{rotulo(u.papel)}</Badge> {!u.ativo && <Badge color="red">Inativo</Badge>}
              </span>
            }
          >
            <form action={salvarUsuario} className="grid gap-3 sm:grid-cols-3">
              <UsuarioCampos u={u} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="ativo" defaultChecked={u.ativo} /> Ativo
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
