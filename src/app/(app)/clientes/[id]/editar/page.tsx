import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { TutorForm } from "../../tutor-form";
import { atualizarTutor } from "../../actions";

export default async function EditarTutor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await requireSession();
  const tutor = await db.tutor.findFirst({ where: { id, clinicaId: s.clinicaId } });
  if (!tutor) notFound();
  return (
    <>
      <PageHeader title={`Editar ${tutor.nome}`} back={`/clientes/${id}`} />
      <TutorForm action={atualizarTutor.bind(null, id)} tutor={tutor} />
    </>
  );
}
