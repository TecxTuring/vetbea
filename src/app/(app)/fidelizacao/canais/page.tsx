import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import { CopyButton } from "@/components/client";
import { FidelizacaoNav } from "../nav";

export const metadata = { title: "App do tutor e site" };

export default async function Canais() {
  const s = await requireSession();
  const [clinica, exemplo] = await Promise.all([
    db.clinica.findUniqueOrThrow({ where: { id: s.clinicaId } }),
    db.tutor.findFirst({ where: { clinicaId: s.clinicaId, animais: { some: {} } }, orderBy: { createdAt: "asc" } }),
  ]);
  return (
    <>
      <PageHeader title="Fidelização" />
      <FidelizacaoNav active="canais" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Portal / app do tutor">
          <p className="mb-4 text-sm text-slate-600">
            Cada cliente tem um link exclusivo (no cadastro do cliente) onde vê a carteira de vacinação, próximos
            agendamentos, resultados de exames, receitas, documentos e autorizações pendentes. Funciona no celular e pode
            ser adicionado à tela inicial como um app.
          </p>
          {exemplo && (
            <Link href={`/portal/${exemplo.portalToken}`} target="_blank" className="btn-secondary">
              Ver exemplo ({exemplo.nome})
            </Link>
          )}
        </Card>
        <Card title="Site grátis da clínica">
          <p className="mb-4 text-sm text-slate-600">
            Página pública com os dados da clínica, serviços e botão de agendamento pelo WhatsApp. Edite as informações em
            Configurações → Clínica.
          </p>
          <div className="flex gap-2">
            <Link href={`/site/${clinica.slug}`} target="_blank" className="btn-secondary">
              Abrir site
            </Link>
            <CopyButton text={`/site/${clinica.slug}`} />
            <Link href="/configuracoes" className="btn-ghost">
              Editar
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
}
