import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { data, dataHora, idade, qtd, rotulo } from "@/lib/format";
import { Badge, Card, Collapsible, corStatus, Empty, Field, PageHeader, Table, Tabs } from "@/components/ui";
import { ModeloTextarea, SubmitButton } from "@/components/client";
import { ExameCard } from "@/components/exame-card";
import {
  aplicarDoseProgramada,
  aplicarProtocolo,
  criarDocumento,
  criarReceita,
  excluirVacina,
  registrarPeso,
  registrarVacina,
  solicitarExame,
} from "../actions";

const ABAS = [
  { key: "historico", label: "Histórico" },
  { key: "vacinas", label: "Vacinas" },
  { key: "exames", label: "Exames" },
  { key: "receitas", label: "Receitas" },
  { key: "documentos", label: "Documentos" },
  { key: "peso", label: "Peso" },
];

export default async function Prontuario({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aba?: string }>;
}) {
  const { id } = await params;
  const { aba = "historico" } = await searchParams;
  const s = await requireSession();
  const animal = await db.animal.findFirst({
    where: { id, clinicaId: s.clinicaId },
    include: { tutor: true },
  });
  if (!animal) notFound();

  const internado = await db.internacao.findFirst({ where: { animalId: id, status: "INTERNADO" } });

  return (
    <>
      <PageHeader
        back="/animais"
        title={
          <span className="flex items-center gap-3">
            {animal.nome}
            {animal.obito && <Badge>Óbito</Badge>}
            {internado && (
              <Link href={`/internacao/${internado.id}`}>
                <Badge color="purple">Internado</Badge>
              </Link>
            )}
          </span>
        }
        subtitle={
          <>
            {animal.especie} · {animal.raca ?? "SRD"} · {animal.sexo === "M" ? "Macho" : animal.sexo === "F" ? "Fêmea" : "—"}
            {animal.castrado && " castrado(a)"} · {idade(animal.dataNascimento)}
            {animal.peso && ` · ${qtd(animal.peso)} kg`} · Tutor:{" "}
            <Link href={`/clientes/${animal.tutorId}`} className="link">
              {animal.tutor.nome}
            </Link>
          </>
        }
        actions={
          <>
            <Link href={`/animais/${id}/editar`} className="btn-secondary">
              Editar
            </Link>
            <Link href={`/internacao/nova?animal=${id}`} className="btn-secondary">
              Internar
            </Link>
            <Link href={`/orcamentos/novo?animal=${id}`} className="btn-secondary">
              Orçamento
            </Link>
            <Link href={`/atendimentos/novo?animal=${id}`} className="btn-primary">
              Novo atendimento
            </Link>
          </>
        }
      />

      {animal.alergias && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          <strong>Alergias:</strong> {animal.alergias}
        </div>
      )}

      <Tabs active={aba} tabs={ABAS.map((a) => ({ ...a, href: `/animais/${id}?aba=${a.key}` }))} />

      {aba === "historico" && <Historico animalId={id} />}
      {aba === "vacinas" && <Vacinas animalId={id} especie={animal.especie} clinicaId={s.clinicaId} />}
      {aba === "exames" && <Exames animalId={id} />}
      {aba === "receitas" && <Receitas animalId={id} clinicaId={s.clinicaId} />}
      {aba === "documentos" && <Documentos animalId={id} clinicaId={s.clinicaId} />}
      {aba === "peso" && <Peso animalId={id} />}
    </>
  );
}

