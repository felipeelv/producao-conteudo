# Relatório Diário do Kanban via Slack — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enviar um relatório diário às 19h no Slack com movimentações do Kanban de conteúdo e pendências aprovadas para impressão.

**Architecture:** Trigger no Postgres grava automaticamente cada mudança de status numa tabela de audit log. Uma API route (`/api/slack/daily`) consulta o log + itens pendentes e envia uma mensagem formatada via webhook. Vercel Cron dispara às 22h UTC (19h BRT).

**Tech Stack:** Next.js API Route, Supabase (PostgreSQL trigger + tabela), Slack Incoming Webhooks, Vercel Cron

---

## Estrutura de Arquivos

| Ação | Arquivo | Responsabilidade |
|------|---------|-----------------|
| Criar | `scripts/002_kanban_status_log.sql` | Migration: tabela de log + trigger + campo changed_by |
| Modificar | `lib/supabase-store.ts:193-204` | Passar `changed_by` no update de status |
| Criar | `app/api/slack/daily/route.ts` | API route do relatório diário |
| Modificar | `vercel.json` | Adicionar cron das 22h UTC |

---

### Task 1: Migration SQL — tabela de log, trigger e campo auxiliar

**Files:**
- Criar: `scripts/002_kanban_status_log.sql`

- [ ] **Step 1: Criar arquivo de migration**

```sql
-- Migration: tabela de audit log para mudanças de status do kanban
-- Rodar no SQL Editor do Supabase

-- 1. Campo auxiliar para o trigger capturar quem fez a mudança
ALTER TABLE kanban_items ADD COLUMN IF NOT EXISTS changed_by text;

-- 2. Tabela de log
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

-- 3. Trigger function
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

-- 4. Trigger
CREATE TRIGGER trg_kanban_status_change
  AFTER UPDATE ON kanban_items
  FOR EACH ROW
  EXECUTE FUNCTION log_kanban_status_change();
```

- [ ] **Step 2: Rodar a migration no SQL Editor do Supabase**

Abrir o SQL Editor do Supabase, colar o conteúdo de `scripts/002_kanban_status_log.sql` e executar.

- [ ] **Step 3: Verificar que a tabela e o trigger existem**

Rodar no SQL Editor:

```sql
SELECT * FROM kanban_status_log LIMIT 1;
SELECT tgname FROM pg_trigger WHERE tgname = 'trg_kanban_status_change';
```

Esperado: query 1 retorna 0 rows (sem erro), query 2 retorna 1 row com `trg_kanban_status_change`.

- [ ] **Step 4: Commit**

```bash
git add scripts/002_kanban_status_log.sql
git commit -m "feat: add kanban_status_log table and trigger migration"
```

---

### Task 2: Passar `changed_by` no update de status

**Files:**
- Modificar: `lib/supabase-store.ts:193-204`

- [ ] **Step 1: Alterar a assinatura de `updateKanbanItemStatusInDB`**

Em `lib/supabase-store.ts`, a função atual (linhas 193-204):

```ts
export async function updateKanbanItemStatusInDB(id: string, status: KanbanStatus): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('kanban_items')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('Error updating kanban item status:', error)
  }
}
```

Substituir por:

```ts
export async function updateKanbanItemStatusInDB(id: string, status: KanbanStatus, changedBy?: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('kanban_items')
    .update({ status, changed_by: changedBy ?? null, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('Error updating kanban item status:', error)
  }
}
```

- [ ] **Step 2: Passar `userName` na chamada do hook**

Em `hooks/use-production-data.ts`, a função `updateStatus` (linha 148-) já lê o `userName` do localStorage na linha 161. Alterar a chamada na linha 151:

De:

```ts
      await updateKanbanItemStatusInDB(id, status)
```

Para:

```ts
      const userName = typeof window !== 'undefined' ? localStorage.getItem('kanban_user_name') : null
      await updateKanbanItemStatusInDB(id, status, userName ?? undefined)
```

Nota: mover a leitura do `userName` para ANTES da chamada ao DB (hoje está depois, na linha 161). A variável `userName` da linha 161 pode ser removida pois agora é lida antes.

- [ ] **Step 3: Testar manualmente**

1. Abrir o Kanban no browser
2. Mover um item de uma coluna para outra
3. Verificar no Supabase SQL Editor:

```sql
SELECT * FROM kanban_status_log ORDER BY changed_at DESC LIMIT 5;
```

Esperado: 1 registro com `previous_status`, `new_status` e `changed_by` preenchidos.

- [ ] **Step 4: Commit**

```bash
git add lib/supabase-store.ts hooks/use-production-data.ts
git commit -m "feat: pass changed_by to kanban status update for audit log"
```

---

### Task 3: API Route do relatório diário

**Files:**
- Criar: `app/api/slack/daily/route.ts`

- [ ] **Step 1: Criar a API route**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const STATUS_LABELS: Record<string, string> = {
  production: 'Produção',
  layout: 'Diagramação',
  printing: 'Impressão',
  completed: 'Concluído',
}

