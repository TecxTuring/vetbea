"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Mostra mensagens de erro enviadas pelas actions via ?erro=... */
export function Flash() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const erro = params.get("erro");
  if (!erro || erro === "permissao") return null;
  return (
    <div className="no-print mb-4 flex items-start justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <span>{erro}</span>
      <button
        onClick={() => {
          const p = new URLSearchParams(params);
          p.delete("erro");
          router.replace(`${pathname}${p.size ? `?${p}` : ""}`);
        }}
        className="text-red-400 hover:text-red-700"
      >
        ✕
      </button>
    </div>
  );
}
