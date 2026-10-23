import Link from "next/link";
import type { StatusMensagem } from "@prisma/client";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { dataHora, rotulo, whatsappLink } from "@/lib/format";
import { Badge, Card, corStatus, Empty, PageHeader, Table } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { FidelizacaoNav } from "./nav";
import { descartarMensagem, gerarAgora, marcarEnviada } from "./actions";

export const metadata = { title: "Fidelização" };

export default async function Mensagens({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const s = await requireSession();
  const { status = "PENDENTE" } = await searchParams;
  const mensagens = await db.mensagem.findMany({
    where: { clinicaId: s.clinicaId, status: status as StatusMensagem },
    include: { tutor: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const automatico = !!process.env.WHATSAPP_WEBHOOK_URL;

  return (
    <>
      <PageHeader
        title="Fidelização"
        subtitle="Lembretes de agendamento e vacina, resultados de exames, aniversários e pesquisas de satisfação"
        actions={
          <form action={gerarAgora}>
            <SubmitButton className="btn-primary">Gerar lembretes de hoje</SubmitButton>
          </form>
        }
      />
      <FidelizacaoNav active="mensagens" />
      {!automatico && (
        <div className="mb-4 rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-800">
          Envio pelo WhatsApp Web: clique em <strong>Enviar</strong> para abrir a conversa com a mensagem pronta. Para envio
          100% automático, configure uma API de WhatsApp/SMS (veja o README).
        </div>
      )}
      <div className="mb-4 flex gap-2">
        {["PENDENTE", "ENVIADA", "ERRO"].map((st) => (
          <Link key={st} href={`/fidelizacao?status=${st}`} className={st === status ? "btn-primary btn-sm" : "btn-secondary btn-sm"}>
            {rotulo(st)}
          </Link>
        ))}
      </div>
      <Card padded={false}>
        {mensagens.length === 0 ? (
          <Empty>Nenhuma mensagem {rotulo(status).toLowerCase()}.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Criada</th>
                <th>Tipo</th>
                <th>Cliente</th>
                <th>Mensagem</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {mensagens.map((m) => {
                const wa = whatsappLink(m.tutor.whatsapp ?? m.tutor.telefone, m.conteudo);
                return (
                  <tr key={m.id}>
                    <td className="whitespace-nowrap">{dataHora(m.createdAt)}</td>
                    <td>
                      <Badge color="brand">{rotulo(m.tipo)}</Badge>
                      <p className="mt-1 text-xs text-slate-500">{rotulo(m.canal)}</p>
                    </td>
                    <td>
                      <Link href={`/clientes/${m.tutorId}`} className="link">
                        {m.tutor.nome}
                      </Link>
                    </td>
                    <td className="max-w-md text-xs text-slate-600">{m.conteudo}</td>
                    <td>
                      {m.status === "PENDENTE" ? (
                        <div className="flex justify-end gap-1">
                          {wa && m.canal !== "EMAIL" && (
                            <form action={marcarEnviada.bind(null, m.id)}>
                              <a href={wa} target="_blank" className="btn-primary btn-sm">
                                Enviar
                              </a>{" "}
                              <SubmitButton className="btn-secondary btn-sm">✓ Enviada</SubmitButton>
                            </form>
                          )}
                          <form action={descartarMensagem.bind(null, m.id)}>
                            <SubmitButton className="btn-ghost btn-sm">✕</SubmitButton>
                          </form>
                        </div>
                      ) : (
                        <Badge color={corStatus(m.status)}>{rotulo(m.status)}</Badge>
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
