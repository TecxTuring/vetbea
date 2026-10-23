import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { data, telefone } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { PrintButton } from "@/components/client";

export default async function Imprimir({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ receita?: string; documento?: string }>;
}) {
  const { id } = await params;
  const { receita: receitaId, documento: documentoId } = await searchParams;
  const s = await requireSession();
  const animal = await db.animal.findFirst({
    where: { id, clinicaId: s.clinicaId },
    include: { tutor: true, clinica: true },
  });
  if (!animal) notFound();

  let titulo = "";
  let conteudo = "";
  let dataDoc = new Date();
  let vias = 1;
  let veterinario: { nome: string; crmv: string | null } | null = null;

  if (receitaId) {
    const r = await db.receita.findFirst({ where: { id: receitaId, animalId: id }, include: { veterinario: true } });
    if (!r) notFound();
    titulo = r.controlada ? "RECEITUÁRIO DE CONTROLE ESPECIAL" : "RECEITUÁRIO";
    conteudo = r.conteudo;
    dataDoc = r.data;
    vias = r.controlada ? 2 : 1;
    veterinario = r.veterinario;
  } else if (documentoId) {
    const d = await db.documento.findFirst({ where: { id: documentoId, animalId: id } });
    if (!d) notFound();
    titulo = d.titulo;
    conteudo = d.conteudo;
    dataDoc = d.data;
  } else notFound();

  if (!veterinario) {
    veterinario = await db.usuario.findUnique({ where: { id: s.userId }, select: { nome: true, crmv: true } });
  }
  const c = animal.clinica;

  return (
    <>
      <PageHeader title={titulo} back={`/animais/${id}`} actions={<PrintButton />} />
      {Array.from({ length: vias }).map((_, via) => (
        <article
          key={via}
          className="print-area card mx-auto mb-8 max-w-3xl p-10 text-[15px] leading-relaxed break-after-page"
        >
          <header className="mb-6 flex items-start justify-between border-b-2 border-brand-600 pb-4">
            <div>
              <p className="text-xl font-bold text-brand-800">{c.nome}</p>
              <p className="text-xs text-slate-500">
                {[c.endereco, c.cidade, c.uf].filter(Boolean).join(" · ")}
                {c.telefone && ` · ${telefone(c.telefone)}`}
              </p>
            </div>
            {vias > 1 && <p className="text-xs text-slate-500">{via + 1}ª via {via === 0 ? "– farmácia" : "– paciente"}</p>}
          </header>
          {receitaId && (
            <section className="mb-6 grid grid-cols-2 gap-1 text-sm">
              <p>
                <strong>Paciente:</strong> {animal.nome} ({animal.especie}
                {animal.raca && `, ${animal.raca}`})
              </p>
              <p>
                <strong>Tutor:</strong> {animal.tutor.nome}
              </p>
              {animal.tutor.endereco && (
                <p className="col-span-2">
                  <strong>Endereço:</strong> {[animal.tutor.endereco, animal.tutor.cidade].filter(Boolean).join(", ")}
                </p>
              )}
            </section>
          )}
          <h2 className="mb-4 text-center font-semibold">{titulo}</h2>
          <div className="min-h-64 whitespace-pre-wrap">{conteudo}</div>
          <footer className="mt-16 text-center text-sm">
            <p>{data(dataDoc)}</p>
            <div className="mx-auto mt-10 w-72 border-t border-slate-400 pt-1">
              <p className="font-medium">{veterinario?.nome}</p>
              {veterinario?.crmv && <p className="text-xs">CRMV {veterinario.crmv}</p>}
            </div>
          </footer>
        </article>
      ))}
    </>
  );
}
