# Integração Slack — Notificações Automáticas do Kanban

**Data:** 2026-03-20
**Status:** Aprovado

## Objetivo

Enviar notificações automáticas para um canal específico do Slack sempre que um item mudar de status nos Kanbans (Conteúdos e Caderno de Atividades).

## Abordagem

Incoming Webhook do Slack. Escolhida por ser a mais simples e atender exatamente ao requisito (notificações em canal fixo).

## Arquitetura

```
Usuário move item no Kanban
  → Hook (useKanbanItems / useWorkbookItems) chama API Route
    → API Route POST para Slack Webhook URL
      → Mensagem aparece no canal do Slack
```

## Componentes

### 1. API Route — `app/api/slack/notify/route.ts`

Recebe um POST do frontend com os dados do evento e faz POST para o Slack Webhook.

**Request body:**
```typescript
{
  itemName: string        // ex: "Unidade 1: Números Naturais"
  disciplineName: string  // ex: "Matemática"
  yearName: string        // ex: "6º Ano"
  bimesterName: string    // ex: "1º Bimestre"
  previousStatus: KanbanStatus  // ex: "production"
  newStatus: KanbanStatus       // ex: "layout"
  boardType: "content" | "workbook"  // qual kanban
}
```

**Comportamento:**
- Valida que `SLACK_WEBHOOK_URL` existe nas env vars
- Formata a mensagem usando Block Kit do Slack
- Faz POST para o webhook
- Retorna 200 (sucesso) ou 500 (erro) — falhas no Slack não devem bloquear o fluxo principal

### 2. Utilitário — `lib/slack.ts`

Função `formatSlackMessage(event)` que monta o payload Block Kit:

- Header com o tipo do board ("Kanban - Conteúdos" ou "Kanban - Caderno de Atividades")
- Disciplina, ano e bimestre
- Nome da unidade
- Transição de status com labels em português: Produção → Layout → Impressão → Concluído
- Cor lateral baseada no status de destino:
  - Produção: amarelo (#f59e0b)
  - Layout: azul (#3b82f6)
  - Impressão: roxo (#8b5cf6)
  - Concluído: verde (#10b981)

### 3. Integração nos hooks — `hooks/use-production-data.ts`

Nos hooks `useKanbanItems.updateStatus` e `useWorkbookItems.updateStatus`:
- Após atualização bem-sucedida no banco, dispara `fetch('/api/slack/notify', ...)` em fire-and-forget (sem await, sem bloquear o fluxo)
- Se a chamada falhar, loga no console mas não mostra erro ao usuário

## Configuração

### Variável de ambiente
```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../xxx
```

Deve ser configurada em:
- `.env.local` (desenvolvimento)
- Variáveis de ambiente do Vercel (produção)

### Como obter o Webhook URL
1. Ir em https://api.slack.com/apps → Create New App
2. Escolher "From scratch", dar um nome, selecionar o workspace
3. Em "Incoming Webhooks", ativar e adicionar um webhook para o canal desejado
4. Copiar a URL gerada

## Formato da mensagem no Slack

```
┌─────────────────────────────────────────┐
│ 🔵 Kanban - Conteúdos                  │
│                                         │
│ Matemática — 6º Ano — 1º Bimestre      │
│ Unidade 1: Números Naturais            │
│                                         │
│ Produção → Layout                       │
└─────────────────────────────────────────┘
```

## Decisões de design

- **Fire-and-forget:** A notificação do Slack não bloqueia a UI. Se falhar, o item ainda é movido normalmente.
- **Sem API Route complexa:** A route apenas recebe e repassa. Não persiste logs de notificação.
- **Sem configuração no app:** O webhook URL é uma env var. Para mudar o canal, basta criar novo webhook e atualizar a variável.
- **Ambos os Kanbans:** Tanto o Kanban de Conteúdos quanto o de Caderno de Atividades enviam notificações.

## Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| `app/api/slack/notify/route.ts` | Criar |
| `lib/slack.ts` | Criar |
| `hooks/use-production-data.ts` | Modificar (adicionar chamadas de notificação) |
| `.env.local` | Adicionar `SLACK_WEBHOOK_URL` |
| `.env.example` | Criar (documentar variáveis necessárias) |
