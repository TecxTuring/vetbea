import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { FILTROS_CAMPANHA, publicoCampanha } from "@/lib/campanhas";
import { dataHora, rotulo } from "@/lib/format";
import { Card, Empty, Field, PageHeader, Table } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { FidelizacaoNav } from "../nav";
import { criarCampanha } from "../actions";

export const metadata = { title: "Campanhas" };

export default async function Campanhas() {
  const s = await requireSession();
  const [campanhas, contagens] = await Promise.all([
    db.campanha.findMany({ where: { clinicaId: s.clinicaId }, orderBy: { createdAt: "desc" } }),
    Promise.all(FILTROS_CAMPANHA.map((f) => db.tutor.count({ where: publicoCampanha(s.clinicaId, f.valor) }))),
  ]);
  return (
    <>
      <PageHeader title="Fidelização" />
      <FidelizacaoNav active="campanhas" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Nova campanha de marketing">
          <form action={criarCampanha} className="space-y-3">
            <Field label="Nome">
              <input name="nome" placeholder="Campanha de vacinação" className="input" />
            </Field>
            <Field label="Público">
              <select name="filtro" className="input">
                {FILTROS_CAMPANHA.map((f, i) => (
                  <option key={f.valor} value={f.valor}>
                    {f.rotulo} ({contagens[i]})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Canal">
              <select name="canal" className="input">
                <option value="SMS">SMS</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="EMAIL">E-mail</option>
              </select>
            </Field>
            <Field label="Mensagem">
              <textarea
                name="mensagem"
                rows={5}
                maxLength={480}
                required
                defaultValue="Olá, {{nome}}! Este mês a vacina V10 está com 15% de desconto. Agende já! 🐶"
                className="input"
              />
            </Field>
            <p className="text-xs text-slate-500">Use {"{{nome}}"} para o primeiro nome do cliente. Só recebem clientes que aceitam mensagens.</p>
            <SubmitButton>Disparar campanha</SubmitButton>
          </form>
        </Card>
        <Card title="Campanhas enviadas" padded={false} className="lg:col-span-2">
          {campanhas.length === 0 ? (
            <Empty>Nenhuma campanha.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Campanha</th>
                  <th>Canal</th>
                  <th>Público</th>
                  <th className="text-right">Destinatários</th>
                </tr>
              </thead>
              <tbody>
                {campanhas.map((c) => (
                  <tr key={c.id}>
                    <td>{dataHora(c.createdAt)}</td>
                    <td>
                      <p className="font-medium">{c.nome}</p>
                      <p className="max-w-sm truncate text-xs text-slate-500">{c.mensagem}</p>
                    </td>
                    <td>{rotulo(c.canal)}</td>
                    <td className="text-xs">{FILTROS_CAMPANHA.find((f) => f.valor === c.filtro)?.rotulo ?? c.filtro}</td>
                    <td className="text-right">{c.total}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
