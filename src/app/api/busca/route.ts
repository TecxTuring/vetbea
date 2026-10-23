import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

/** Busca rápida usada pelos campos de seleção (animais, tutores, produtos). */
export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json([], { status: 401 });
  const tipo = req.nextUrl.searchParams.get("tipo");
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const c = s.clinicaId;
  const like = { contains: q, mode: "insensitive" as const };

  if (tipo === "animais") {
    const r = await db.animal.findMany({
      where: { clinicaId: c, obito: false, OR: [{ nome: like }, { tutor: { nome: like } }] },
      include: { tutor: { select: { nome: true } } },
      take: 15,
      orderBy: { nome: "asc" },
    });
    return NextResponse.json(
      r.map((a) => ({ id: a.id, label: a.nome, sub: `${a.especie} · ${a.tutor.nome}`, tutorId: a.tutorId })),
    );
  }
  if (tipo === "tutores") {
    const r = await db.tutor.findMany({
      where: { clinicaId: c, OR: [{ nome: like }, { cpf: { contains: q } }, { telefone: { contains: q } }] },
      take: 15,
      orderBy: { nome: "asc" },
    });
    return NextResponse.json(r.map((t) => ({ id: t.id, label: t.nome, sub: t.telefone ?? t.email ?? "" })));
  }
  if (tipo === "produtos") {
    const r = await db.produto.findMany({
      where: { clinicaId: c, ativo: true, OR: [{ nome: like }, { codigoBarras: q || undefined }] },
      take: 15,
      orderBy: { nome: "asc" },
    });
    return NextResponse.json(
      r.map((p) => ({
        id: p.id,
        label: p.nome,
        sub: `${Number(p.precoVenda).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}${
          p.controlaEstoque ? ` · estoque ${Number(p.estoqueAtual)}` : ""
        }`,
        preco: Number(p.precoVenda),
        fracionavel: p.fracionavel,
        unidadeFracao: p.unidadeFracao,
        fatorFracao: p.fatorFracao ? Number(p.fatorFracao) : null,
      })),
    );
  }
  return NextResponse.json([]);
}
