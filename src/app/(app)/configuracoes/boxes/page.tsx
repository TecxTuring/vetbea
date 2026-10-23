import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, Field, PageHeader, Table } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { ConfigNav } from "../nav";
import { salvarBox, salvarModeloPrescricao } from "../actions";

export const metadata = { title: "Boxes e modelos de prescrição" };

type Item = { medicamento: string; dose: string; via: string; frequenciaHoras: number };

export default async function Boxes() {
  const s = await requireSession();
  const [boxes, modelos] = await Promise.all([
    db.box.findMany({ where: { clinicaId: s.clinicaId }, orderBy: { nome: "asc" } }),
    db.modeloPrescricao.findMany({ where: { clinicaId: s.clinicaId }, orderBy: { nome: "asc" } }),
  ]);
  const texto = (itens: unknown) =>
    (itens as Item[]).map((i) => `${i.medicamento}; ${i.dose}; ${i.via}; ${i.frequenciaHoras}`).join("\n");
  return (
    <>
      <PageHeader title="Configurações" />
      <ConfigNav active="boxes" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Boxes de internação" padded={false}>
          <form action={salvarBox} className="flex items-end gap-2 border-b border-slate-100 p-4">
            <Field label="Nome" className="flex-1">
              <input name="nome" required className="input" />
            </Field>
            <Field label="Tipo">
              <input name="tipo" list="tipos-box" defaultValue="Geral" className="input w-32" />
              <datalist id="tipos-box">
                <option value="Geral" />
                <option value="Isolamento" />
                <option value="UTI" />
                <option value="Gatil" />
              </datalist>
            </Field>
            <SubmitButton>Adicionar</SubmitButton>
          </form>
          <Table>
            <tbody>
              {boxes.map((b) => (
                <tr key={b.id}>
                  <td colSpan={3}>
                    <form action={salvarBox} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={b.id} />
                      <input name="nome" defaultValue={b.nome} className="input py-1" />
                      <input name="tipo" defaultValue={b.tipo} className="input w-32 py-1" />
                      <label className="flex items-center gap-1 text-xs">
                        <input type="checkbox" name="ativo" defaultChecked={b.ativo} /> ativo
                      </label>
                      <SubmitButton className="btn-ghost btn-sm">Salvar</SubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <div className="space-y-4">
          <Card title="Novo modelo de prescrição">
            <form action={salvarModeloPrescricao} className="space-y-3">
              <Field label="Nome">
                <input name="nome" required className="input" />
              </Field>
              <Field label="Itens — um por linha: medicamento; dose; via; a cada N horas">
                <textarea name="itens" rows={4} required placeholder="Dipirona; 25 mg/kg; IV; 8" className="input font-mono text-xs" />
              </Field>
              <SubmitButton>Criar modelo</SubmitButton>
            </form>
          </Card>
          {modelos.map((m) => (
            <Card key={m.id} title={m.nome}>
              <form action={salvarModeloPrescricao} className="space-y-3">
                <input type="hidden" name="id" value={m.id} />
                <input name="nome" defaultValue={m.nome} className="input" />
                <textarea name="itens" rows={4} defaultValue={texto(m.itens)} className="input font-mono text-xs" />
                <SubmitButton className="btn-secondary">Salvar</SubmitButton>
              </form>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
