import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl, data, dataHora, idade, rotulo, telefone, whatsappLink } from "@/lib/format";
import { Badge, Card, corStatus, Empty, PageHeader, Table } from "@/components/ui";
import { CopyButton, SubmitButton } from "@/components/client";
import { adicionarCredito, quitarDebito } from "../actions";

export default async function Tutor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  const tutor = await db.tutor.findFirst({
    where: { id, clinicaId: s.clinicaId },
    include: {
      animais: { orderBy: { nome: "asc" } },
      vendas: { where: { status: "FINALIZADA" }, orderBy: { createdAt: "desc" }, take: 10 },
      contas: { where: { tipo: "RECEBER", status: "ABERTA" }, orderBy: { vencimento: "asc" } },
      mensagens: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  if (!tutor) notFound();

  const totalGasto = await db.venda.aggregate({
    where: { tutorId: id, status: "FINALIZADA" },
    _sum: { total: true },
  });
  const debito = tutor.contas.reduce((a, c) => a + Number(c.valor), 0);
  const wa = whatsappLink(tutor.whatsapp ?? tutor.telefone, `Olá, ${tutor.nome.split(" ")[0]}!`);

  return (
    <>
      <PageHeader
        title={tutor.nome}
        back="/clientes"
        subtitle={`Cliente desde ${data(tutor.createdAt)}`}
        actions={
          <>
            {wa && (
              <a href={wa} target="_blank" className="btn-secondary">
                WhatsApp
              </a>
            )}
            <Link href={`/clientes/${id}/editar`} className="btn-secondary">
              Editar
            </Link>
            <Link href={`/animais/novo?tutor=${id}`} className="btn-secondary">
              Novo animal
            </Link>
            <Link href={`/vendas/nova?tutor=${id}`} className="btn-primary">
              Nova venda
            </Link>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Animais" padded={false}>
            {tutor.animais.length === 0 ? (
              <Empty>Nenhum animal cadastrado.</Empty>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Espécie / raça</th>
                    <th>Idade</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {tutor.animais.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <Link href={`/animais/${a.id}`} className="link">
                          {a.nome}
                        </Link>
                        {a.obito && <Badge>Óbito</Badge>}
                      </td>
                      <td>
                        {a.especie} {a.raca && `· ${a.raca}`}
                      </td>
                      <td>{idade(a.dataNascimento)}</td>
                      <td className="text-right">
                        <Link href={`/atendimentos/novo?animal=${a.id}`} className="btn-ghost btn-sm">
                          Atender
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card title="Débitos em aberto" padded={false}>
            {tutor.contas.length === 0 ? (
              <Empty>Nenhum débito em aberto.</Empty>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Vencimento</th>
                    <th className="text-right">Valor</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {tutor.contas.map((c) => (
                    <tr key={c.id}>
                      <td>{c.descricao}</td>
                      <td className={c.vencimento < new Date() ? "text-red-600" : ""}>{data(c.vencimento)}</td>
                      <td className="text-right">{brl(c.valor)}</td>
                      <td>
                        <form action={quitarDebito.bind(null, c.id)} className="flex justify-end gap-2">
                          <select name="forma" className="input w-32 py-1 text-xs">
                            <option value="DINHEIRO">Dinheiro</option>
                            <option value="PIX">Pix</option>
                            <option value="DEBITO">Débito</option>
                            <option value="CREDITO">Crédito</option>
                          </select>
                          <SubmitButton className="btn-primary btn-sm">Receber</SubmitButton>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card title="Últimas compras" padded={false}>
            {tutor.vendas.length === 0 ? (
              <Empty>Nenhuma compra.</Empty>
            ) : (
              <Table>
                <tbody>
                  {tutor.vendas.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <Link href={`/vendas/${v.id}`} className="link">
                          {dataHora(v.finalizadaEm ?? v.createdAt)}
                        </Link>
                      </td>
                      <td className="text-right">{brl(v.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Contato">
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Telefone / WhatsApp</dt>
                <dd>
                  {telefone(tutor.telefone)} / {telefone(tutor.whatsapp)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">E-mail</dt>
                <dd>{tutor.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">CPF</dt>
                <dd>{tutor.cpf ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Endereço</dt>
                <dd>
                  {[tutor.endereco, tutor.bairro, tutor.cidade, tutor.uf].filter(Boolean).join(", ") || "—"}
                </dd>
              </div>
              {tutor.observacoes && (
                <div>
                  <dt className="text-xs text-slate-500">Observações</dt>
                  <dd className="whitespace-pre-line">{tutor.observacoes}</dd>
                </div>
              )}
            </dl>
          </Card>

          <Card title="Financeiro">
            <dl className="mb-4 grid grid-cols-3 gap-2 text-center text-sm">
              <div>
                <dt className="text-xs text-slate-500">Total gasto</dt>
                <dd className="font-semibold">{brl(totalGasto._sum.total)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Crédito</dt>
                <dd className="font-semibold text-emerald-700">{brl(tutor.saldoCredito)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Em débito</dt>
                <dd className={debito > 0 ? "font-semibold text-red-600" : "font-semibold"}>{brl(debito)}</dd>
              </div>
            </dl>
            <form action={adicionarCredito.bind(null, id)} className="flex gap-2">
              <input name="valor" placeholder="Valor" className="input" required />
              <select name="forma" className="input w-28">
                <option value="DINHEIRO">Dinheiro</option>
                <option value="PIX">Pix</option>
                <option value="DEBITO">Débito</option>
                <option value="CREDITO">Crédito</option>
              </select>
              <SubmitButton className="btn-secondary">+ Crédito</SubmitButton>
            </form>
          </Card>

          <Card title="Portal do tutor">
            <p className="mb-3 text-sm text-slate-500">
              Link exclusivo para o tutor ver vacinas, agendamentos, exames e documentos dos pets.
            </p>
            <div className="flex gap-2">
              <Link href={`/portal/${tutor.portalToken}`} target="_blank" className="btn-secondary btn-sm">
                Abrir portal
              </Link>
              <CopyButton text={`/portal/${tutor.portalToken}`} />
            </div>
          </Card>

          <Card title="Mensagens recentes" padded={false}>
            {tutor.mensagens.length === 0 ? (
              <Empty>Nenhuma mensagem.</Empty>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {tutor.mensagens.map((m) => (
                  <li key={m.id} className="px-5 py-2.5">
                    <div className="flex justify-between">
                      <span className="font-medium">{rotulo(m.tipo)}</span>
                      <Badge color={corStatus(m.status)}>{rotulo(m.status)}</Badge>
                    </div>
                    <p className="text-xs text-slate-500">{dataHora(m.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
