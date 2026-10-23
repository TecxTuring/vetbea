import { redirect } from "next/navigation";

/** Interrompe a action e volta para a página exibindo a mensagem de erro. */
export function falha(path: string, mensagem: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}erro=${encodeURIComponent(mensagem)}`);
}
