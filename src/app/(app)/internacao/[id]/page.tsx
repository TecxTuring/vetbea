import Link from "next/link";
import { notFound } from "next/navigation";
import { addHours, formatDistanceToNowStrict, startOfHour } from "date-fns";
import { ptBR } from "date-fns/locale";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl, dataHora, hora, idade, inputDateTime, qtd, rotulo } from "@/lib/format";
import { VIAS } from "@/lib/constantes";
import { Badge, Card, Collapsible, corStatus, Empty, Field, PageHeader, Table, Tabs } from "@/components/ui";
import { CopyButton, SubmitButton } from "@/components/client";
import {
  adicionarPrescricao,
  aplicarModelo,
  atualizarInternacao,
  criarSolicitacao,
  darAlta,
  desfazerAplicacao,
  lancarDiaria,
  registrarAplicacao,
  registrarEvolucao,
  registrarParametros,
  suspenderPrescricao,
} from "../actions";

const ABAS = [
  { key: "prescricoes", label: "Prescrições" },
  { key: "parametros", label: "Parâmetros clínicos" },
  { key: "evolucao", label: "Evolução / troca de turno" },
  { key: "solicitacoes", label: "Solicitações ao tutor" },
  { key: "alta", label: "Dados e alta" },
];

export default async function Internacao({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aba?: string }>;
}) {
  const { id } = await params;
  const { aba = "prescricoes" } = await searchParams;
  const s = await requireSession();
  const i = await db.internacao.findFirst({
    where: { id, clinicaId: s.clinicaId },
    include: { animal: { include: { tutor: true } }, box: true, veterinario: true },
  });
  if (!i) notFound();
  const ativa = i.status === "INTERNADO";

  return (
    <>
      <PageHeader
        back="/internacao"
        title={
          <span className="flex flex-wrap items-center gap-3">
            {i.animal.nome}
            <Badge color={corStatus(i.status)}>{rotulo(i.status)}</Badge>
            <Badge color={corStatus(i.triagem)}>{rotulo(i.triagem)}</Badge>
          </span>
        }
        subtitle={
          <>
            {i.animal.especie} · {i.animal.raca ?? "SRD"} · {idade(i.animal.dataNascimento)}
            {i.animal.peso && ` · ${qtd(i.animal.peso)} kg`} · {i.box?.nome ?? "sem box"} · internado há{" "}
            {formatDistanceToNowStrict(i.entrada, { locale: ptBR })} · Tutor:{" "}
            <Link href={`/clientes/${i.animal.tutorId}`} className="link">
              {i.animal.tutor.nome}
            </Link>
          </>
        }
        actions={
          <>
            <Link href={`/animais/${i.animalId}`} className="btn-secondary">
              Prontuário
            </Link>
            {ativa && (
              <form action={lancarDiaria.bind(null, id)}>
                <SubmitButton className="btn-secondary">Lançar diária</SubmitButton>
              </form>
            )}
          </>
        }
      />
      <div className="mb-4 rounded-lg bg-white px-4 py-3 text-sm ring-1 ring-slate-200">
        <strong>Motivo:</strong> {i.motivo}
        {i.animal.alergias && <span className="ml-4 text-red-600"><strong>Alergias:</strong> {i.animal.alergias}</span>}
      </div>
      <Tabs active={aba} tabs={ABAS.map((a) => ({ ...a, href: `/internacao/${id}?aba=${a.key}` }))} />

      {aba === "prescricoes" && <Prescricoes id={id} ativa={ativa} clinicaId={s.clinicaId} />}
      {aba === "parametros" && <Parametros id={id} ativa={ativa} />}
      {aba === "evolucao" && <Evolucao id={id} ativa={ativa} />}
      {aba === "solicitacoes" && <Solicitacoes id={id} ativa={ativa} />}
      {aba === "alta" && <Alta id={id} clinicaId={s.clinicaId} />}
    </>
  );
}

