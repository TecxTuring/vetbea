import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { telefone } from "@/lib/format";
import { Card, Collapsible, Empty, Field, PageHeader, Table } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { EstoqueNav } from "../nav";
import { salvarFornecedor } from "../actions";

export const metadata = { title: "Fornecedores" };

export default async function Fornecedores() {
  const s = await requireSession();
  const fornecedores = await db.fornecedor.findMany({
    where: { clinicaId: s.clinicaId },
    include: { _count: { select: { pedidos: true } } },
    orderBy: { nome: "asc" },
  });
  return (
    <>
      <PageHeader title="Estoque" />
      <EstoqueNav active="fornecedores" />
      <Collapsible label="Novo fornecedor" className="mb-6">
        <form action={salvarFornecedor} className="grid gap-3 sm:grid-cols-3">
          <Field label="Nome *">
            <input name="nome" required className="input" />
          </Field>
          <Field label="CNPJ">
            <input name="cnpj" className="input" />
          </Field>
          <Field label="Contato">
            <input name="contato" className="input" />
          </Field>
          <Field label="Telefone">
            <input name="telefone" className="input" />
          </Field>
          <Field label="E-mail">
            <input name="email" type="email" className="input" />
          </Field>
          <div className="flex items-end">
            <SubmitButton>Salvar</SubmitButton>
          </div>
        </form>
      </Collapsible>
      <Card padded={false}>
        {fornecedores.length === 0 ? (
          <Empty>Nenhum fornecedor.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>CNPJ</th>
                <th>Contato</th>
                <th>Telefone</th>
                <th>E-mail</th>
                <th className="text-right">Pedidos</th>
              </tr>
            </thead>
            <tbody>
              {fornecedores.map((f) => (
                <tr key={f.id}>
                  <td className="font-medium">{f.nome}</td>
                  <td>{f.cnpj ?? "—"}</td>
                  <td>{f.contato ?? "—"}</td>
                  <td>{telefone(f.telefone)}</td>
                  <td>{f.email ?? "—"}</td>
                  <td className="text-right">{f._count.pedidos}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
