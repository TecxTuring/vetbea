# Mapigo

Sistema de gestão para clínicas veterinárias, hospitais veterinários e pet shops. Funciona na nuvem e atende várias clínicas na mesma instalação (SaaS).

## Funcionalidades

**Atendimento veterinário**
- Agenda por veterinário (colunas por profissional, encaixe, confirmação, chegada, faltas)
- Prontuário completo: histórico em linha do tempo, sinais vitais, anamnese, exame físico, diagnóstico, curva de peso
- Protocolos de vacina com doses programadas, carteira de vacinação e baixa automática no estoque
- Exames: solicitação, coleta, resultado e aviso automático ao tutor
- Modelos de receita (simples e controle especial em 2 vias) e documentos padronizados (atestados, termos) com variáveis
- Consultório integrado ao caixa: itens lançados no atendimento vão direto para a venda
- Orçamentos com envio por WhatsApp, impressão e conversão em venda

**Internação**
- Mapa de boxes e triagem por classificação de risco
- Prescrições com mapa de execução de 24 h (aplicado / pendente / atrasado)
- Modelos de prescrição, parâmetros clínicos com gráfico de temperatura
- Evolução e passagem de plantão (troca de turno)
- Solicitações de autorização ao tutor por link, com resposta em tempo real
- Alta, transferência e óbito; lançamento de diárias

**Estoque**
- Produtos, medicamentos, vacinas e serviços; fracionamento (venda por ml, comprimido etc.)
- Análise automática: consumo médio, dias de cobertura, curva ABC, produtos parados e sugestão de compra
- Pedidos de compra, recebimento com atualização de custo e lançamento em contas a pagar
- Registro de compras pelo XML da NF-e (cadastra fornecedor e produtos automaticamente)
- Devolução ao fornecedor, consumo interno, avarias, perda por validade e doações
- Inventário pelo celular com ajuste automático e etiquetas com código de barras (Code 128)

**Financeiro**
- Vendas (PDV) com múltiplas formas de pagamento, troco, desconto, crédito e venda a prazo
- Caixa com abertura, sangria, suprimento e fechamento com conferência
- Contas a pagar e receber (com recorrência e parcelamento)
- Fluxo de caixa diário (realizado e previsto) e demonstrativo mensal por categoria
- Conciliação de recebíveis de cartão
- Clientes em débito (com cobrança via WhatsApp) e créditos pré-pagos

**Fidelização**
- Portal/app do tutor (link exclusivo): vacinas, agendamentos, exames, receitas, documentos e autorizações
- Site grátis da clínica (`/site/<slug>`)
- Frequência de retorno (clientes novos, ativos, em risco e inativos)
- Pesquisa de satisfação (NPS) automática
- Lembretes automáticos de agendamento, vacina, resultado de exame e aniversário do pet
- Campanhas por SMS, WhatsApp ou e-mail com segmentação
- Ranking dos melhores clientes
- Conversa no WhatsApp a partir do sistema, com mensagens prontas

**Extras**
- Multi-clínica com cadastro self-service
- Perfis de acesso: administrador, veterinário, auxiliar, recepção e financeiro
- Relatórios: faturamento, categorias, mais vendidos, formas de pagamento e comissões
- Auditoria de ações
- Layout responsivo (celular e tablet) e impressão de receitas, documentos, orçamentos e recibos

## Tecnologias

Next.js 15 (App Router, Server Actions) · TypeScript · PostgreSQL · Prisma · Tailwind CSS 4

## Rodando localmente

Requisitos: Node 20+ e PostgreSQL 14+.

```bash
cp .env.example .env          # ajuste DATABASE_URL e AUTH_SECRET
npm install
npx prisma migrate dev        # cria as tabelas
npm run db:seed               # (opcional) dados de demonstração
npm run dev
```

Acesse http://localhost:3000. Com os dados de demonstração, entre com `admin@mapigo.dev` / `mapigo123`. Os usuários `bruno@`, `carla@` e `recepcao@mapigo.dev` usam a mesma senha.

## Publicando em produção

1. Crie um banco PostgreSQL (Neon, Supabase, RDS etc.).
2. Publique na Vercel (ou em qualquer host Node) com estas variáveis de ambiente:
   - `DATABASE_URL`, `AUTH_SECRET` (gere com `openssl rand -hex 32`), `APP_URL`
   - `TZ=America/Sao_Paulo`
   - `CRON_SECRET`
3. Na Vercel, o `vercel.json` já aplica as migrações a cada deploy e agenda a rotina diária de lembretes (`/api/cron`, 8h de Brasília). Em outros hosts, rode `npm run db:migrate` no deploy e agende um `GET /api/cron` diário com o header `Authorization: Bearer <CRON_SECRET>`.

### Envio automático de mensagens

Sem integração configurada, os lembretes ficam em **Fidelização → Mensagens automáticas** para envio com 1 clique pelo WhatsApp Web.

Para envio automático, defina `WHATSAPP_WEBHOOK_URL`, `SMS_WEBHOOK_URL` e/ou `EMAIL_WEBHOOK_URL` (e os tokens). O sistema faz um `POST {to, message, canal}` para a URL configurada. Pode ser a API do seu provedor (Z-API, Twilio, Zenvia etc.) ou uma pequena função intermediária.

## Próximos passos sugeridos

- Emissão de NFS-e/NF-e (integração com Focus NFe, eNotas ou PlugNotas)
- Integração com maquininhas (Stone, Cielo) para conciliação automática
- Upload de anexos (imagens e laudos em PDF) no prontuário
- Agendamento online pelo próprio tutor no portal
- Cobrança de assinatura das clínicas (planos SaaS)
