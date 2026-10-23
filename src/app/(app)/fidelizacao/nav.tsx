import { Tabs } from "@/components/ui";

export function FidelizacaoNav({ active }: { active: string }) {
  return (
    <Tabs
      active={active}
      tabs={[
        { key: "mensagens", label: "Mensagens automáticas", href: "/fidelizacao" },
        { key: "campanhas", label: "Campanhas", href: "/fidelizacao/campanhas" },
        { key: "ranking", label: "Ranking de clientes", href: "/fidelizacao/ranking" },
        { key: "ciclo", label: "Frequência de retorno", href: "/fidelizacao/ciclo" },
        { key: "nps", label: "Satisfação (NPS)", href: "/fidelizacao/nps" },
        { key: "canais", label: "App do tutor e site", href: "/fidelizacao/canais" },
      ]}
    />
  );
}
