import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { brl, data, qtd } from "@/lib/format";
import { Badge, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { finalizarInventario, salvarContagem } from "../../actions";

export default async function Inventario({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { id } = await params;
  const { q } = await searchParams;
  const s = await requireSession();
  const inv = await db.inventario.findFirst({
    where: { id, clinicaId: s.clinicaId },
    include: { itens: { include: { produto: true }, orderBy: { produto: { nome: "asc" } } } },
  });
  if (!inv) notFound();
  const itens = q
    ? inv.itens.filter((i) => i.produto.nome.toLowerCase().includes(q.toLowerCase()) || i.produto.codigoBarras === q)
    : inv.itens;
  const divergentes = inv.itens.filter((i) => Number(i.contado) !== Number(i.sistema));
  const impacto = divergentes.reduce((a, i) => a + (Number(i.contado) - Number(i.sistema)) * Number(i.produto.precoCusto), 0);

  return (
    <>
      <PageHeader
        back="/estoque/inventario"
        title={
          <span className="flex items-center gap-3">
            {inv.descricao} {inv.finalizado ? <Badge color="green">Finalizado</Badge> : <Badge color="yellow">Em contagem</Badge>}
          </span>
        }
        subtitle={`${data(inv.createdAt)} · ${divergentes.length} divergência(s) · impacto ${brl(impacto)}`}
      />
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Filtrar produto ou ler código de barras…" className="input" autoFocus />
        <button className="btn-secondary">Filtrar</button>
      </form>
      <form action={salvarContagem.bind(null, id)}>
        <div className="card divide-y divide-slate-100">
          {itens.map((i) => {
            const dif = Number(i.contado) - Number(i.sistema);
            return (
              <div key={i.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{i.produto.nome}</p>
                  <p className="text-xs text-slate-500">
                    Sistema: {qtd(i.sistema)} {i.produto.unidade}
                    {dif !== 0 && (
                      <span className={dif > 0 ? "ml-2 text-emerald-700" : "ml-2 text-red-600"}>
                        ({dif > 0 ? "+" : ""}
                        {qtd(dif)})
                      </span>
                    )}
                  </p>
                </div>
                <input
                  name={`c_${i.id}`}
                  defaultValue={String(Number(i.contado))}
                  inputMode="decimal"
                  disabled={inv.finalizado}
                  className="input w-24 text-right text-base"
                />
              </div>
            );
          })}
        </div>
        {!inv.finalizado && (
          <div className="sticky bottom-0 mt-4 flex gap-2 bg-[#f5f7f8] py-3">
            <SubmitButton className="btn-secondary flex-1">Salvar contagem</SubmitButton>
          </div>
        )}
      </form>
      {!inv.finalizado && (
        <form action={finalizarInventario.bind(null, id)} className="mt-2">
          <SubmitButton className="btn-accent w-full" confirm="Finalizar o inventário e ajustar o estoque? Salve a contagem antes.">
            Finalizar e ajustar estoque
          </SubmitButton>
        </form>
      )}
    </>
  );
}
