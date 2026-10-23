import type { Animal, Clinica, Tutor } from "@prisma/client";
import { data, idade } from "./format";

/** Substitui variáveis {{animal.nome}}, {{tutor.cpf}}, {{data}} etc. em modelos de documento/receita. */
export function preencherModelo(
  texto: string,
  ctx: { animal?: Animal | null; tutor?: Tutor | null; clinica?: Clinica | null; veterinario?: string },
): string {
  const vars: Record<string, string> = {
    "animal.nome": ctx.animal?.nome ?? "",
    "animal.especie": ctx.animal?.especie ?? "",
    "animal.raca": ctx.animal?.raca ?? "SRD",
    "animal.sexo": ctx.animal?.sexo === "M" ? "macho" : ctx.animal?.sexo === "F" ? "fêmea" : "",
    "animal.idade": idade(ctx.animal?.dataNascimento),
    "animal.peso": ctx.animal?.peso ? `${Number(ctx.animal.peso)} kg` : "",
    "animal.pelagem": ctx.animal?.pelagem ?? "",
    "animal.microchip": ctx.animal?.microchip ?? "",
    "tutor.nome": ctx.tutor?.nome ?? "",
    "tutor.cpf": ctx.tutor?.cpf ?? "",
    "tutor.telefone": ctx.tutor?.telefone ?? "",
    "tutor.endereco": [ctx.tutor?.endereco, ctx.tutor?.bairro, ctx.tutor?.cidade].filter(Boolean).join(", "),
    "clinica.nome": ctx.clinica?.nome ?? "",
    "clinica.cidade": ctx.clinica?.cidade ?? "",
    "clinica.telefone": ctx.clinica?.telefone ?? "",
    veterinario: ctx.veterinario ?? "",
    data: data(new Date()),
  };
  return texto.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, k) => (k in vars ? vars[k] : m));
}

export const VARIAVEIS_MODELO = [
  "animal.nome",
  "animal.especie",
  "animal.raca",
  "animal.sexo",
  "animal.idade",
  "animal.peso",
  "animal.pelagem",
  "animal.microchip",
  "tutor.nome",
  "tutor.cpf",
  "tutor.telefone",
  "tutor.endereco",
  "clinica.nome",
  "clinica.cidade",
  "clinica.telefone",
  "veterinario",
  "data",
];
