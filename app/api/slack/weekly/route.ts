import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const DAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
]

const ITEM_TYPE_LABELS: Record<string, string> = {
  content: 'Conteúdo',
  workbook: 'Caderno',
}

function getWeekRange(): { start: string; end: string; startDate: Date; endDate: Date } {
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
    startDate: monday,
    endDate: sunday,
  }
}

function formatDateHeader(start: Date, end: Date): string {
  const startDay = start.getDate()
  const endDay = end.getDate()
  const startMonth = MONTH_NAMES[start.getMonth()]
  const endMonth = MONTH_NAMES[end.getMonth()]

  if (start.getMonth() === end.getMonth()) {
    return `${startDay} a ${endDay} de ${startMonth}`
  }
  return `${startDay} de ${startMonth} a ${endDay} de ${endMonth}`
}

export async function GET(request: NextRequest) {
  const webhookUrl = process.env.SLACK_WEEKLY_WEBHOOK_URL
  if (!webhookUrl) {
    return NextResponse.json({ error: 'SLACK_WEEKLY_WEBHOOK_URL not configured' }, { status: 500 })
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  const { start, end, startDate, endDate } = getWeekRange()

  const { data, error } = await supabase
    .from('calendar_items')
    .select('*')
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true })

  if (error) {
    console.error('[slack/weekly] supabase error:', error)
    return NextResponse.json({ error: 'Failed to fetch calendar items' }, { status: 500 })
  }

  const grouped: Record<string, typeof data> = {}
  for (const item of data ?? []) {
    if (!grouped[item.date]) grouped[item.date] = []
    grouped[item.date].push(item)
  }

  const blocks: object[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `📅 Calendário da Semana — ${formatDateHeader(startDate, endDate)}`,
      },
    },
  ]

  const sortedDates = Object.keys(grouped).sort()

  if (sortedDates.length === 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '_Nenhum item agendado para esta semana._',
      },
    })
  } else {
    for (const date of sortedDates) {
      const items = grouped[date]
      const dateObj = new Date(`${date}T12:00:00`)
      const dayName = DAY_NAMES[dateObj.getDay()]
      const dayLabel = `*${dayName}, ${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}*`

      const lines = items.map((item: { discipline_name: string; year_name: string; unit_name: string; item_type: string }) => {
        const type = ITEM_TYPE_LABELS[item.item_type] ?? item.item_type
        return `• ${item.discipline_name} ${item.year_name} — ${item.unit_name} _(${type})_`
      })

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${dayLabel}\n${lines.join('\n')}`,
        },
      })
    }
  }

  const message = { blocks }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    })
    console.log('[slack/weekly] status:', res.status)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[slack/weekly] error:', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
