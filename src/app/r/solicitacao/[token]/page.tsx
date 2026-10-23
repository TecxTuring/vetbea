import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { brl, dataHora, rotulo } from "@/lib/format";
import { SubmitButton } from "@/components/client";
import { responderSolicitacao } from "../../actions";

export const metadata = { title: "Autorização" };

export default async function Solicitacao({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sol = await db.solicitacaoTutor.findUnique({
    where: { token },
    include: { internacao: { include: { animal: { include: { tutor: true } }, clinica: true } } },
  });
  if (!sol) notFound();
  const { animal, clinica } = sol.internacao;
  return (
    <div className="card w-full max-w-lg p-8">
      <p className="text-sm font-semibold text-brand-700">{clinica.nome}</p>
      <h1 className="mt-3 text-xl font-semibold">Solicitação de autorização — {animal.nome}</h1>
      <p className="mt-1 text-xs text-slate-500">{dataHora(sol.createdAt)}</p>
      <div className="my-5 rounded-lg bg-slate-50 p-4">
        <p className="font-medium">{sol.titulo}</p>
        <p className="mt-2 text-sm whitespace-pre-line text-slate-700">{sol.descricao}</p>
        {sol.valor && <p className="mt-3 text-sm">Valor estimado: <strong>{brl(sol.valor)}</strong></p>}
      </div>
      {sol.status === "PENDENTE" ? (
        <form action={responderSolicitacao.bind(null, token)} className="flex gap-3">
          <SubmitButton name="resposta" value="RECUSADA" className="btn-secondary flex-1">
            Não autorizo
          </SubmitButton>
          <SubmitButton name="resposta" value="APROVADA" className="btn-primary flex-1">
            Autorizo
          </SubmitButton>
        </form>
      ) : (
        <p className="text-center font-medium">
          Resposta registrada: {rotulo(sol.status)} em {dataHora(sol.respondidaEm)}. Obrigado, {animal.tutor.nome.split(" ")[0]}!
        </p>
      )}
    </div>
  );
}
