# Relatório Diário do Kanban via Slack

**Data:** 2026-03-26
**Canal Slack:** `#relatorio-producao`
**Env var:** `SLACK_WEBHOOK_RELATORIO`
**Escopo:** Apenas board de Conteúdo (`kanban_items`)

---

## Visão Geral

Dois relatórios enviados numa única mensagem Slack diária às 19h (Brasília):

1. **Movimentações do dia** — o que mudou de status nas últimas 24h (de → para, qual item)
2. **Pendências** — itens aprovados para impressão que ainda estão em Diagramação ou Impressão

## 1. Tabela de Audit Log — `kanban_status_log`

### Schema

```sql
CREATE TABLE kanban_status_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kanban_item_id uuid NOT NULL REFERENCES kanban_items(id) ON DELETE CASCADE,
  previous_status text NOT NULL,
  new_status text NOT NULL,
  changed_by text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_status_log_changed_at ON kanban_status_log(changed_at);
CREATE INDEX idx_status_log_item ON kanban_status_log(kanban_item_id);
```

### Campo auxiliar em `kanban_items`

```sql
ALTER TABLE kanban_items ADD COLUMN IF NOT EXISTS changed_by text;
```

- Campo "transiente": o app grava o nome do usuário antes de mudar o status
- O trigger lê esse valor e grava no log
- Não é usado para exibição no frontend

### Trigger

```sql
CREATE OR REPLACE FUNCTION log_kanban_status_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO kanban_status_log (kanban_item_id, previous_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, NEW.changed_by);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_kanban_status_change
  AFTER UPDATE ON kanban_items
  FOR EACH ROW
  EXECUTE FUNCTION log_kanban_status_change();
```

## 2. Mudança no Frontend — `lib/supabase-store.ts`

A função `updateKanbanItemStatus` passa `changed_by` junto no `.update()`:

```ts
// Antes
.update({ status, updated_at: new Date().toISOString() })

// Depois
.update({ status, changed_by: userName, updated_at: new Date().toISOString() })
```

O `userName` já está disponível via `useUser()` hook (localStorage).

## 3. API Route — `/api/slack/daily`

### Endpoint

`GET /api/slack/daily`

### Lógica

1. Conecta ao Supabase (server client)
2. **Query 1 — Movimentações:** `kanban_status_log` com `changed_at >= now() - 24h`, join com `kanban_items` para pegar nomes (disciplina, ano, unidade)
3. **Query 2 — Pendências:** `kanban_items` com `status IN ('layout', 'printing')` e `print_approved = true`
4. Monta mensagem Slack com dois blocos
5. Envia via webhook `SLACK_WEBHOOK_RELATORIO`

### Formato da mensagem

**Bloco 1 — Movimentações:**

```
📊 Relatório Diário — Conteúdos (26/03/2026)

Movimentações de hoje:
• Matemática 6º ano — Unidade 1: Produção → Diagramação
• Português 7º ano — Unidade 3: Diagramação → Impressão
• Ciências 8º ano — Unidade 2: Impressão → Concluído

3 movimentações no total
```

Se não houver: _"Nenhuma movimentação hoje."_

**Bloco 2 — Pendências aprovadas:**

```
📋 Pendências — Aprovados para impressão

Em Diagramação (2):
• História 6º ano — Unidade 1
• Geografia 9º ano — Unidade 2

Em Impressão (1):
• Inglês 7º ano — Unidade 4
```

Se não houver pendências aprovadas: _"Nenhum item aprovado pendente."_

## 4. Vercel Cron

Adicionar ao `vercel.json`:

```json
{
  "path": "/api/slack/daily",
  "schedule": "0 22 * * *"
}
```

`0 22 * * *` UTC = 19h Brasília, todo dia.

## 5. Variável de ambiente

| Variável | Destino |
|----------|---------|
| `SLACK_WEBHOOK_RELATORIO` | Webhook do canal `#relatorio-producao` |

Configurar no Vercel Dashboard.

## O que NÃO muda

- Notificações em tempo real (por canal de status) — inalteradas
- Relatório semanal do calendário (`/api/slack/weekly`) — inalterado
- Frontend do Kanban — sem mudança visual
- Board de Caderno de Atividades — não incluído
