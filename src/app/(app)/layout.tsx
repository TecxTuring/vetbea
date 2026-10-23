import { Suspense } from "react";
import { Flash } from "@/components/flash";
import { Sidebar } from "@/components/sidebar";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { rotulo } from "@/lib/format";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await requireSession();
  const clinica = await db.clinica.findUnique({ where: { id: s.clinicaId }, select: { nome: true } });
  return (
    <div className="min-h-screen">
      <Sidebar clinica={clinica?.nome ?? ""} usuario={s.nome} papel={rotulo(s.papel)} />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Suspense>
            <Flash />
          </Suspense>
          {children}
        </div>
      </main>
    </div>
  );
}
