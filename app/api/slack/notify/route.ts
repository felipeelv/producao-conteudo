import { NextRequest, NextResponse } from 'next/server'
import { SlackNotifyPayload, formatSlackMessage, getWebhookUrl } from '@/lib/slack'

export async function POST(request: NextRequest) {
  let body: SlackNotifyPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { unitName, disciplineName, yearName, bimesterName, previousStatus, newStatus, boardType } = body

  if (!unitName || !disciplineName || !yearName || !bimesterName || !previousStatus || !newStatus || !boardType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (boardType !== 'content' && boardType !== 'workbook') {
    return NextResponse.json({ error: 'Invalid boardType' }, { status: 400 })
  }

  const webhookUrl = getWebhookUrl(boardType, newStatus)
  if (!webhookUrl) {
    return NextResponse.json({ ok: true })
  }

  try {
    const message = formatSlackMessage(body)
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    })
    console.log('[slack/notify] status:', res.status)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[slack/notify] error:', err)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}
