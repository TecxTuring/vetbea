import Link from "next/link";
import { differenceInDays, subYears } from "date-fns";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { data, telefone, whatsappLink } from "@/lib/format";
import { Badge, Card, Empty, PageHeader, Stat, Table } from "@/components/ui";
import { FidelizacaoNav } from "../nav";

export const metadata = { title: "Frequência de retorno" };

type Fase = "NOVO" | "ATIVO" | "RISCO" | "INATIVO";
const FASES: Record<Fase, { rotulo: string; cor: string; descricao: string }> = {
  NOVO: { rotulo: "Novo", cor: "blue", descricao: "Apenas uma visita" },
  ATIVO: { rotulo: "Ativo", cor: "green", descricao: "Voltando no ritmo habitual" },
  RISCO: { rotulo: "Em risco", cor: "yellow", descricao: "Passou do intervalo habitual de retorno" },
  INATIVO: { rotulo: "Inativo", cor: "red", descricao: "Sem visitas há mais de 180 dias" },
};

export default async function Ciclo({ searchParams }: { searchParams: Promise<{ fase?: string }> }) {
  const s = await requireSession();
  const { fase = "RISCO" } = await searchParams;
  const desde = subYears(new Date(), 2);
  const [vendas, atendimentos, tutores] = await Promise.all([
    db.venda.findMany({
      where: { clinicaId: s.clinicaId, status: "FINALIZADA", tutorId: { not: null }, finalizadaEm: { gte: desde } },
      select: { tutorId: true, finalizadaEm: true },
    }),
    db.atendimento.findMany({
      where: { clinicaId: s.clinicaId, data: { gte: desde } },
      select: { data: true, animal: { select: { tutorId: true } } },
    }),
    db.tutor.findMany({ where: { clinicaId: s.clinicaId } }),
  ]);

  // visitas = dias distintos com venda ou atendimento
  const visitas = new Map<string, Set<string>>();
  const add = (tutorId: string, d: Date) => {
    const set = visitas.get(tutorId) ?? new Set<string>();
    set.add(d.toISOString().slice(0, 10));
    visitas.set(tutorId, set);
  };
  vendas.forEach((v) => add(v.tutorId!, v.finalizadaEm!));
  atendimentos.forEach((a) => add(a.animal.tutorId, a.data));

  const hoje = new Date();
  const linhas = tutores
    .filter((t) => visitas.has(t.id))
    .map((t) => {
      const dias = [...visitas.get(t.id)!].sort().map((d) => new Date(d + "T12:00:00"));
      const ultima = dias[dias.length - 1];
      const intervalos = dias.slice(1).map((d, i) => differenceInDays(d, dias[i]));
      const media = intervalos.length ? intervalos.reduce((a, b) => a + b, 0) / intervalos.length : null;
      const ausente = differenceInDays(hoje, ultima);
      let f: Fase;
      if (ausente > 180) f = "INATIVO";
      else if (!media) f = "NOVO";
      else if (ausente > Math.max(media * 1.5, 45)) f = "RISCO";
      else f = "ATIVO";
      return { t, visitas: dias.length, ultima, media, ausente, fase: f };
    });
  const contagem = (f: Fase) => linhas.filter((l) => l.fase === f).length;
  const lista = linhas.filter((l) => l.fase === fase).sort((a, b) => b.ausente - a.ausente);

  return (
    <>
      <PageHeader title="Fidelização" />
      <FidelizacaoNav active="ciclo" />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(Object.keys(FASES) as Fase[]).map((f) => (
          <Stat
            key={f}
            label={FASES[f].rotulo}
            value={contagem(f)}
            hint={FASES[f].descricao}
            href={`/fidelizacao/ciclo?fase=${f}`}
            tone={f === "ATIVO" ? "good" : f === "RISCO" ? "warn" : f === "INATIVO" ? "bad" : "default"}
          />
        ))}
      </div>
      <Card title={`Clientes: ${FASES[fase as Fase]?.rotulo ?? fase}`} padded={false}>
        {lista.length === 0 ? (
          <Empty>Nenhum cliente nesta fase.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th className="text-right">Visitas</th>
                <th className="text-right">Retorna a cada</th>
                <th>Última visita</th>
                <th className="text-right">Ausente há</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lista.map((l) => {
                const wa = whatsappLink(
                  l.t.whatsapp ?? l.t.telefone,
                  `Olá, ${l.t.nome.split(" ")[0]}! Sentimos sua falta por aqui. Que tal agendar um check-up para seu pet? 🐾`,
                );
                return (
                  <tr key={l.t.id}>
                    <td>
                      <Link href={`/clientes/${l.t.id}`} className="link">
                        {l.t.nome}
                      </Link>
                      <p className="text-xs text-slate-500">{telefone(l.t.whatsapp ?? l.t.telefone)}</p>
                    </td>
                    <td className="text-right">{l.visitas}</td>
                    <td className="text-right">{l.media ? `${Math.round(l.media)} dias` : "—"}</td>
                    <td>{data(l.ultima)}</td>
                    <td className="text-right">
                      <Badge color={FASES[l.fase].cor}>{l.ausente} dias</Badge>
                    </td>
                    <td className="text-right">
                      {wa && (
                        <a href={wa} target="_blank" className="btn-secondary btn-sm">
                          Chamar no WhatsApp
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
