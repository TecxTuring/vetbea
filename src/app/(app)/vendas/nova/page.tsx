import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Field, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/client";
import { Picker } from "@/components/picker";
import { novaVenda } from "../actions";

export const metadata = { title: "Nova venda" };

export default async function NovaVenda({ searchParams }: { searchParams: Promise<{ tutor?: string }> }) {
  const s = await requireSession();
  const { tutor: tutorId } = await searchParams;
  const tutor = tutorId ? await db.tutor.findFirst({ where: { id: tutorId, clinicaId: s.clinicaId } }) : null;
  const caixa = await db.caixa.findFirst({ where: { clinicaId: s.clinicaId, fechadoEm: null } });
  return (
    <>
      <PageHeader title="Nova venda" back="/vendas" />
      {!caixa && (
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Nenhum caixa aberto. Você pode vender, mas recomendamos abrir o caixa em <a href="/caixa" className="link">Caixa</a>.
        </div>
      )}
      <form action={novaVenda} className="card flex max-w-xl flex-col gap-4 p-5">
        <Field label="Cliente (opcional)">
          <Picker tipo="tutores" name="tutorId" initial={tutor ? { id: tutor.id, label: tutor.nome } : null} />
        </Field>
        <SubmitButton>Iniciar venda</SubmitButton>
      </form>
    </>
  );
}
