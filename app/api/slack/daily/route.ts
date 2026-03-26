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