function formatDate(date: Date): string {
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`
}

export async function GET(request: NextRequest) {
  const webhookUrl = process.env.SLACK_WEBHOOK_RELATORIO
  if (!webhookUrl) {
    return NextResponse.json({ error: 'SLACK_WEBHOOK_RELATORIO not configured' }, { status: 500 })
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // Query 1: Movimentações das últimas 24h
  const { data: logs, error: logsError } = await supabase
    .from('kanban_status_log')
    .select('previous_status, new_status, changed_by, changed_at, kanban_item_id')
    .gte('changed_at', yesterday.toISOString())
    .order('changed_at', { ascending: true })

  if (logsError) {
    console.error('[slack/daily] logs error:', logsError)
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }

  // Buscar dados dos itens que mudaram
  let movementLines: string[] = []
  if (logs && logs.length > 0) {
    const itemIds = [...new Set(logs.map(l => l.kanban_item_id))]
    const { data: items } = await supabase
      .from('kanban_items')
      .select('id, discipline_name, year_name, unit_name')
      .in('id', itemIds)

    const itemMap = new Map((items ?? []).map(i => [i.id, i]))

    movementLines = logs.map(log => {
      const item = itemMap.get(log.kanban_item_id)
      const name = item
        ? `${item.discipline_name} ${item.year_name} — ${item.unit_name}`
        : 'Item removido'
      const from = STATUS_LABELS[log.previous_status] ?? log.previous_status
      const to = STATUS_LABELS[log.new_status] ?? log.new_status
      return `• ${name}: ${from} → ${to}`
    })
  }

  // Query 2: Pendências aprovadas (layout ou printing com print_approved = true)
  const { data: pending, error: pendingError } = await supabase
    .from('kanban_items')
    .select('discipline_name, year_name, unit_name, status')
    .in('status', ['layout', 'printing'])
    .eq('print_approved', true)
    .order('discipline_name', { ascending: true })

  if (pendingError) {
    console.error('[slack/daily] pending error:', pendingError)
    return NextResponse.json({ error: 'Failed to fetch pending items' }, { status: 500 })
  }

  const inLayout = (pending ?? []).filter(i => i.status === 'layout')
  const inPrinting = (pending ?? []).filter(i => i.status === 'printing')

  // Montar blocos da mensagem
  const blocks: object[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `📊 Relatório Diário — Conteúdos (${formatDate(now)})`,
      },
    },
  ]

  // Bloco 1: Movimentações
  if (movementLines.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Movimentações de hoje:*\n${movementLines.join('\n')}\n\n_${movementLines.length} movimentação${movementLines.length > 1 ? 'ões' : ''} no total_`,
      },
    })
  } else {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '_Nenhuma movimentação hoje._',
      },
    })
  }

  blocks.push({ type: 'divider' })

  // Bloco 2: Pendências
  const pendingParts: string[] = []

  if (inLayout.length > 0) {
    const lines = inLayout.map(i => `• ${i.discipline_name} ${i.year_name} — ${i.unit_name}`)
    pendingParts.push(`*Em Diagramação (${inLayout.length}):*\n${lines.join('\n')}`)
  }

  if (inPrinting.length > 0) {
    const lines = inPrinting.map(i => `• ${i.discipline_name} ${i.year_name} — ${i.unit_name}`)
    pendingParts.push(`*Em Impressão (${inPrinting.length}):*\n${lines.join('\n')}`)
  }

  if (pendingParts.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `📋 *Pendências — Aprovados para impressão*\n\n${pendingParts.join('\n\n')}`,
      },
    })
  } else {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '_Nenhum item aprovado pendente._',
      },
    })
  }

  // Enviar para o Slack
  const message = { blocks }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    })
    console.log('[slack/daily] status:', res.status)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[slack/daily] error:', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Testar localmente**

```bash
curl http://localhost:3000/api/slack/daily
```

Esperado: `{"ok":true}` se `SLACK_WEBHOOK_RELATORIO` estiver configurado no `.env.local`, ou `{"error":"SLACK_WEBHOOK_RELATORIO not configured"}` com status 500 se não estiver.

- [ ] **Step 3: Commit**

```bash
git add app/api/slack/daily/route.ts
git commit -m "feat: add daily Kanban report API route for Slack"
```

---

### Task 4: Configurar Vercel Cron

**Files:**
- Modificar: `vercel.json`

- [ ] **Step 1: Adicionar o cron job ao `vercel.json`**

O arquivo atual:

```json
{
  "crons": [
    {
      "path": "/api/slack/weekly",
      "schedule": "0 10 * * 1"
    }
  ]
}
```

Substituir por:

```json
{
  "crons": [
    {
      "path": "/api/slack/weekly",
      "schedule": "0 10 * * 1"
    },
    {
      "path": "/api/slack/daily",
      "schedule": "0 22 * * *"
    }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "feat: add daily Slack report cron at 19h BRT"
```

---

### Task 5: Configurar variável de ambiente e testar end-to-end

- [ ] **Step 1: Criar o canal `#relatorio-producao` no Slack**

Criar o canal e configurar um Incoming Webhook apontando para ele.

- [ ] **Step 2: Adicionar `SLACK_WEBHOOK_RELATORIO` no Vercel**

No Vercel Dashboard → Settings → Environment Variables, adicionar:
- Key: `SLACK_WEBHOOK_RELATORIO`
- Value: URL do webhook do `#relatorio-producao`

- [ ] **Step 3: Deploy e testar**

Após o deploy, disparar manualmente:

```bash
curl https://<seu-dominio>/api/slack/daily
```

Verificar que a mensagem aparece no canal `#relatorio-producao` com os dois blocos (movimentações + pendências).

- [ ] **Step 4: Commit final e push**

```bash
git push origin main
```
