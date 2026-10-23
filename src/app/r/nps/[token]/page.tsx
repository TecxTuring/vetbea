import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SubmitButton } from "@/components/client";
import { responderNps } from "../../actions";

export const metadata = { title: "Como foi o atendimento?" };

export default async function Nps({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const p = await db.pesquisaNps.findUnique({ where: { token }, include: { clinica: true, tutor: true } });
  if (!p) notFound();
  return (
    <div className="card w-full max-w-lg p-8 text-center">
      <p className="text-sm font-semibold text-brand-700">{p.clinica.nome}</p>
      {p.respondidaEm ? (
        <>
          <h1 className="mt-4 text-2xl font-semibold">Obrigado! 💚</h1>
          <p className="mt-2 text-slate-600">Sua opinião ajuda a gente a cuidar cada vez melhor do seu pet.</p>
        </>
      ) : (
        <form action={responderNps.bind(null, token)}>
          <h1 className="mt-4 text-xl font-semibold">
            {p.tutor.nome.split(" ")[0]}, de 0 a 10, quanto você recomendaria a {p.clinica.nome} para um amigo?
          </h1>
          <div className="my-6 grid grid-cols-11 gap-1">
            {Array.from({ length: 11 }, (_, n) => (
              <label key={n} className="cursor-pointer">
                <input type="radio" name="nota" value={n} required className="peer sr-only" />
                <span
                  className={`block rounded-md border py-2 text-sm font-semibold transition peer-checked:text-white ${
                    n <= 6 ? "peer-checked:bg-red-500" : n <= 8 ? "peer-checked:bg-amber-500" : "peer-checked:bg-emerald-600"
                  } border-slate-300 hover:bg-slate-50`}
                >
                  {n}
                </span>
              </label>
            ))}
          </div>
          <textarea name="comentario" rows={3} placeholder="Quer contar algo mais? (opcional)" className="input mb-4" />
          <SubmitButton className="btn-primary w-full">Enviar</SubmitButton>
        </form>
      )}
    </div>
  );
}
