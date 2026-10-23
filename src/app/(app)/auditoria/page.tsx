import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { dataHora } from "@/lib/format";
import { Card, Empty, PageHeader, Table } from "@/components/ui";

export const metadata = { title: "Auditoria" };

export default async function Auditoria() {
  const s = await requireRole("ADMIN");
  const [registros, usuarios] = await Promise.all([
    db.auditoria.findMany({ where: { clinicaId: s.clinicaId }, orderBy: { createdAt: "desc" }, take: 300 }),
    db.usuario.findMany({ where: { clinicaId: s.clinicaId }, select: { id: true, nome: true } }),
  ]);
  const nome = new Map(usuarios.map((u) => [u.id, u.nome]));
  return (
    <>
      <PageHeader title="Auditoria" subtitle="Registro de quem fez o quê no sistema" />
      <Card padded={false}>
        {registros.length === 0 ? (
          <Empty>Nenhum registro.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Quando</th>
                <th>Usuário</th>
                <th>Ação</th>
                <th>Registro</th>
                <th>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">{dataHora(r.createdAt)}</td>
                  <td>{r.usuarioId ? nome.get(r.usuarioId) ?? "—" : "—"}</td>
                  <td>{r.acao}</td>
                  <td>{r.entidade}</td>
                  <td className="max-w-xs truncate text-slate-500">{r.detalhes ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
