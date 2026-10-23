/** Leitura simplificada do XML de NF-e (modelo 55) para entrada de compras. */

export type ItemNFe = { nome: string; ean: string | null; unidade: string; quantidade: number; valorUnit: number };

export type NFe = {
  chave: string | null;
  numero: string | null;
  emitente: { nome: string; cnpj: string | null };
  itens: ItemNFe[];
};

function tag(xml: string, nome: string): string | null {
  const m = xml.match(new RegExp(`<(?:\\w+:)?${nome}[^>]*>([\\s\\S]*?)</(?:\\w+:)?${nome}>`));
  return m ? decode(m[1].trim()) : null;
}

function decode(s: string) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export function lerNFe(xml: string): NFe {
  if (!/<(?:\w+:)?infNFe/.test(xml)) throw new Error("XML não é uma NF-e");
  const chave = xml.match(/<(?:\w+:)?infNFe[^>]*Id="NFe(\d{44})"/)?.[1] ?? null;
  const emit = tag(xml, "emit") ?? "";
  const dets = xml.match(/<(?:\w+:)?det\b[\s\S]*?<\/(?:\w+:)?det>/g) ?? [];
  const itens = dets.map((det) => {
    const prod = tag(det, "prod") ?? det;
    const ean = tag(prod, "cEAN");
    return {
      nome: tag(prod, "xProd") ?? "Produto",
      ean: ean && /^\d{8,14}$/.test(ean) ? ean : null,
      unidade: (tag(prod, "uCom") ?? "UN").toUpperCase(),
      quantidade: Number(tag(prod, "qCom") ?? 1),
      valorUnit: Math.round(Number(tag(prod, "vUnCom") ?? 0) * 100) / 100,
    };
  });
  return {
    chave,
    numero: tag(tag(xml, "ide") ?? "", "nNF"),
    emitente: { nome: tag(emit, "xNome") ?? "", cnpj: tag(emit, "CNPJ") },
    itens,
  };
}
