import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { brl, telefone, whatsappLink } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = await db.clinica.findUnique({ where: { slug } });
  return { title: { absolute: c?.nome ?? "Clínica veterinária" }, description: c?.sobre ?? undefined };
}

export default async function Site({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await db.clinica.findUnique({ where: { slug } });
  if (!c) notFound();
  const servicos = await db.produto.findMany({
    where: { clinicaId: c.id, tipo: { in: ["SERVICO", "VACINA"] }, ativo: true, precoVenda: { gt: 0 } },
    orderBy: [{ categoria: "asc" }, { nome: "asc" }],
    take: 30,
  });
  const wa = whatsappLink(c.telefone, "Olá! Gostaria de agendar um horário.");
  const vets = await db.usuario.findMany({ where: { clinicaId: c.id, papel: "VETERINARIO", ativo: true } });

  return (
    <div className="min-h-screen bg-white">
      <header className="relative overflow-hidden bg-brand-800 text-white">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <p className="text-sm tracking-widest text-brand-200 uppercase">Clínica veterinária</p>
          <h1 className="mt-2 text-4xl font-bold sm:text-5xl">{c.nome}</h1>
          <p className="mt-4 max-w-xl text-lg text-brand-100">
            {c.sobre ?? "Cuidado, carinho e medicina veterinária de qualidade para quem você ama."}
          </p>
          {wa && (
            <a href={wa} target="_blank" className="btn-accent mt-8 px-6 py-3 text-base">
              Agendar pelo WhatsApp
            </a>
          )}
        </div>
        <div className="pointer-events-none absolute -right-10 -bottom-16 text-[220px] opacity-10 select-none">🐾</div>
      </header>

      {servicos.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="mb-8 text-2xl font-semibold text-slate-800">Serviços</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {servicos.map((s) => (
              <div key={s.id} className="card p-5">
                <p className="text-xs text-brand-700">{s.categoria}</p>
                <p className="font-medium">{s.nome}</p>
                <p className="mt-2 text-sm text-slate-500">a partir de {brl(s.precoVenda)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {vets.length > 0 && (
        <section className="bg-slate-50">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <h2 className="mb-8 text-2xl font-semibold text-slate-800">Nossa equipe</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {vets.map((v) => (
                <div key={v.id} className="card p-5 text-center">
                  <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-2xl">🩺</div>
                  <p className="font-medium">{v.nome}</p>
                  {v.crmv && <p className="text-xs text-slate-500">CRMV {v.crmv}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="mx-auto max-w-5xl px-6 py-12 text-sm text-slate-600">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Contato</h2>
        {c.endereco && <p>📍 {[c.endereco, c.cidade, c.uf].filter(Boolean).join(", ")}</p>}
        {c.telefone && <p>📞 {telefone(c.telefone)}</p>}
        {c.email && <p>✉️ {c.email}</p>}
        <p className="mt-8 text-xs text-slate-400">Site criado com Mapigo</p>
      </footer>
    </div>
  );
}
