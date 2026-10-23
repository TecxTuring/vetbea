import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { AnimalForm } from "../../animal-form";
import { atualizarAnimal } from "../../actions";

export default async function EditarAnimal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  const animal = await db.animal.findFirst({ where: { id, clinicaId: s.clinicaId } });
  if (!animal) notFound();
  return (
    <>
      <PageHeader title={`Editar ${animal.nome}`} back={`/animais/${id}`} />
      <AnimalForm action={atualizarAnimal.bind(null, id)} animal={animal} />
    </>
  );
}
