"use client";

import { useEffect, useRef, useState } from "react";

export type PickerItem = { id: string; label: string; sub?: string; [k: string]: unknown };

/** Campo de busca com sugestões; grava o id selecionado em um input oculto. */
export function Picker({
  tipo,
  name,
  placeholder = "Buscar…",
  initial,
  required,
  onSelect,
  clearOnSelect,
}: {
  tipo: "animais" | "tutores" | "produtos";
  name?: string;
  placeholder?: string;
  initial?: { id: string; label: string } | null;
  required?: boolean;
  onSelect?: (item: PickerItem) => void;
  clearOnSelect?: boolean;
}) {
  const [texto, setTexto] = useState(initial?.label ?? "");
  const [id, setId] = useState(initial?.id ?? "");
  const [itens, setItens] = useState<PickerItem[]>([]);
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!aberto) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const r = await fetch(`/api/busca?tipo=${tipo}&q=${encodeURIComponent(texto)}`);
      if (r.ok) setItens(await r.json());
      setAtivo(0);
    }, 200);
  }, [texto, aberto, tipo]);

  function escolher(item: PickerItem) {
    onSelect?.(item);
    if (clearOnSelect) {
      setTexto("");
      setId("");
    } else {
      setTexto(item.label);
      setId(item.id);
    }
    setAberto(false);
  }

  return (
    <div className="relative">
      {name && <input type="hidden" name={name} value={id} />}
      <input
        className="input"
        value={texto}
        placeholder={placeholder}
        required={required && !id}
        onChange={(e) => {
          setTexto(e.target.value);
          setId("");
          setAberto(true);
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        onKeyDown={(e) => {
          if (!aberto || itens.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setAtivo((a) => Math.min(a + 1, itens.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setAtivo((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            escolher(itens[ativo]);
          }
        }}
      />
      {aberto && itens.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {itens.map((it, i) => (
            <li
              key={it.id}
              onMouseDown={() => escolher(it)}
              className={`cursor-pointer px-3 py-2 text-sm ${i === ativo ? "bg-brand-50" : "hover:bg-slate-50"}`}
            >
              <p className="font-medium">{it.label}</p>
              {it.sub && <p className="text-xs text-slate-500">{it.sub}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
