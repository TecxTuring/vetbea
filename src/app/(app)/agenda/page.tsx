import Link from "next/link";
import { addDays, endOfDay, format, startOfDay, subDays } from "date-fns";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmt, hora, inputDateTime, rotulo } from "@/lib/format";
import { Badge, Collapsible, corStatus, Field, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { Picker } from "@/components/picker";
import { criarAgendamento, iniciarAtendimento, mudarStatus } from "./actions";

export const metadata = { title: "Agenda" };

const HORA_INI = 7;
const HORA_FIM = 21;
const PX_POR_MIN = 1.2;

const TIPOS = ["CONSULTA", "RETORNO", "VACINA", "EXAME", "CIRURGIA", "BANHO_TOSA", "OUTRO"];

export default async function Agenda({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; vet?: string; novo?: string; conflito?: string; hora?: string }>;
}) {
  const s = await requireSession();
  const sp = await searchParams;
  const dia = sp.data ? new Date(sp.data + "T12:00:00") : new Date();
  const diaStr = format(dia, "yyyy-MM-dd");

  const [veterinarios, agendamentos] = await Promise.all([
    db.usuario.findMany({
      where: { clinicaId: s.clinicaId, ativo: true, papel: { in: ["VETERINARIO", "ADMIN", "AUXILIAR"] } },
      orderBy: { nome: "asc" },
    }),
    db.agendamento.findMany({
      where: {
        clinicaId: s.clinicaId,
        inicio: { gte: startOfDay(dia), lte: endOfDay(dia) },
        status: { not: "CANCELADO" },
        ...(sp.vet ? { veterinarioId: sp.vet } : {}),
      },
      include: { animal: true, tutor: true, atendimento: { select: { id: true } } },
      orderBy: { inicio: "asc" },
    }),
  ]);

  const colunas = [
    ...veterinarios.filter((v) => !sp.vet || v.id === sp.vet).map((v) => ({ id: v.id, nome: v.nome, cor: v.cor })),
    ...(!sp.vet && agendamentos.some((a) => !a.veterinarioId) ? [{ id: "", nome: "Sem profissional", cor: "#94a3b8" }] : []),
  ];

  const inicioPadrao = new Date(dia);
  inicioPadrao.setHours(sp.hora ? Number(sp.hora) : 9, 0, 0, 0);

  const qs = (d: Date) => `/agenda?data=${format(d, "yyyy-MM-dd")}${sp.vet ? `&vet=${sp.vet}` : ""}`;

  return (
    <>
      <PageHeader
        title="Agenda"
        subtitle={fmt(dia, "EEEE, d 'de' MMMM 'de' yyyy")}
        actions={
          <>
            <Link href={qs(subDays(dia, 1))} className="btn-secondary">
              ←
            </Link>
            <Link href={qs(new Date())} className="btn-secondary">
              Hoje
            </Link>
            <Link href={qs(addDays(dia, 1))} className="btn-secondary">
              →
            </Link>
            <form className="flex gap-2">
              <input type="date" name="data" defaultValue={diaStr} className="input w-40" />
              <select name="vet" defaultValue={sp.vet ?? ""} className="input w-44">
                <option value="">Todos os profissionais</option>
                {veterinarios.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nome}
                  </option>
                ))}
              </select>
              <button className="btn-secondary">Ir</button>
            </form>
          </>
        }
      />

      {sp.conflito && (
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Esse profissional já tem um agendamento nesse horário. Marque &quot;Permitir encaixe&quot; para agendar mesmo
          assim.
        </div>
      )}

      <Collapsible label="Novo agendamento" open={!!sp.novo || !!sp.conflito || !!sp.hora} className="mb-6">
        <form action={criarAgendamento} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Field label="Animal *" className="lg:col-span-2">
            <Picker tipo="animais" name="animalId" placeholder="Nome do pet ou tutor…" required />
          </Field>
          <Field label="Tipo">
            <select name="tipo" className="input">
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {rotulo(t)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Profissional">
            <select name="veterinarioId" defaultValue={sp.vet} className="input">
              <option value="">—</option>
              {veterinarios.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Início">
            <input
              type="datetime-local"
              name="inicio"
              required
              defaultValue={inputDateTime(inicioPadrao)}
              className="input"
            />
          </Field>
          <Field label="Duração">
            <select name="duracao" defaultValue="30" className="input">
              {[15, 30, 45, 60, 90, 120, 180].map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </select>
          </Field>
          <Field label="Observações" className="sm:col-span-2 lg:col-span-4">
            <input name="observacoes" className="input" />
          </Field>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" name="forcar" /> Permitir encaixe
          </label>
          <div className="flex items-end">
            <SubmitButton className="btn-primary w-full">Agendar</SubmitButton>
          </div>
        </form>
      </Collapsible>

      <div className="card overflow-x-auto">
        <div className="flex min-w-fit">
          {/* coluna de horários */}
          <div className="sticky left-0 z-10 w-14 shrink-0 border-r border-slate-200 bg-white">
            <div className="h-10 border-b border-slate-200" />
            {Array.from({ length: HORA_FIM - HORA_INI }).map((_, i) => (
              <div
                key={i}
                className="border-b border-slate-100 pr-2 text-right text-[11px] text-slate-400"
                style={{ height: 60 * PX_POR_MIN }}
              >
                {String(HORA_INI + i).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {colunas.map((col) => {
            const itens = agendamentos.filter((a) => (a.veterinarioId ?? "") === col.id);
            return (
              <div key={col.id || "sem"} className="w-64 min-w-56 flex-1 border-r border-slate-100 last:border-r-0">
                <div className="flex h-10 items-center gap-2 border-b border-slate-200 px-3 text-sm font-medium">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: col.cor }} />
                  <span className="truncate">{col.nome}</span>
                </div>
                <div className="relative" style={{ height: (HORA_FIM - HORA_INI) * 60 * PX_POR_MIN }}>
                  {Array.from({ length: HORA_FIM - HORA_INI }).map((_, i) => (
                    <Link
                      key={i}
                      href={`/agenda?data=${diaStr}&hora=${HORA_INI + i}${col.id ? `&vet=${col.id}` : ""}`}
                      className="block border-b border-slate-100 hover:bg-brand-50/40"
                      style={{ height: 60 * PX_POR_MIN }}
                      title="Agendar neste horário"
                    />
                  ))}
                  {itens.map((a) => {
                    const min = (a.inicio.getHours() - HORA_INI) * 60 + a.inicio.getMinutes();
                    const dur = Math.max((a.fim.getTime() - a.inicio.getTime()) / 60000, 20);
                    return (
                      <div
                        key={a.id}
                        className="group absolute right-1 left-1 overflow-hidden rounded-md border-l-4 bg-white px-2 py-1 text-xs shadow-sm ring-1 ring-slate-200 hover:z-10 hover:overflow-visible hover:shadow-lg"
                        style={{ top: min * PX_POR_MIN, minHeight: dur * PX_POR_MIN - 2, borderLeftColor: col.cor }}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold">
                            {hora(a.inicio)} {a.animal?.nome}
                          </span>
                          <Badge color={corStatus(a.status)}>{rotulo(a.status)}</Badge>
                        </div>
                        <p className="truncate text-slate-500">
                          {rotulo(a.tipo)} · {a.tutor?.nome}
                        </p>
                        <div className="mt-1 hidden flex-wrap gap-1 bg-white pb-1 group-hover:flex">
                          {a.observacoes && <p className="w-full text-slate-600">{a.observacoes}</p>}
                          {a.status === "AGENDADO" && (
                            <form action={mudarStatus.bind(null, a.id, "CONFIRMADO")}>
                              <button className="btn-secondary btn-sm">Confirmar</button>
                            </form>
                          )}
                          {["AGENDADO", "CONFIRMADO"].includes(a.status) && (
                            <form action={mudarStatus.bind(null, a.id, "AGUARDANDO")}>
                              <button className="btn-secondary btn-sm">Chegou</button>
                            </form>
                          )}
                          {a.animalId && !["CONCLUIDO", "FALTOU"].includes(a.status) && (
                            <form action={iniciarAtendimento.bind(null, a.id)}>
                              <button className="btn-primary btn-sm">
                                {a.atendimento ? "Abrir atendimento" : "Atender"}
                              </button>
                            </form>
                          )}
                          {["AGENDADO", "CONFIRMADO"].includes(a.status) && (
                            <>
                              <form action={mudarStatus.bind(null, a.id, "FALTOU")}>
                                <button className="btn-ghost btn-sm">Faltou</button>
                              </form>
                              <form action={mudarStatus.bind(null, a.id, "CANCELADO")}>
                                <button className="btn-ghost btn-sm text-red-600">Cancelar</button>
                              </form>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {colunas.length === 0 && (
            <p className="p-8 text-sm text-slate-500">Cadastre veterinários em Configurações → Usuários.</p>
          )}
        </div>
      </div>
    </>
  );
}
