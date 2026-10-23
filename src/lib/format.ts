import { format, differenceInMonths, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";

type Num = number | string | { toString(): string } | null | undefined;

export function num(v: Num): number {
  if (v === null || v === undefined || v === "") return 0;
  return Number(v.toString());
}

export function brl(v: Num): string {
  return num(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function qtd(v: Num): string {
  return num(v).toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

export function data(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return format(new Date(d), "dd/MM/yyyy", { locale: ptBR });
}

export function dataHora(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return format(new Date(d), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export function hora(d: Date | string): string {
  return format(new Date(d), "HH:mm");
}

export function fmt(d: Date | string, pattern: string): string {
  return format(new Date(d), pattern, { locale: ptBR });
}

/** Valor para <input type="date"> */
export function inputDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  return format(new Date(d), "yyyy-MM-dd");
}

/** Valor para <input type="datetime-local"> */
export function inputDateTime(d: Date | string | null | undefined): string {
  if (!d) return "";
  return format(new Date(d), "yyyy-MM-dd'T'HH:mm");
}

export function idade(nasc: Date | string | null | undefined): string {
  if (!nasc) return "—";
  const anos = differenceInYears(new Date(), new Date(nasc));
  if (anos >= 1) return `${anos} ano${anos > 1 ? "s" : ""}`;
  const meses = differenceInMonths(new Date(), new Date(nasc));
  return `${meses} ${meses === 1 ? "mês" : "meses"}`;
}

export function telefone(t: string | null | undefined): string {
  if (!t) return "—";
  const d = t.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t;
}

export function whatsappLink(t: string | null | undefined, msg?: string): string | null {
  if (!t) return null;
  let d = t.replace(/\D/g, "");
  if (d.length <= 11) d = "55" + d;
  return `https://wa.me/${d}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;
}

export const rotulos: Record<string, string> = {
  // agendamento
  CONSULTA: "Consulta",
  RETORNO: "Retorno",
  VACINA: "Vacina",
  EXAME: "Exame",
  CIRURGIA: "Cirurgia",
  BANHO_TOSA: "Banho e tosa",
  OUTRO: "Outro",
  AGENDADO: "Agendado",
  CONFIRMADO: "Confirmado",
  AGUARDANDO: "Aguardando",
  EM_ATENDIMENTO: "Em atendimento",
  CONCLUIDO: "Concluído",
  FALTOU: "Faltou",
  CANCELADO: "Cancelado",
  // exame
  SOLICITADO: "Solicitado",
  COLETADO: "Coletado",
  RESULTADO: "Resultado disponível",
  // orçamento
  ABERTO: "Aberto",
  APROVADO: "Aprovado",
  RECUSADO: "Recusado",
  CONVERTIDO: "Convertido em venda",
  // produto
  PRODUTO: "Produto",
  SERVICO: "Serviço",
  MEDICAMENTO: "Medicamento",
  // movimentos
  ENTRADA_COMPRA: "Entrada (compra)",
  SAIDA_VENDA: "Saída (venda)",
  CONSUMO_INTERNO: "Consumo interno",
  AVARIA: "Avaria",
  VENCIMENTO: "Perda por validade",
  DOACAO: "Doação",
  DEVOLUCAO_FORNECEDOR: "Devolução ao fornecedor",
  AJUSTE_INVENTARIO: "Ajuste de inventário",
  ESTORNO_VENDA: "Estorno de venda",
  // pedidos
  RASCUNHO: "Rascunho",
  ENVIADO: "Enviado",
  RECEBIDO: "Recebido",
  // vendas
  ABERTA: "Aberta",
  FINALIZADA: "Finalizada",
  CANCELADA: "Cancelada",
  PAGA: "Paga",
  // pagamento
  DINHEIRO: "Dinheiro",
  PIX: "Pix",
  DEBITO: "Cartão de débito",
  CREDITO: "Cartão de crédito",
  BOLETO: "Boleto",
  CREDITO_CLIENTE: "Crédito do cliente",
  A_PRAZO: "A prazo (débito do cliente)",
  // caixa
  SUPRIMENTO: "Suprimento",
  SANGRIA: "Sangria",
  RECEBIMENTO: "Recebimento",
  PAGAMENTO: "Pagamento",
  // internação
  INTERNADO: "Internado",
  ALTA: "Alta",
  OBITO: "Óbito",
  TRANSFERIDO: "Transferido",
  EMERGENCIA: "Emergência",
  MUITO_URGENTE: "Muito urgente",
  URGENTE: "Urgente",
  POUCO_URGENTE: "Pouco urgente",
  NAO_URGENTE: "Não urgente",
  PENDENTE: "Pendente",
  APROVADA: "Aprovada",
  RECUSADA: "Recusada",
  // mensagens
  WHATSAPP: "WhatsApp",
  SMS: "SMS",
  EMAIL: "E-mail",
  LEMBRETE_AGENDA: "Lembrete de agendamento",
  LEMBRETE_VACINA: "Lembrete de vacina",
  RESULTADO_EXAME: "Resultado de exame",
  ANIVERSARIO: "Aniversário",
  CAMPANHA: "Campanha",
  NPS: "Pesquisa de satisfação",
  SOLICITACAO: "Solicitação ao tutor",
  ENVIADA: "Enviada",
  ERRO: "Erro",
  // papéis
  ADMIN: "Administrador",
  VETERINARIO: "Veterinário(a)",
  RECEPCAO: "Recepção",
  FINANCEIRO: "Financeiro",
  AUXILIAR: "Auxiliar",
};

export function rotulo(v: string | null | undefined): string {
  if (!v) return "—";
  return rotulos[v] ?? v;
}
