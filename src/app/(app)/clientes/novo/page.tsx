import { PageHeader } from "@/components/ui";
import { TutorForm } from "../tutor-form";
import { criarTutor } from "../actions";

export const metadata = { title: "Novo cliente" };

export default function NovoTutor() {
  return (
    <>
      <PageHeader title="Novo cliente" back="/clientes" />
      <TutorForm action={criarTutor} comAnimal />
    </>
  );
}
