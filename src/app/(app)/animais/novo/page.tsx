import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { AnimalForm } from "../animal-form";
import { criarAnimal } from "../actions";

export const metadata = { title: "Novo animal" };

export default async function NovoAnimal({ searchParams }: { searchParams: Promise<{ tutor?: string }> }) {
  const s = await requireSession();
  const { tutor } = await searchParams;
  const tutores = await db.tutor.findMany({
    where: { clinicaId: s.clinicaId },
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });
  return (
    <>
      <PageHeader title="Novo animal" back={tutor ? `/clientes/${tutor}` : "/animais"} />
      <AnimalForm action={criarAnimal} tutores={tutores} tutorId={tutor} />
    </>
  );
}
