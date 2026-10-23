import { Tabs } from "@/components/ui";

export function FinanceiroNav({ active }: { active: string }) {
  return (
    <Tabs
      active={active}
      tabs={[
        { key: "contas", label: "Contas a pagar e receber", href: "/financeiro" },
        { key: "fluxo", label: "Fluxo de caixa", href: "/financeiro/fluxo" },
        { key: "demonstrativo", label: "Demonstrativo mensal", href: "/financeiro/demonstrativo" },
        { key: "conciliacao", label: "Conciliação de cartões", href: "/financeiro/conciliacao" },
        { key: "clientes", label: "Débitos e créditos de clientes", href: "/financeiro/clientes" },
      ]}
    />
  );
}
