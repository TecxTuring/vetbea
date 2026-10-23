import { Tabs } from "@/components/ui";

export function ConfigNav({ active }: { active: string }) {
  return (
    <Tabs
      active={active}
      tabs={[
        { key: "clinica", label: "Clínica", href: "/configuracoes" },
        { key: "usuarios", label: "Usuários", href: "/configuracoes/usuarios" },
        { key: "modelos", label: "Modelos de receita e documentos", href: "/configuracoes/modelos" },
        { key: "protocolos", label: "Protocolos de vacina", href: "/configuracoes/protocolos" },
        { key: "boxes", label: "Boxes e modelos de prescrição", href: "/configuracoes/boxes" },
      ]}
    />
  );
}
