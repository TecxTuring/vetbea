import type { Produto } from "@prisma/client";
import { Field } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { inputDate, rotulo } from "@/lib/format";

export function ProdutoForm({ action, produto }: { action: (fd: FormData) => Promise<void>; produto?: Produto }) {
  const n = (v: unknown) => (v === null || v === undefined ? "" : String(Number(v)));
  return (
    <form action={action} className="card space-y-5 p-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Nome *" className="sm:col-span-2">
          <input name="nome" required defaultValue={produto?.nome} className="input" />
        </Field>
        <Field label="Tipo">
          <select name="tipo" defaultValue={produto?.tipo ?? "PRODUTO"} className="input">
            {["PRODUTO", "MEDICAMENTO", "VACINA", "SERVICO"].map((t) => (
              <option key={t} value={t}>
                {rotulo(t)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Categoria">
          <input name="categoria" defaultValue={produto?.categoria ?? ""} className="input" />
        </Field>
        <Field label="Código de barras">
          <input name="codigoBarras" defaultValue={produto?.codigoBarras ?? ""} className="input" />
        </Field>
        <Field label="Unidade">
          <input name="unidade" defaultValue={produto?.unidade ?? "UN"} className="input" />
        </Field>
        <Field label="Preço de custo">
          <input name="precoCusto" defaultValue={n(produto?.precoCusto)} className="input" />
        </Field>
        <Field label="Preço de venda">
          <input name="precoVenda" defaultValue={n(produto?.precoVenda)} className="input" />
        </Field>
        <Field label="Comissão (%)">
          <input name="comissaoPct" defaultValue={n(produto?.comissaoPct)} className="input" />
        </Field>
        <Field label="Estoque mínimo">
          <input name="estoqueMinimo" defaultValue={n(produto?.estoqueMinimo)} className="input" />
        </Field>
        {!produto && (
          <Field label="Estoque inicial">
            <input name="estoqueInicial" className="input" />
          </Field>
        )}
        <Field label="Validade (lote atual)">
          <input name="validade" type="date" defaultValue={inputDate(produto?.validade)} className="input" />
        </Field>
      </div>
      <div className="flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="controlaEstoque" defaultChecked={produto?.controlaEstoque ?? true} /> Controlar estoque
        </label>
        {produto && (
          <label className="flex items-center gap-2">
            <input type="hidden" name="temAtivo" value="1" />
            <input type="checkbox" name="ativo" defaultChecked={produto.ativo} /> Ativo
          </label>
        )}
      </div>
      <fieldset className="rounded-lg border border-slate-200 p-4">
        <legend className="px-1 text-sm font-medium text-slate-700">Fracionamento</legend>
        <p className="mb-3 text-xs text-slate-500">
          Venda parcial de um produto. Ex.: frasco de 50 ml vendido por ml → fator 50, unidade de fração &quot;ML&quot;. O
          preço da fração é calculado automaticamente.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="fracionavel" defaultChecked={produto?.fracionavel} /> Produto fracionável
          </label>
          <Field label="Unidade de fração">
            <input name="unidadeFracao" defaultValue={produto?.unidadeFracao ?? ""} placeholder="ML, COMP, G…" className="input" />
          </Field>
          <Field label="Frações por unidade">
            <input name="fatorFracao" defaultValue={n(produto?.fatorFracao)} className="input" />
          </Field>
        </div>
      </fieldset>
      <div className="flex justify-end">
        <SubmitButton>Salvar</SubmitButton>
      </div>
    </form>
  );
}
