import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { ExameCard } from "@/components/exame-card";
import { Card, Empty, PageHeader, Tabs } from "@/components/ui";

export const metadata = { title: "Exames" };

export default async function Exames({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const s = await requireSession();
  const { aba = "pendentes" } = await searchParams;
  const exames = await db.exame.findMany({
    where: {
      clinicaId: s.clinicaId,
      status: aba === "pendentes" ? { in: ["SOLICITADO", "COLETADO"] } : { in: ["RESULTADO", "CANCELADO"] },
    },
    include: { animal: { select: { id: true, nome: true } } },
    orderBy: { solicitadoEm: "desc" },
    take: 100,
  });
  return (
    <>
      <PageHeader title="Exames" subtitle="Acompanhe solicitações e resultados. O tutor é avisado quando o resultado sai." />
      <Tabs
        active={aba}
        tabs={[
          { key: "pendentes", label: "Aguardando resultado", href: "/exames" },
          { key: "concluidos", label: "Concluídos", href: "/exames?aba=concluidos" },
        ]}
      />
      {exames.length === 0 ? (
        <Card>
          <Empty>Nenhum exame.</Empty>
        </Card>
      ) : (
        <div className="space-y-4">
          {exames.map((e) => (
            <ExameCard
              key={e.id}
              exame={e}
              extra={
                <Link href={`/animais/${e.animal.id}?aba=exames`} className="link text-xs">
                  {e.animal.nome}
                </Link>
              }
            />
          ))}
        </div>
      )}
    </>
  );
}
