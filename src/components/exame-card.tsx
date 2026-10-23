import type { Exame } from "@prisma/client";
import { atualizarExame } from "@/app/(app)/animais/actions";
import { data, rotulo } from "@/lib/format";
import { Badge, Card, corStatus } from "./ui";
import { SubmitButton } from "./client";

export function ExameCard({
  exame: e,
  extra,
}: {
  exame: Exame;
  extra?: React.ReactNode;
}) {
  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          {e.nome} <Badge color={corStatus(e.status)}>{rotulo(e.status)}</Badge> {extra}
        </span>
      }
      actions={<span className="text-xs text-slate-500">Solicitado em {data(e.solicitadoEm)}</span>}
    >
      <form action={atualizarExame.bind(null, e.id)} className="space-y-3">
        <textarea
          name="resultado"
          rows={3}
          defaultValue={e.resultado ?? ""}
          placeholder="Resultado / laudo"
          className="input"
        />
        <div className="flex flex-wrap items-center gap-3">
          <select name="status" defaultValue={e.status} className="input w-48">
            <option value="SOLICITADO">Solicitado</option>
            <option value="COLETADO">Coletado</option>
            <option value="RESULTADO">Resultado disponível</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
          {!e.tutorNotificado && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="notificar" defaultChecked /> Avisar tutor quando houver resultado
            </label>
          )}
          {e.tutorNotificado && <span className="text-xs text-emerald-700">✓ Tutor notificado</span>}
          <SubmitButton className="btn-secondary">Atualizar</SubmitButton>
        </div>
      </form>
    </Card>
  );
}
