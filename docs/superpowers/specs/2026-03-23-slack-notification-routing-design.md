# Slack Notification Routing — Design Spec

## Problem

All Kanban status change notifications go to a single Slack channel via one webhook. With multiple people responsible for different stages and high volume of card movements, the notifications become noise and are hard to follow.

## Solution

Route notifications to dedicated Slack channels based on board type and destination status:

- **Content board** — one channel per status (4 channels), so each person only sees notifications relevant to their stage.
- **Workbook board** — one channel for all transitions.

## Webhook Configuration

Replace the single `SLACK_WEBHOOK_URL` with 5 targeted webhooks:

| Environment Variable | Target Channel | Trigger |
|---|---|---|
| `SLACK_WEBHOOK_PRODUCAO` | `#producao` | Content card moves to Producao |
| `SLACK_WEBHOOK_DIAGRAMACAO` | `#diagramacao` | Content card moves to Diagramacao |
| `SLACK_WEBHOOK_IMPRESSAO` | `#impressao` | Content card moves to Impressao |
| `SLACK_WEBHOOK_CONCLUIDO` | `#concluido` | Content card moves to Concluido |
| `SLACK_WEBHOOK_CADERNO` | `#caderno-atividades` | Any workbook card transition |

The weekly summary webhook (`SLACK_WEEKLY_WEBHOOK_URL`) remains unchanged.

## Routing Logic

New function `getWebhookUrl(boardType, newStatus)` in `lib/slack.ts`:

- If `boardType === 'workbook'` → return `SLACK_WEBHOOK_CADERNO` (regardless of status)
- If `boardType === 'content'` → return webhook mapped to `newStatus`:
  - `production` → `SLACK_WEBHOOK_PRODUCAO`
  - `layout` → `SLACK_WEBHOOK_DIAGRAMACAO`
  - `printing` → `SLACK_WEBHOOK_IMPRESSAO`
  - `completed` → `SLACK_WEBHOOK_CONCLUIDO`
- If the resolved webhook is not configured → return `null`

The status-to-webhook map applies only to `boardType === 'content'`. Workbook always uses `SLACK_WEBHOOK_CADERNO` for all statuses.

## Route Behavior (`app/api/slack/notify/route.ts`)

Execution order:
1. Parse and validate the payload (all fields including `boardType`)
2. Call `getWebhookUrl(boardType, newStatus)`
3. If webhook is `null` → return `200 { ok: true }` (silently skip)
4. Send the notification

This ensures invalid payloads are still rejected with 400, even if the webhook is not configured.

## File Changes

| File | Change |
|---|---|
| `lib/slack.ts` | Add `CONTENT_WEBHOOK_MAP` and `getWebhookUrl()` function |
| `app/api/slack/notify/route.ts` | Use `getWebhookUrl()` instead of `process.env.SLACK_WEBHOOK_URL`; add `boardType` to the presence validation check |
| `.env.example` | Replace `SLACK_WEBHOOK_URL` with 5 new webhook variables + add `SLACK_WEEKLY_WEBHOOK_URL` |

## Deployment Note

All 5 new webhook variables must be configured before deploying. The old `SLACK_WEBHOOK_URL` will no longer be read — notifications will be silently skipped for any webhook not set.

## No Changes Required

- `hooks/use-production-data.ts` — already sends `boardType` and `newStatus` in the payload
- `app/api/slack/weekly/route.ts` — unrelated, keeps its own webhook
- Message format (`formatSlackMessage`) — unchanged
