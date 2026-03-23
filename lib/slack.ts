import { KanbanStatus } from '@/lib/types'

export interface SlackNotifyPayload {
  unitName: string
  disciplineName: string
  yearName: string
  bimesterName: string
  previousStatus: KanbanStatus
  newStatus: KanbanStatus
  boardType: 'content' | 'workbook'
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

export function formatSlackMessage(payload: SlackNotifyPayload) {
  const { unitName, disciplineName, yearName, bimesterName, previousStatus, newStatus, boardType } = payload

  return {
    attachments: [
      {
        color: STATUS_COLORS[newStatus],
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `${STATUS_EMOJIS[newStatus]} Kanban — ${BOARD_LABELS[boardType]}`,
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
              text: `${STATUS_LABELS[previousStatus]} → ${STATUS_LABELS[newStatus]}`,
            },
          },
        ],
      },
    ],
  }
}
