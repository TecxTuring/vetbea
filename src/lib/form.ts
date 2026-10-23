/** Utilitários para ler FormData em server actions. */

export function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

export function opt(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  return v === "" ? null : v;
}

/** Número aceitando vírgula decimal ("12,50"). */
export function dec(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (v === "") return null;
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  if (v.includes(",")) return isNaN(n) ? null : n;
  const m = Number(v);
  return isNaN(m) ? null : m;
}

export function int(fd: FormData, key: string): number | null {
  const n = dec(fd, key);
  return n === null ? null : Math.round(n);
}

export function bool(fd: FormData, key: string): boolean {
  const v = fd.get(key);
  return v === "on" || v === "true" || v === "1";
}

export function date(fd: FormData, key: string): Date | null {
  const v = str(fd, key);
  if (!v) return null;
  // "yyyy-mm-dd" é interpretado como meio-dia local para evitar troca de dia por fuso
  const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + "T12:00:00") : new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export function required(value: string, label: string): string {
  if (!value) throw new Error(`${label} é obrigatório`);
  return value;
}
