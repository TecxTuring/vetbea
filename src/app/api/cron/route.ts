import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { gerarMensagensAutomaticas, processarFila } from "@/lib/mensagens";
import { DEMO_SLUG, garantirDemo } from "@/lib/demo";

/**
 * Rotina diária: gera lembretes e envia a fila de mensagens de todas as clínicas.
 * Agende uma chamada (ex.: Vercel Cron, 8h) para /api/cron com o header Authorization: Bearer CRON_SECRET.
 */
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  await garantirDemo();
  // a demo não envia mensagens de verdade
  const clinicas = await db.clinica.findMany({ where: { slug: { not: DEMO_SLUG } }, select: { id: true } });
  let geradas = 0;
  let enviadas = 0;
  for (const c of clinicas) {
    geradas += await gerarMensagensAutomaticas(c.id);
    enviadas += await processarFila(c.id);
  }
  return NextResponse.json({ clinicas: clinicas.length, geradas, enviadas });
}
