import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { data, dataHora, hora, idade, rotulo, whatsappLink } from "@/lib/format";
import { Logo } from "@/components/logo";
import { Badge, corStatus } from "@/components/ui";

export const metadata = { title: "Meus pets" };

export default async function Portal({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const tutor = await db.tutor.findUnique({
    where: { portalToken: token },
    include: {
      clinica: true,
      animais: {
        where: { obito: false },
        include: {
          vacinas: { orderBy: [{ aplicadaEm: { sort: "desc", nulls: "first" } }, { proximaDose: "asc" }] },
          exames: { where: { status: "RESULTADO" }, orderBy: { resultadoEm: "desc" }, take: 5 },
          receitas: { orderBy: { data: "desc" }, take: 5 },
          documentos: { orderBy: { data: "desc" }, take: 5 },
          internacoes: {
            where: { status: "INTERNADO" },
            include: { solicitacoes: { where: { status: "PENDENTE" } }, evolucoes: { orderBy: { createdAt: "desc" }, take: 1 } },
          },
        },
      },
      agendamentos: {
        where: { inicio: { gte: new Date() }, status: { in: ["AGENDADO", "CONFIRMADO"] } },
        include: { animal: true },
        orderBy: { inicio: "asc" },
      },
    },
  });
  if (!tutor) notFound();
  const c = tutor.clinica;
  const wa = whatsappLink(c.telefone, `Olá! Sou ${tutor.nome} e gostaria de agendar um horário.`);

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-white pb-12 shadow-sm">
      <header className="bg-brand-800 px-5 pt-6 pb-10 text-white">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{c.nome}</p>
          <span className="text-xs opacity-70">powered by mapigo</span>
        </div>
        <h1 className="mt-4 text-2xl font-semibold">Olá, {tutor.nome.split(" ")[0]}! 👋</h1>
        <p className="text-sm text-brand-100">Aqui você acompanha a saúde dos seus pets.</p>
      </header>

      <div className="-mt-6 space-y-5 px-4">
        {wa && (
          <a href={wa} target="_blank" className="btn-accent w-full py-3 shadow-md">
            Agendar pelo WhatsApp
          </a>
        )}

        {tutor.agendamentos.length > 0 && (
          <section className="card p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">Próximos agendamentos</h2>
            {tutor.agendamentos.map((a) => (
              <p key={a.id} className="text-sm">
                📅 {data(a.inicio)} às {hora(a.inicio)} · {a.animal?.nome} · {rotulo(a.tipo)}
              </p>
            ))}
          </section>
        )}

        {tutor.animais.map((a) => {
          const proximas = a.vacinas.filter((v) => !v.aplicadaEm);
          const aplicadas = a.vacinas.filter((v) => v.aplicadaEm);
          return (
            <section key={a.id} className="card overflow-hidden">
              <div className="flex items-center gap-3 border-b border-slate-100 p-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-2xl">
                  {a.especie === "Felina" ? "🐱" : a.especie === "Canina" ? "🐶" : "🐾"}
                </span>
                <div>
                  <p className="text-lg font-semibold">{a.nome}</p>
                  <p className="text-xs text-slate-500">
                    {a.especie} · {a.raca ?? "SRD"} · {idade(a.dataNascimento)}
                  </p>
                </div>
              </div>

              {a.internacoes.map((i) => (
                <div key={i.id} className="border-b border-slate-100 bg-violet-50 p-4 text-sm">
                  <p className="font-semibold text-violet-800">🏥 {a.nome} está internado(a)</p>
                  {i.evolucoes[0] && <p className="mt-1 text-slate-700">Última atualização: {i.evolucoes[0].texto}</p>}
                  {i.solicitacoes.map((s) => (
                    <Link key={s.id} href={`/r/solicitacao/${s.token}`} className="btn-primary btn-sm mt-2">
                      Autorização pendente: {s.titulo}
                    </Link>
                  ))}
                </div>
              ))}

              <div className="space-y-4 p-4 text-sm">
                <div>
                  <h3 className="mb-1 font-semibold text-slate-700">💉 Vacinas</h3>
                  {proximas.map((v) => (
                    <p key={v.id} className="flex justify-between">
                      <span>{v.nome} {v.dose && `(${v.dose})`}</span>
                      <Badge color={v.proximaDose && v.proximaDose < new Date() ? "red" : "yellow"}>
                        {v.proximaDose && v.proximaDose < new Date() ? "Atrasada" : "Prevista"} {data(v.proximaDose)}
                      </Badge>
                    </p>
                  ))}
                  {aplicadas.slice(0, 8).map((v) => (
                    <p key={v.id} className="flex justify-between text-slate-600">
                      <span>{v.nome}</span>
                      <span>✓ {data(v.aplicadaEm)}</span>
                    </p>
                  ))}
                  {a.vacinas.length === 0 && <p className="text-slate-500">Nenhuma vacina registrada.</p>}
                </div>
                {a.exames.length > 0 && (
                  <div>
                    <h3 className="mb-1 font-semibold text-slate-700">🧪 Resultados de exames</h3>
                    {a.exames.map((e) => (
                      <details key={e.id} className="rounded bg-slate-50 p-2">
                        <summary className="cursor-pointer">
                          {e.nome} · {data(e.resultadoEm)} <Badge color={corStatus(e.status)}>Disponível</Badge>
                        </summary>
                        <p className="mt-2 whitespace-pre-line text-slate-700">{e.resultado}</p>
                      </details>
                    ))}
                  </div>
                )}
                {(a.receitas.length > 0 || a.documentos.length > 0) && (
                  <div>
                    <h3 className="mb-1 font-semibold text-slate-700">📄 Receitas e documentos</h3>
                    {a.receitas.map((r) => (
                      <details key={r.id} className="rounded bg-slate-50 p-2">
                        <summary className="cursor-pointer">Receita · {dataHora(r.data)}</summary>
                        <p className="mt-2 font-mono text-xs whitespace-pre-wrap">{r.conteudo}</p>
                      </details>
                    ))}
                    {a.documentos.map((d) => (
                      <details key={d.id} className="rounded bg-slate-50 p-2">
                        <summary className="cursor-pointer">
                          {d.titulo} · {data(d.data)}
                        </summary>
                        <p className="mt-2 text-xs whitespace-pre-wrap">{d.conteudo}</p>
                      </details>
                    ))}
                  </div>
                )}
              </div>
            </section>
          );
        })}
        <div className="pt-4 text-center opacity-60">
          <Logo />
        </div>
      </div>
    </div>
  );
}
