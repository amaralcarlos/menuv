import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/api-helpers'

// Asaas chama este endpoint quando o status de um pagamento muda.
// Configure em: Asaas → Configurações → Integrações → Webhooks
// URL: https://seudominio.com.br/api/webhooks/asaas

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ ok: false }, { status: 400 })

  const event     = body.event as string       // PAYMENT_RECEIVED, PAYMENT_CONFIRMED, PAYMENT_OVERDUE...
  const payment   = body.payment as any

  if (!payment?.id) return NextResponse.json({ ok: true }) // ignora eventos sem payment

  const admin = supabaseAdmin()

  // Mapeia evento para status interno
  const statusMap: Record<string, string> = {
    PAYMENT_RECEIVED:  'RECEIVED',
    PAYMENT_CONFIRMED: 'CONFIRMED',
    PAYMENT_OVERDUE:   'OVERDUE',
    PAYMENT_REFUNDED:  'REFUNDED',
    PAYMENT_DELETED:   'CANCELED',
    PAYMENT_CANCELED:  'CANCELED',
  }

  const novoStatus = statusMap[event]
  if (!novoStatus) return NextResponse.json({ ok: true }) // evento não mapeado, ignora

  // Atualiza pagamento pelo asaas_payment_id
  const { data: pag }: { data: any } = await admin
    .from('pagamentos')
    .select('id, restaurante_id')
    .eq('asaas_payment_id', payment.id)
    .single() as any

  if (!pag) return NextResponse.json({ ok: true }) // pagamento não encontrado, ignora

  await admin
    .from('pagamentos')
    .update({ status: novoStatus, atualizado_em: new Date().toISOString() })
    .eq('id', pag.id)

  // Log interno
  try {
    await admin.from('logs').insert({
      acao:    `WEBHOOK_${event}`,
      detalhe: `Pagamento ${payment.id} → ${novoStatus}`,
    })
  } catch (_) {} // não falha se log der erro

  return NextResponse.json({ ok: true })
}
