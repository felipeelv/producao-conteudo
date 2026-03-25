import { KanbanStatus } from '@/lib/types'

export interface SlackNotifyPayload {
  unitName: string
  disciplineName: string
  yearName: string
  bimesterName: string
  previousStatus: KanbanStatus
  newStatus: KanbanStatus
  boardType: 'content' | 'workbook'
  userName?: string
  isApproval?: boolean
}

const STATUS_LABELS: Record<KanbanStatus, string> = {
  production: 'Produção',
  layout: 'Diagramação',
  printing: 'Impressão',
  completed: 'Concluído',
}

const STATUS_EMOJIS: Record<KanbanStatus, string> = {
  production: '🔄',
  layout: '📓✏️',
  printing: '🖨️',
  completed: '✅',
}

const STATUS_COLORS: Record<KanbanStatus, string> = {
  production: '#ef4444',
  layout: '#f59e0b',
  printing: '#3b82f6',
  completed: '#10b981',
}

const BOARD_LABELS: Record<'content' | 'workbook', string> = {
  content: 'Conteúdos',
  workbook: 'Caderno de Atividades',
}

const CONTENT_WEBHOOK_MAP: Record<KanbanStatus, string> = {
  production: 'SLACK_WEBHOOK_PRODUCAO',
  layout: 'SLACK_WEBHOOK_DIAGRAMACAO',
  printing: 'SLACK_WEBHOOK_IMPRESSAO',
  completed: 'SLACK_WEBHOOK_CONCLUIDO',
}

export function getWebhookUrl(boardType: 'content' | 'workbook', newStatus: KanbanStatus): string | null {
  if (boardType === 'workbook') {
    return process.env.SLACK_WEBHOOK_CADERNO ?? null
  }
  const envVar = CONTENT_WEBHOOK_MAP[newStatus]
  return process.env[envVar] ?? null
}

export function formatSlackMessage(payload: SlackNotifyPayload) {
  const { unitName, disciplineName, yearName, bimesterName, previousStatus, newStatus, boardType, userName, isApproval } = payload

  const headerText = isApproval
    ? `✅ Aprovado para impressão — ${BOARD_LABELS[boardType]}`
    : `${STATUS_EMOJIS[newStatus]} Kanban — ${BOARD_LABELS[boardType]}`

  const statusText = isApproval
    ? `*Aprovado para impressão* por ${userName || 'Autor não identificado'}`
    : `${STATUS_LABELS[previousStatus]} → ${STATUS_LABELS[newStatus]}`

  return {
    attachments: [
      {
        color: isApproval ? '#10b981' : STATUS_COLORS[newStatus],
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: headerText,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${disciplineName}* — ${yearName} — ${bimesterName}\n${unitName}`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: statusText,
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `👤 *Feito por:* ${userName || 'Autor não identificado'}`
              }
            ]
          }
        ],
      },
    ],
  }
}
