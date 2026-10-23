"use client";

import { useFormStatus } from "react-dom";
import { entrarDemo } from "./actions";

function Botao() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="btn-accent w-full">
      {pending ? "Preparando a clínica de demonstração…" : "Testar com dados de demonstração"}
    </button>
  );
}

export function DemoButton() {
  return (
    <form action={entrarDemo}>
      <Botao />
    </form>
  );
}
