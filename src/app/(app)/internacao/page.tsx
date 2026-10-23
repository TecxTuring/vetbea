import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { dataHora, rotulo } from "@/lib/format";
import { Badge, Card, corStatus, Empty, PageHeader, Stat, Table } from "@/components/ui";

export const metadata = { title: "Internação" };

const ORDEM_TRIAGEM = ["EMERGENCIA", "MUITO_URGENTE", "URGENTE", "POUCO_URGENTE", "NAO_URGENTE"];
const COR_TRIAGEM: Record<string, string> = {
  EMERGENCIA: "#dc2626",
  MUITO_URGENTE: "#ea580c",
  URGENTE: "#ca8a04",
  POUCO_URGENTE: "#16a34a",
  NAO_URGENTE: "#2563eb",
};

export default async function Internacoes() {
  const s = await requireSession();
  const agora = new Date();
  const [internados, boxes, altas, atrasadas] = await Promise.all([
    db.internacao.findMany({
      where: { clinicaId: s.clinicaId, status: "INTERNADO" },
      include: {
        animal: { include: { tutor: true } },
        box: true,
        veterinario: true,
        prescricoes: { where: { ativa: true }, include: { aplicacoes: { where: { realizadoEm: null, previstoEm: { lte: new Date(agora.getTime() + 3600000) } } } } },
      },
    }),
    db.box.findMany({ where: { clinicaId: s.clinicaId, ativo: true }, orderBy: { nome: "asc" } }),
    db.internacao.findMany({
      where: { clinicaId: s.clinicaId, status: { not: "INTERNADO" } },
      include: { animal: true },
      orderBy: { saida: "desc" },
      take: 10,
    }),
    db.aplicacaoPrescricao.count({
      where: { realizadoEm: null, previstoEm: { lt: agora }, prescricao: { ativa: true, internacao: { clinicaId: s.clinicaId, status: "INTERNADO" } } },
    }),
  ]);
  internados.sort((a, b) => ORDEM_TRIAGEM.indexOf(a.triagem) - ORDEM_TRIAGEM.indexOf(b.triagem));
  const ocupacao = new Map(internados.filter((i) => i.boxId).map((i) => [i.boxId!, i]));

  return (
    <>
      <PageHeader
        title="Internação"
        subtitle="Mapa de boxes, triagem e controle de prescrições"
        actions={
          <>
            <Link href="/configuracoes/boxes" className="btn-secondary">
              Boxes e modelos
            </Link>
            <Link href="/internacao/nova" className="btn-primary">
              Nova internação
            </Link>
          </>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Internados" value={internados.length} />
        <Stat label="Boxes livres" value={`${boxes.length - ocupacao.size} de ${boxes.length}`} />
        <Stat label="Aplicações atrasadas" value={atrasadas} tone={atrasadas ? "bad" : "good"} />
        <Stat label="Emergências" value={internados.filter((i) => i.triagem === "EMERGENCIA").length} tone="bad" />
      </div>

      <Card title="Mapa de boxes" className="mb-6">
        {boxes.length === 0 ? (
          <Empty>Cadastre boxes em Configurações.</Empty>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {boxes.map((b) => {
              const i = ocupacao.get(b.id);
              return i ? (
                <Link
                  key={b.id}
                  href={`/internacao/${i.id}`}
                  className="rounded-lg border-2 bg-white p-3 transition hover:shadow-md"
                  style={{ borderColor: COR_TRIAGEM[i.triagem] }}
                >
                  <p className="text-xs text-slate-500">
                    {b.nome} · {b.tipo}
                  </p>
                  <p className="font-semibold">{i.animal.nome}</p>
                  <p className="truncate text-xs text-slate-600">{i.motivo}</p>
                </Link>
              ) : (
                <div key={b.id} className="rounded-lg border-2 border-dashed border-slate-200 p-3 text-slate-400">
                  <p className="text-xs">
                    {b.nome} · {b.tipo}
                  </p>
                  <p className="text-sm">Livre</p>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Pacientes internados (por triagem)" padded={false} className="mb-6">
        {internados.length === 0 ? (
          <Empty>Nenhum pet internado.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Triagem</th>
                <th>Paciente</th>
                <th>Box</th>
                <th>Motivo</th>
                <th>Tempo</th>
                <th>Pendências (1h)</th>
              </tr>
            </thead>
            <tbody>
              {internados.map((i) => {
                const pend = i.prescricoes.reduce((a, p) => a + p.aplicacoes.length, 0);
                return (
                  <tr key={i.id}>
                    <td>
                      <Badge color={corStatus(i.triagem)}>{rotulo(i.triagem)}</Badge>
                    </td>
                    <td>
                      <Link href={`/internacao/${i.id}`} className="link">
                        {i.animal.nome}
                      </Link>
                      <p className="text-xs text-slate-500">{i.animal.tutor.nome}</p>
                    </td>
                    <td>{i.box?.nome ?? "—"}</td>
                    <td className="max-w-xs truncate">{i.motivo}</td>
                    <td>{formatDistanceToNowStrict(i.entrada, { locale: ptBR })}</td>
                    <td>{pend > 0 ? <Badge color="orange">{pend} aplicação(ões)</Badge> : <span className="text-slate-400">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <Card title="Últimas saídas" padded={false}>
        {altas.length === 0 ? (
          <Empty>Nenhuma alta registrada.</Empty>
        ) : (
          <Table>
            <tbody>
              {altas.map((i) => (
                <tr key={i.id}>
                  <td>
                    <Link href={`/internacao/${i.id}`} className="link">
                      {i.animal.nome}
                    </Link>
                  </td>
                  <td>{i.motivo}</td>
                  <td>{dataHora(i.saida)}</td>
                  <td>
                    <Badge color={corStatus(i.status)}>{rotulo(i.status)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
