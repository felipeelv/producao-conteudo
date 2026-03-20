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

### 1. Interface compartilhada — `lib/types.ts`

```typescript
export interface SlackNotifyPayload {
  unitName: string              // ex: "Unidade 1: Números Naturais"
  disciplineName: string        // ex: "Matemática"
  yearName: string              // ex: "6º Ano"
  bimesterName: string          // ex: "1º Bimestre"
  previousStatus: KanbanStatus  // ex: "production"
  newStatus: KanbanStatus       // ex: "layout"
  boardType: "content" | "workbook"
}
```

### 2. API Route — `app/api/slack/notify/route.ts`

Recebe um POST do frontend com `SlackNotifyPayload` e faz POST para o Slack Webhook.

**Comportamento:**
- Se `SLACK_WEBHOOK_URL` não está definida, retorna 200 com no-op (para não poluir console em dev)
- Valida que o request body contém todos os campos obrigatórios e que `boardType` é "content" ou "workbook"
- Formata a mensagem usando o utilitário `lib/slack.ts`
- Faz POST `Content-Type: application/json` para o webhook
- Loga o status code da resposta do Slack para observabilidade
- Retorna 200 (sucesso) ou 500 (erro)

**Segurança:**
- `SLACK_WEBHOOK_URL` é variável server-side — NUNCA usar prefixo `NEXT_PUBLIC_`
- A rota é pública (sem auth). Decisão consciente: este é um app interno. A validação do body impede payloads arbitrários.

### 3. Utilitário — `lib/slack.ts`

Função `formatSlackMessage(payload: SlackNotifyPayload)` que monta o payload usando a API de `attachments` (legado, mas é a única que suporta cor lateral):

```json
{
  "attachments": [{
    "color": "#3b82f6",
    "blocks": [
      { "type": "header", "text": { "type": "plain_text", "text": "Kanban - Conteúdos" } },
      { "type": "section", "text": { "type": "mrkdwn", "text": "*Matemática* — 6º Ano — 1º Bimestre\nUnidade 1: Números Naturais" } },
      { "type": "section", "text": { "type": "mrkdwn", "text": "Produção → Layout" } }
    ]
  }]
}
```

Cores laterais por status de destino:
- Produção: amarelo (#f59e0b)
- Layout: azul (#3b82f6)
- Impressão: roxo (#8b5cf6)
- Concluído: verde (#10b981)

Labels em português: `production` → "Produção", `layout` → "Layout", `printing` → "Impressão", `completed` → "Concluído".

### 4. Integração nos hooks — `hooks/use-production-data.ts`

Nos hooks `useKanbanItems.updateStatus` e `useWorkbookItems.updateStatus`:
- Antes de atualizar o estado local, capturar o `previousStatus` do item via lookup no array local: `const item = kanbanItems.find(i => i.id === id)`. Se o item não for encontrado, pular a notificação.
- Após atualização bem-sucedida no banco, disparar a notificação em fire-and-forget com `.catch()`:

```typescript
fetch('/api/slack/notify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
}).catch(err => console.error('Slack notify failed:', err))
```

- Sem `await` — não bloqueia o fluxo principal.

## Configuração

### Variável de ambiente
```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../xxx
```

Deve ser configurada em:
- `.env.local` (desenvolvimento — opcional, sem ela as notificações são silenciosamente ignoradas)
- Variáveis de ambiente do Vercel (produção)

**Importante:** `.env.example` deve conter apenas o placeholder, nunca uma URL real.

### Como obter o Webhook URL
1. Ir em https://api.slack.com/apps → Create New App
2. Escolher "From scratch", dar um nome, selecionar o workspace
3. Em "Incoming Webhooks", ativar e adicionar um webhook para o canal desejado
4. Copiar a URL gerada

## Decisões de design

- **Fire-and-forget:** A notificação do Slack não bloqueia a UI. Se falhar, o item ainda é movido normalmente.
- **No-op sem webhook:** Se `SLACK_WEBHOOK_URL` não está definida, a API route retorna 200 sem fazer nada. Isso permite desenvolvimento local sem configurar Slack.
- **Sem autenticação na rota:** App interno, a validação do body é suficiente. Documentado como decisão consciente.
- **Attachments com blocks:** Usa a API de attachments (não pura Block Kit) para suportar cor lateral na mensagem.
- **Rate limiting:** Slack aceita ~1 msg/s em webhooks. Para uso normal de produção editorial isso é mais que suficiente. Movimentações em massa não são um cenário esperado.
- **Ambos os Kanbans:** Tanto o Kanban de Conteúdos quanto o de Caderno de Atividades enviam notificações.

## Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| `lib/types.ts` | Modificar (adicionar `SlackNotifyPayload`) |
| `app/api/slack/notify/route.ts` | Criar |
| `lib/slack.ts` | Criar |
| `hooks/use-production-data.ts` | Modificar (adicionar chamadas de notificação) |
| `.env.example` | Criar (placeholder para `SLACK_WEBHOOK_URL`) |
