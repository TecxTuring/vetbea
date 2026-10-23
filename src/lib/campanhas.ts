import { subDays } from "date-fns";
import type { Prisma } from "@prisma/client";

/** Filtros de público das campanhas. */
export function publicoCampanha(clinicaId: string, filtro: string): Prisma.TutorWhereInput {
  const base: Prisma.TutorWhereInput = { clinicaId, aceitaMensagens: true };
  const hoje = new Date();
  if (filtro === "TODOS") return base;
  if (filtro.startsWith("INATIVOS_")) {
    const dias = Number(filtro.split("_")[1]);
    return { ...base, vendas: { none: { status: "FINALIZADA", createdAt: { gte: subDays(hoje, dias) } } } };
  }
  if (filtro.startsWith("ESPECIE:")) {
    return { ...base, animais: { some: { especie: filtro.slice(8), obito: false } } };
  }
  if (filtro === "VACINA_ATRASADA") {
    return { ...base, animais: { some: { obito: false, vacinas: { some: { aplicadaEm: null, proximaDose: { lt: hoje } } } } } };
  }
  return base;
}

export const FILTROS_CAMPANHA = [
  { valor: "TODOS", rotulo: "Todos os clientes" },
  { valor: "INATIVOS_90", rotulo: "Sem comprar há 90 dias" },
  { valor: "INATIVOS_180", rotulo: "Sem comprar há 180 dias" },
  { valor: "VACINA_ATRASADA", rotulo: "Com vacina atrasada" },
  { valor: "ESPECIE:Canina", rotulo: "Tutores de cães" },
  { valor: "ESPECIE:Felina", rotulo: "Tutores de gatos" },
];
