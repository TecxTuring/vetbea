// Executado uma vez quando o servidor inicia.
// A Vercel reserva a variável TZ e roda em UTC; aqui forçamos o fuso da clínica
// para que agenda, lembretes e relatórios usem o horário local.
export function register() {
  process.env.TZ = process.env.APP_TZ || "America/Sao_Paulo";
}
