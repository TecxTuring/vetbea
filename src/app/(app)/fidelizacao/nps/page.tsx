import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { dataHora } from "@/lib/format";
import { Badge, Card, Empty, PageHeader, Stat, Table } from "@/components/ui";
import { FidelizacaoNav } from "../nav";

export const metadata = { title: "Pesquisa de satisfação" };

export default async function Nps() {
  const s = await requireSession();
  const [respostas, enviadas] = await Promise.all([
    db.pesquisaNps.findMany({
      where: { clinicaId: s.clinicaId, nota: { not: null } },
      include: { tutor: true },
      orderBy: { respondidaEm: "desc" },
      take: 200,
    }),
    db.pesquisaNps.count({ where: { clinicaId: s.clinicaId } }),
  ]);
  const n = respostas.length;
  const promotores = respostas.filter((r) => r.nota! >= 9).length;
  const detratores = respostas.filter((r) => r.nota! <= 6).length;
  const nps = n ? Math.round(((promotores - detratores) / n) * 100) : 0;
  const zona = nps >= 75 ? "Excelência" : nps >= 50 ? "Qualidade" : nps >= 0 ? "Aperfeiçoamento" : "Crítica";

  return (
    <>
      <PageHeader title="Fidelização" />
      <FidelizacaoNav active="nps" />
      <p className="mb-4 text-sm text-slate-600">
        A pesquisa é enviada automaticamente no dia seguinte ao atendimento (no máximo uma vez a cada 90 dias por cliente).
      </p>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="NPS" value={n ? nps : "—"} hint={n ? `Zona de ${zona}` : "Sem respostas"} tone={nps >= 50 ? "good" : nps >= 0 ? "warn" : "bad"} />
        <Stat label="Promotores (9–10)" value={n ? `${Math.round((promotores / n) * 100)}%` : "—"} tone="good" />
        <Stat label="Detratores (0–6)" value={n ? `${Math.round((detratores / n) * 100)}%` : "—"} tone="bad" />
        <Stat label="Taxa de resposta" value={enviadas ? `${Math.round((n / enviadas) * 100)}%` : "—"} hint={`${n} de ${enviadas}`} />
      </div>
      <Card title="Respostas" padded={false}>
        {n === 0 ? (
          <Empty>Nenhuma resposta ainda.</Empty>
        ) : (
          <Table>
            <tbody>
              {respostas.map((r) => (
                <tr key={r.id}>
                  <td className="w-16">
                    <Badge color={r.nota! >= 9 ? "green" : r.nota! >= 7 ? "yellow" : "red"}>{r.nota}</Badge>
                  </td>
                  <td>
                    <Link href={`/clientes/${r.tutorId}`} className="link">
                      {r.tutor.nome}
                    </Link>
                    {r.comentario && <p className="mt-1 text-sm text-slate-600">“{r.comentario}”</p>}
                  </td>
                  <td className="text-right text-xs text-slate-500">{dataHora(r.respondidaEm)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
