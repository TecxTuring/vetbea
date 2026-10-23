import { Tabs } from "@/components/ui";

const ABAS = [
  { key: "produtos", label: "Produtos e serviços", href: "/estoque" },
  { key: "movimentos", label: "Movimentações", href: "/estoque/movimentos" },
  { key: "compras", label: "Compras", href: "/estoque/compras" },
  { key: "saidas", label: "Outras saídas", href: "/estoque/saidas" },
  { key: "inventario", label: "Inventário", href: "/estoque/inventario" },
  { key: "analise", label: "Análise", href: "/estoque/analise" },
  { key: "etiquetas", label: "Etiquetas", href: "/estoque/etiquetas" },
  { key: "fornecedores", label: "Fornecedores", href: "/estoque/fornecedores" },
];

export function EstoqueNav({ active }: { active: string }) {
  return <Tabs tabs={ABAS} active={active} />;
}
