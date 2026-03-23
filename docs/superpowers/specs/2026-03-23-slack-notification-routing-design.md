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

- If `boardType === 'workbook'` → return `SLACK_WEBHOOK_CADERNO`
- If `boardType === 'content'` → return webhook mapped to `newStatus`:
  - `production` → `SLACK_WEBHOOK_PRODUCAO`
  - `layout` → `SLACK_WEBHOOK_DIAGRAMACAO`
  - `printing` → `SLACK_WEBHOOK_IMPRESSAO`
  - `completed` → `SLACK_WEBHOOK_CONCLUIDO`
- If the resolved webhook is not configured → return `null` (silently skip)

## File Changes

| File | Change |
|---|---|
| `lib/slack.ts` | Add `CONTENT_WEBHOOK_MAP` and `getWebhookUrl()` function |
| `app/api/slack/notify/route.ts` | Use `getWebhookUrl()` instead of `process.env.SLACK_WEBHOOK_URL` |
| `.env.example` | Replace `SLACK_WEBHOOK_URL` with 5 new webhook variables |

## No Changes Required

- `hooks/use-production-data.ts` — already sends `boardType` and `newStatus` in the payload
- `app/api/slack/weekly/route.ts` — unrelated, keeps its own webhook
- Message format (`formatSlackMessage`) — unchanged