async function Prescricoes({ id, ativa, clinicaId }: { id: string; ativa: boolean; clinicaId: string }) {
  const agora = new Date();
  const inicioGrade = addHours(startOfHour(agora), -6);
  const fimGrade = addHours(inicioGrade, 24);
  const [prescricoes, modelos] = await Promise.all([
    db.prescricao.findMany({
      where: { internacaoId: id },
      include: { aplicacoes: { where: { previstoEm: { gte: inicioGrade, lt: fimGrade } }, orderBy: { previstoEm: "asc" } } },
      orderBy: [{ ativa: "desc" }, { inicio: "asc" }],
    }),
    db.modeloPrescricao.findMany({ where: { clinicaId }, orderBy: { nome: "asc" } }),
  ]);
  const horas = Array.from({ length: 24 }, (_, k) => addHours(inicioGrade, k));

  return (
    <div className="space-y-6">
      {ativa && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Collapsible label="Nova prescrição" className="lg:col-span-2">
            <form action={adicionarPrescricao.bind(null, id)} className="grid gap-3 sm:grid-cols-3">
              <Field label="Medicamento *">
                <input name="medicamento" required className="input" />
              </Field>
              <Field label="Dose *">
                <input name="dose" required placeholder="0,5 mg/kg" className="input" />
              </Field>
              <Field label="Via">
                <select name="via" className="input">
                  {VIAS.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label="A cada (horas) *">
                <input name="frequenciaHoras" required type="number" min={1} defaultValue={8} className="input" />
              </Field>
              <Field label="Início">
                <input name="inicio" type="datetime-local" defaultValue={inputDateTime(startOfHour(addHours(agora, 1)))} className="input" />
              </Field>
              <Field label="Fim (opcional)">
                <input name="fim" type="datetime-local" className="input" />
              </Field>
              <Field label="Observação" className="sm:col-span-2">
                <input name="observacao" className="input" />
              </Field>
              <div className="flex items-end">
                <SubmitButton className="btn-primary w-full">Prescrever</SubmitButton>
              </div>
            </form>
          </Collapsible>
          <Collapsible label="Usar modelo de prescrição">
            <form action={aplicarModelo.bind(null, id)} className="space-y-3">
              <select name="modeloId" className="input">
                {modelos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
              <SubmitButton className="btn-secondary w-full">Aplicar modelo</SubmitButton>
            </form>
          </Collapsible>
        </div>
      )}

      <Card title="Mapa de execução (24h)" padded={false}>
        {prescricoes.length === 0 ? (
          <Empty>Nenhuma prescrição.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="sticky left-0 min-w-56 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-600">Prescrição</th>
                  {horas.map((h) => (
                    <th
                      key={h.toISOString()}
                      className={`min-w-11 px-1 py-2 text-center font-medium ${h.getHours() === agora.getHours() && h.getDate() === agora.getDate() ? "bg-brand-100 text-brand-800" : "text-slate-500"}`}
                    >
                      {String(h.getHours()).padStart(2, "0")}h
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {prescricoes.map((p) => (
                  <tr key={p.id} className={`border-b border-slate-100 ${p.ativa ? "" : "opacity-50"}`}>
                    <td className="sticky left-0 bg-white px-3 py-2">
                      <p className="font-semibold">{p.medicamento}</p>
                      <p className="text-slate-500">
                        {p.dose} · {p.via} · a cada {p.frequenciaHoras}h
                      </p>
                      {p.observacao && <p className="text-slate-500 italic">{p.observacao}</p>}
                      {p.ativa && ativa && (
                        <form action={suspenderPrescricao.bind(null, id, p.id)}>
                          <SubmitButton className="mt-1 text-[11px] text-red-600 hover:underline" confirm="Suspender esta prescrição?">
                            Suspender
                          </SubmitButton>
                        </form>
                      )}
                    </td>
                    {horas.map((h) => {
                      const ap = p.aplicacoes.find((a) => a.previstoEm >= h && a.previstoEm < addHours(h, 1));
                      if (!ap) return <td key={h.toISOString()} />;
                      const feito = !!ap.realizadoEm;
                      const atrasado = !feito && ap.previstoEm < agora;
                      return (
                        <td key={h.toISOString()} className="px-0.5 py-1 text-center">
                          <form action={feito ? desfazerAplicacao.bind(null, id, ap.id) : registrarAplicacao.bind(null, id, ap.id)}>
                            <button
                              title={
                                feito
                                  ? `Aplicado ${hora(ap.realizadoEm!)} por ${ap.responsavel} (clique para desfazer)`
                                  : `Previsto ${hora(ap.previstoEm)} — clique para registrar`
                              }
                              className={`h-8 w-9 rounded text-[11px] font-semibold ${
                                feito
                                  ? "bg-emerald-500 text-white"
                                  : atrasado
                                    ? "bg-red-100 text-red-700 ring-1 ring-red-300"
                                    : "bg-slate-100 text-slate-600 hover:bg-brand-100"
                              }`}
                            >
                              {feito ? "✓" : hora(ap.previstoEm).slice(3) === "00" ? "●" : hora(ap.previstoEm).slice(3)}
                            </button>
                          </form>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="px-4 py-2 text-xs text-slate-500">
          Clique no horário para registrar a aplicação. Verde = aplicado · vermelho = atrasado · cinza = pendente.
        </p>
      </Card>
    </div>
  );
}

async function Parametros({ id, ativa }: { id: string; ativa: boolean }) {
  const params = await db.parametroClinico.findMany({ where: { internacaoId: id }, orderBy: { data: "desc" } });
  const temps = [...params].reverse().filter((p) => p.temperatura);
  return (
    <div className="space-y-6">
      {ativa && (
        <Card title="Registrar parâmetros">
          <form action={registrarParametros.bind(null, id)} className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Field label="Temp. (°C)">
              <input name="temperatura" className="input" />
            </Field>
            <Field label="FC (bpm)">
              <input name="fc" className="input" />
            </Field>
            <Field label="FR (mpm)">
              <input name="fr" className="input" />
            </Field>
            <Field label="PAS (mmHg)">
              <input name="pas" className="input" />
            </Field>
            <Field label="Glicemia">
              <input name="glicemia" className="input" />
            </Field>
            <Field label="TPC">
              <input name="tpc" className="input" />
            </Field>
            <Field label="Mucosas">
              <input name="mucosas" className="input" />
            </Field>
            <Field label="Hidratação">
              <input name="hidratacao" className="input" />
            </Field>
            <Field label="Dor (0–10)">
              <input name="dor" type="number" min={0} max={10} className="input" />
            </Field>
            <Field label="Observação">
              <input name="observacao" className="input" />
            </Field>
            <div className="col-span-2 sm:col-span-5">
              <SubmitButton>Registrar</SubmitButton>
            </div>
          </form>
        </Card>
      )}
      {temps.length > 1 && (
        <Card title="Temperatura">
          <svg viewBox={`0 0 ${Math.max(temps.length - 1, 1) * 60 + 40} 120`} className="h-32 w-full">
            {[37, 38, 39, 40].map((t) => (
              <g key={t}>
                <line x1="30" x2="100%" y1={110 - (t - 36) * 22} y2={110 - (t - 36) * 22} stroke="#e2e8f0" />
                <text x="0" y={114 - (t - 36) * 22} fontSize="10" fill="#94a3b8">
                  {t}°
                </text>
              </g>
            ))}
            <polyline
              fill="none"
              stroke="#0b8077"
              strokeWidth="2"
              points={temps.map((p, k) => `${30 + k * 60},${110 - (Number(p.temperatura) - 36) * 22}`).join(" ")}
            />
            {temps.map((p, k) => (
              <circle key={p.id} cx={30 + k * 60} cy={110 - (Number(p.temperatura) - 36) * 22} r="3" fill="#0b8077" />
            ))}
          </svg>
        </Card>
      )}
      <Card padded={false}>
        {params.length === 0 ? (
          <Empty>Nenhum registro.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Horário</th>
                <th>Temp.</th>
                <th>FC</th>
                <th>FR</th>
                <th>PAS</th>
                <th>Glic.</th>
                <th>TPC</th>
                <th>Mucosas</th>
                <th>Hidrat.</th>
                <th>Dor</th>
                <th>Obs. / resp.</th>
              </tr>
            </thead>
            <tbody>
              {params.map((p) => (
                <tr key={p.id}>
                  <td>{dataHora(p.data)}</td>
                  <td className={Number(p.temperatura) > 39.5 || (p.temperatura && Number(p.temperatura) < 37.5) ? "font-semibold text-red-600" : ""}>
                    {p.temperatura ? `${Number(p.temperatura)}°` : "—"}
                  </td>
                  <td>{p.fc ?? "—"}</td>
                  <td>{p.fr ?? "—"}</td>
                  <td>{p.pas ?? "—"}</td>
                  <td>{p.glicemia ?? "—"}</td>
                  <td>{p.tpc ?? "—"}</td>
                  <td>{p.mucosas ?? "—"}</td>
                  <td>{p.hidratacao ?? "—"}</td>
                  <td>{p.dor ?? "—"}</td>
                  <td className="text-xs">
                    {p.observacao}
                    <p className="text-slate-500">{p.responsavel}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

async function Evolucao({ id, ativa }: { id: string; ativa: boolean }) {
  const evolucoes = await db.evolucao.findMany({ where: { internacaoId: id }, orderBy: { createdAt: "desc" } });
  return (
    <div className="space-y-6">
      {ativa && (
        <Card title="Nova anotação">
          <form action={registrarEvolucao.bind(null, id)} className="space-y-3">
            <textarea
              name="texto"
              rows={4}
              required
              placeholder="Estado geral, intercorrências, alimentação, pendências para o próximo plantão…"
              className="input"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="trocaTurno" /> Passagem de plantão (troca de turno)
              </label>
              <SubmitButton>Registrar</SubmitButton>
            </div>
          </form>
        </Card>
      )}
      <Card>
        {evolucoes.length === 0 ? (
          <Empty>Nenhuma anotação.</Empty>
        ) : (
          <ol className="space-y-5">
            {evolucoes.map((e) => (
              <li key={e.id} className={`rounded-lg p-3 ${e.trocaTurno ? "border border-amber-200 bg-amber-50" : "bg-slate-50"}`}>
                <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
                  {e.trocaTurno && <Badge color="yellow">Troca de turno</Badge>}
                  {dataHora(e.createdAt)} · {e.responsavel}
                </div>
                <p className="text-sm whitespace-pre-line">{e.texto}</p>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}

async function Solicitacoes({ id, ativa }: { id: string; ativa: boolean }) {
  const sols = await db.solicitacaoTutor.findMany({ where: { internacaoId: id }, orderBy: { createdAt: "desc" } });
  return (
    <div className="space-y-6">
      {ativa && (
        <Card title="Nova solicitação ao tutor">
          <form action={criarSolicitacao.bind(null, id)} className="grid gap-3 sm:grid-cols-4">
            <Field label="Título *" className="sm:col-span-2">
              <input name="titulo" required placeholder="Realizar ultrassonografia abdominal" className="input" />
            </Field>
            <Field label="Valor estimado">
              <input name="valor" className="input" />
            </Field>
            <div />
            <Field label="Descrição *" className="sm:col-span-4">
              <textarea name="descricao" rows={3} required className="input" />
            </Field>
            <div>
              <SubmitButton>Enviar ao tutor</SubmitButton>
            </div>
          </form>
          <p className="mt-2 text-xs text-slate-500">
            O tutor recebe um link para autorizar ou recusar. A resposta aparece aqui automaticamente.
          </p>
        </Card>
      )}
      <Card padded={false}>
        {sols.length === 0 ? (
          <Empty>Nenhuma solicitação.</Empty>
        ) : (
          <Table>
            <tbody>
              {sols.map((sol) => (
                <tr key={sol.id}>
                  <td>
                    <p className="font-medium">{sol.titulo}</p>
                    <p className="text-xs text-slate-500">{sol.descricao}</p>
                  </td>
                  <td>{sol.valor ? brl(sol.valor) : "—"}</td>
                  <td>{dataHora(sol.createdAt)}</td>
                  <td>
                    <Badge color={corStatus(sol.status)}>{rotulo(sol.status)}</Badge>
                    {sol.respondidaEm && <p className="text-xs text-slate-500">{dataHora(sol.respondidaEm)}</p>}
                  </td>
                  <td className="text-right">
                    <CopyButton text={`/r/solicitacao/${sol.token}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

async function Alta({ id, clinicaId }: { id: string; clinicaId: string }) {
  const [i, boxes] = await Promise.all([
    db.internacao.findUniqueOrThrow({ where: { id } }),
    db.box.findMany({ where: { clinicaId, ativo: true }, orderBy: { nome: "asc" } }),
  ]);
  const ativa = i.status === "INTERNADO";
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Dados da internação">
        <form action={atualizarInternacao.bind(null, id)} className="space-y-3">
          <Field label="Motivo">
            <input name="motivo" defaultValue={i.motivo} disabled={!ativa} className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Triagem">
              <select name="triagem" defaultValue={i.triagem} disabled={!ativa} className="input">
                {["EMERGENCIA", "MUITO_URGENTE", "URGENTE", "POUCO_URGENTE", "NAO_URGENTE"].map((t) => (
                  <option key={t} value={t}>
                    {rotulo(t)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Box">
              <select name="boxId" defaultValue={i.boxId ?? ""} disabled={!ativa} className="input">
                <option value="">—</option>
                {boxes.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nome}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <p className="text-xs text-slate-500">Entrada: {dataHora(i.entrada)}</p>
          {ativa && <SubmitButton className="btn-secondary">Salvar</SubmitButton>}
        </form>
      </Card>
      <Card title={ativa ? "Encerrar internação" : "Resumo da saída"}>
        {ativa ? (
          <form action={darAlta.bind(null, id)} className="space-y-3">
            <Field label="Tipo de saída">
              <select name="status" className="input">
                <option value="ALTA">Alta médica</option>
                <option value="TRANSFERIDO">Transferência</option>
                <option value="OBITO">Óbito</option>
              </select>
            </Field>
            <Field label="Resumo / orientações">
              <textarea name="resumoAlta" rows={5} className="input" />
            </Field>
            <SubmitButton className="btn-accent" confirm="Encerrar a internação?">
              Confirmar
            </SubmitButton>
          </form>
        ) : (
          <div className="text-sm">
            <p className="mb-2">
              <Badge color={corStatus(i.status)}>{rotulo(i.status)}</Badge> em {dataHora(i.saida)}
            </p>
            <p className="whitespace-pre-line text-slate-700">{i.resumoAlta ?? "Sem resumo."}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