async function Historico({ animalId }: { animalId: string }) {
  const [atendimentos, vacinas, exames, receitas, documentos, internacoes] = await Promise.all([
    db.atendimento.findMany({ where: { animalId }, include: { veterinario: true } }),
    db.vacinaAplicada.findMany({ where: { animalId, aplicadaEm: { not: null } } }),
    db.exame.findMany({ where: { animalId } }),
    db.receita.findMany({ where: { animalId } }),
    db.documento.findMany({ where: { animalId } }),
    db.internacao.findMany({ where: { animalId } }),
  ]);

  type Ev = { data: Date; tipo: string; cor: string; titulo: React.ReactNode; texto?: string | null };
  const eventos: Ev[] = [
    ...atendimentos.map((a) => ({
      data: a.data,
      tipo: "Atendimento",
      cor: "brand",
      titulo: (
        <Link href={`/atendimentos/${a.id}`} className="link">
          {a.tipo} {a.veterinario && `· ${a.veterinario.nome}`}
        </Link>
      ),
      texto: [a.queixa && `Queixa: ${a.queixa}`, a.diagnostico && `Diagnóstico: ${a.diagnostico}`]
        .filter(Boolean)
        .join("\n"),
    })),
    ...vacinas.map((v) => ({
      data: v.aplicadaEm!,
      tipo: "Vacina",
      cor: "green",
      titulo: `${v.nome} ${v.dose ? `(${v.dose})` : ""}`,
      texto: v.lote ? `Lote ${v.lote}` : null,
    })),
    ...exames.map((e) => ({
      data: e.solicitadoEm,
      tipo: "Exame",
      cor: "yellow",
      titulo: `${e.nome} — ${rotulo(e.status)}`,
      texto: e.resultado,
    })),
    ...receitas.map((r) => ({
      data: r.data,
      tipo: "Receita",
      cor: "blue",
      titulo: (
        <Link href={`/animais/${animalId}/imprimir?receita=${r.id}`} className="link">
          Receita {r.controlada ? "controlada" : "simples"}
        </Link>
      ),
    })),
    ...documentos.map((d) => ({
      data: d.data,
      tipo: "Documento",
      cor: "gray",
      titulo: (
        <Link href={`/animais/${animalId}/imprimir?documento=${d.id}`} className="link">
          {d.titulo}
        </Link>
      ),
    })),
    ...internacoes.map((i) => ({
      data: i.entrada,
      tipo: "Internação",
      cor: "purple",
      titulo: (
        <Link href={`/internacao/${i.id}`} className="link">
          {i.motivo} — {rotulo(i.status)}
        </Link>
      ),
    })),
  ].sort((a, b) => b.data.getTime() - a.data.getTime());

  if (eventos.length === 0) return <Card><Empty>Nenhum registro ainda.</Empty></Card>;

  return (
    <Card>
      <ol className="relative space-y-6 border-l border-slate-200 pl-6">
        {eventos.map((e, i) => (
          <li key={i}>
            <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-brand-500" />
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge color={e.cor}>{e.tipo}</Badge>
              <span className="font-medium">{e.titulo}</span>
              <span className="text-xs text-slate-500">{dataHora(e.data)}</span>
            </div>
            {e.texto && <p className="mt-1 text-sm whitespace-pre-line text-slate-600">{e.texto}</p>}
          </li>
        ))}
      </ol>
    </Card>
  );
}

