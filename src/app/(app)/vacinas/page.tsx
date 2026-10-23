import Link from "next/link";
import { addDays, endOfDay, startOfDay } from "date-fns";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { data, telefone, whatsappLink } from "@/lib/format";
import { Card, Empty, PageHeader, Table, Tabs } from "@/components/ui";

export const metadata = { title: "Vacinas" };

export default async function Vacinas({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const s = await requireSession();
  const { aba = "proximas" } = await searchParams;
  const hoje = startOfDay(new Date());
  const where =
    aba === "atrasadas"
      ? { aplicadaEm: null, proximaDose: { lt: hoje } }
      : aba === "aplicadas"
        ? { aplicadaEm: { not: null, gte: addDays(hoje, -30) } }
        : { aplicadaEm: null, proximaDose: { gte: hoje, lte: endOfDay(addDays(hoje, 30)) } };

  const vacinas = await db.vacinaAplicada.findMany({
    where: { clinicaId: s.clinicaId, animal: { obito: false }, ...where },
    include: { animal: { include: { tutor: true } } },
    orderBy: aba === "aplicadas" ? { aplicadaEm: "desc" } : { proximaDose: "asc" },
    take: 200,
  });

  return (
    <>
      <PageHeader
        title="Vacinas"
        subtitle="Controle de doses previstas, atrasadas e aplicadas"
        actions={
          <Link href="/configuracoes/protocolos" className="btn-secondary">
            Protocolos de vacina
          </Link>
        }
      />
      <Tabs
        active={aba}
        tabs={[
          { key: "proximas", label: "Próximos 30 dias", href: "/vacinas" },
          { key: "atrasadas", label: "Atrasadas", href: "/vacinas?aba=atrasadas" },
          { key: "aplicadas", label: "Aplicadas (30 dias)", href: "/vacinas?aba=aplicadas" },
        ]}
      />
      <Card padded={false}>
        {vacinas.length === 0 ? (
          <Empty>Nada por aqui.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>{aba === "aplicadas" ? "Aplicada em" : "Previsão"}</th>
                <th>Animal</th>
                <th>Vacina</th>
                <th>Tutor</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {vacinas.map((v) => {
                const wa = whatsappLink(
                  v.animal.tutor.whatsapp ?? v.animal.tutor.telefone,
                  `Olá, ${v.animal.tutor.nome.split(" ")[0]}! Passando para lembrar que a vacina ${v.nome} de ${v.animal.nome} está prevista para ${data(v.proximaDose)}. Vamos agendar?`,
                );
                return (
                  <tr key={v.id}>
                    <td className={aba === "atrasadas" ? "font-medium text-red-600" : ""}>
                      {data(aba === "aplicadas" ? v.aplicadaEm : v.proximaDose)}
                    </td>
                    <td>
                      <Link href={`/animais/${v.animalId}?aba=vacinas`} className="link">
                        {v.animal.nome}
                      </Link>
                    </td>
                    <td>
                      {v.nome} {v.dose && <span className="text-slate-500">({v.dose})</span>}
                    </td>
                    <td>
                      {v.animal.tutor.nome}
                      <p className="text-xs text-slate-500">{telefone(v.animal.tutor.whatsapp ?? v.animal.tutor.telefone)}</p>
                    </td>
                    <td className="text-right">
                      {aba !== "aplicadas" && wa && (
                        <a href={wa} target="_blank" className="btn-secondary btn-sm">
                          Lembrar no WhatsApp
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