async function Vacinas({ animalId, especie, clinicaId }: { animalId: string; especie: string; clinicaId: string }) {
  const [vacinas, protocolos, produtos] = await Promise.all([
    db.vacinaAplicada.findMany({
      where: { animalId },
      include: { veterinario: true },
      orderBy: [{ aplicadaEm: { sort: "desc", nulls: "first" } }, { proximaDose: "asc" }],
    }),
    db.protocoloVacina.findMany({ where: { clinicaId, ativo: true }, orderBy: { nome: "asc" } }),
    db.produto.findMany({ where: { clinicaId, tipo: "VACINA", ativo: true }, orderBy: { nome: "asc" } }),
  ]);
  const programadas = vacinas.filter((v) => !v.aplicadaEm);
  const aplicadas = vacinas.filter((v) => v.aplicadaEm);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Collapsible label="Registrar vacina aplicada">
          <form action={registrarVacina.bind(null, animalId)} className="grid gap-3 sm:grid-cols-2">
            <Field label="Vacina do estoque">
              <select name="produtoId" className="input">
                <option value="">— não baixar estoque —</option>
                {produtos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} ({qtd(p.estoqueAtual)})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nome (se não for do estoque)">
              <input name="nome" className="input" />
            </Field>
            <Field label="Dose">
              <input name="dose" placeholder="1ª dose" className="input" />
            </Field>
            <Field label="Lote">
              <input name="lote" className="input" />
            </Field>
            <Field label="Aplicada em">
              <input name="aplicadaEm" type="date" className="input" />
            </Field>
            <Field label="Próxima dose">
              <input name="proximaDose" type="date" className="input" />
            </Field>
            <div className="sm:col-span-2">
              <SubmitButton>Registrar</SubmitButton>
            </div>
          </form>
        </Collapsible>
        <Collapsible label="Aplicar protocolo de vacinação">
          <form action={aplicarProtocolo.bind(null, animalId)} className="grid gap-3 sm:grid-cols-2">
            <Field label="Protocolo">
              <select name="protocoloId" required className="input">
                {protocolos
                  .sort((a, b) => Number(b.especie === especie) - Number(a.especie === especie))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} — {p.doses} dose(s)
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Data da 1ª dose">
              <input name="inicio" type="date" className="input" />
            </Field>
            <p className="text-xs text-slate-500 sm:col-span-2">
              Todas as doses e o reforço anual serão programados e o tutor receberá lembretes.
            </p>
            <div className="sm:col-span-2">
              <SubmitButton>Programar doses</SubmitButton>
            </div>
          </form>
        </Collapsible>
      </div>

      <Card title="Doses programadas" padded={false}>
        {programadas.length === 0 ? (
          <Empty>Nenhuma dose programada.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Vacina</th>
                <th>Dose</th>
                <th>Previsão</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {programadas.map((v) => (
                <tr key={v.id}>
                  <td>{v.nome}</td>
                  <td>{v.dose ?? "—"}</td>
                  <td className={v.proximaDose && v.proximaDose < new Date() ? "font-medium text-red-600" : ""}>
                    {data(v.proximaDose)}
                  </td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <form action={aplicarDoseProgramada.bind(null, v.id)} className="flex gap-2">
                        <input name="lote" placeholder="Lote" className="input w-24 py-1 text-xs" />
                        <SubmitButton className="btn-primary btn-sm">Aplicar</SubmitButton>
                      </form>
                      <form action={excluirVacina.bind(null, v.id)}>
                        <SubmitButton className="btn-ghost btn-sm" confirm="Remover esta dose programada?">
                          ✕
                        </SubmitButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card title="Carteira de vacinação" padded={false}>
        {aplicadas.length === 0 ? (
          <Empty>Nenhuma vacina aplicada.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Vacina</th>
                <th>Dose</th>
                <th>Lote</th>
                <th>Veterinário</th>
              </tr>
            </thead>
            <tbody>
              {aplicadas.map((v) => (
                <tr key={v.id}>
                  <td>{data(v.aplicadaEm)}</td>
                  <td>{v.nome}</td>
                  <td>{v.dose ?? "—"}</td>
                  <td>{v.lote ?? "—"}</td>
                  <td>{v.veterinario?.nome ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

async function Exames({ animalId }: { animalId: string }) {
  const exames = await db.exame.findMany({ where: { animalId }, orderBy: { solicitadoEm: "desc" } });
  return (
    <div className="space-y-6">
      <Collapsible label="Solicitar exame">
        <form action={solicitarExame.bind(null, animalId)} className="grid gap-3 sm:grid-cols-3">
          <Field label="Exame *">
            <input name="nome" required placeholder="Hemograma completo" className="input" />
          </Field>
          <Field label="Laboratório">
            <input name="laboratorio" className="input" />
          </Field>
          <Field label="Observações">
            <input name="observacoes" className="input" />
          </Field>
          <div>
            <SubmitButton>Solicitar</SubmitButton>
          </div>
        </form>
      </Collapsible>
      {exames.length === 0 ? (
        <Card>
          <Empty>Nenhum exame.</Empty>
        </Card>
      ) : (
        exames.map((e) => <ExameCard key={e.id} exame={e} />)
      )}
    </div>
  );
}

async function Receitas({ animalId, clinicaId }: { animalId: string; clinicaId: string }) {
  const [receitas, modelos] = await Promise.all([
    db.receita.findMany({ where: { animalId }, include: { veterinario: true }, orderBy: { data: "desc" } }),
    db.modeloDocumento.findMany({ where: { clinicaId, tipo: "RECEITA" }, orderBy: { nome: "asc" } }),
  ]);
  return (
    <div className="space-y-6">
      <Collapsible label="Nova receita">
        <form action={criarReceita.bind(null, animalId)} className="space-y-3">
          <ModeloTextarea modelos={modelos} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="controlada" /> Receita de controle especial (2 vias)
          </label>
          <SubmitButton>Salvar e imprimir</SubmitButton>
        </form>
      </Collapsible>
      <Card padded={false}>
        {receitas.length === 0 ? (
          <Empty>Nenhuma receita.</Empty>
        ) : (
          <Table>
            <tbody>
              {receitas.map((r) => (
                <tr key={r.id}>
                  <td>{dataHora(r.data)}</td>
                  <td>{r.controlada ? <Badge color="red">Controlada</Badge> : <Badge>Simples</Badge>}</td>
                  <td className="max-w-md truncate text-slate-600">{r.conteudo.split("\n").find(Boolean)}</td>
                  <td>{r.veterinario?.nome}</td>
                  <td className="text-right">
                    <Link href={`/animais/${animalId}/imprimir?receita=${r.id}`} className="btn-ghost btn-sm">
                      Imprimir
                    </Link>
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

async function Documentos({ animalId, clinicaId }: { animalId: string; clinicaId: string }) {
  const [docs, modelos] = await Promise.all([
    db.documento.findMany({ where: { animalId }, orderBy: { data: "desc" } }),
    db.modeloDocumento.findMany({ where: { clinicaId, tipo: "DOCUMENTO" }, orderBy: { nome: "asc" } }),
  ]);
  return (
    <div className="space-y-6">
      <Collapsible label="Novo documento">
        <form action={criarDocumento.bind(null, animalId)} className="space-y-3">
          <Field label="Título">
            <input name="titulo" required className="input" />
          </Field>
          <ModeloTextarea modelos={modelos} tituloName="titulo" rows={14} />
          <p className="text-xs text-slate-500">
            Variáveis como {"{{animal.nome}}"} e {"{{tutor.nome}}"} são preenchidas automaticamente.
          </p>
          <SubmitButton>Gerar e imprimir</SubmitButton>
        </form>
      </Collapsible>
      <Card padded={false}>
        {docs.length === 0 ? (
          <Empty>Nenhum documento.</Empty>
        ) : (
          <Table>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td>{dataHora(d.data)}</td>
                  <td className="font-medium">{d.titulo}</td>
                  <td className="text-right">
                    <Link href={`/animais/${animalId}/imprimir?documento=${d.id}`} className="btn-ghost btn-sm">
                      Imprimir
                    </Link>
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

async function Peso({ animalId }: { animalId: string }) {
  const pesos = await db.registroPeso.findMany({ where: { animalId }, orderBy: { data: "asc" } });
  const max = Math.max(...pesos.map((p) => Number(p.peso)), 1);
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card title="Curva de peso" className="lg:col-span-2">
        {pesos.length === 0 ? (
          <Empty>Nenhum registro de peso.</Empty>
        ) : (
          <div className="flex h-48 items-end gap-2">
            {pesos.map((p) => (
              <div key={p.id} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-medium">{qtd(p.peso)}</span>
                <div
                  className="w-full max-w-10 rounded-t bg-brand-500"
                  style={{ height: `${(Number(p.peso) / max) * 140}px` }}
                />
                <span className="text-[10px] text-slate-500">{data(p.data).slice(0, 5)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card title="Registrar peso">
        <form action={registrarPeso.bind(null, animalId)} className="space-y-3">
          <Field label="Peso (kg)">
            <input name="peso" required className="input" />
          </Field>
          <Field label="Data">
            <input name="data" type="date" className="input" />
          </Field>
          <SubmitButton>Registrar</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
