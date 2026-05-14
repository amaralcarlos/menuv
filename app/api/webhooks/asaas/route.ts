import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/api-helpers'

// Responde GET para validação do Asaas
export async function GET() {
  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ ok: true })

    const event   = body.event as string
    const payment = body.payment as any

    // Sempre retorna 200 para o Asaas não pausar o webhook
    if (!payment?.id || !event) return NextResponse.json({ ok: true })

    const statusMap: Record<string, string> = {
      PAYMENT_RECEIVED:  'RECEIVED',
      PAYMENT_CONFIRMED: 'CONFIRMED',
      PAYMENT_OVERDUE:   'OVERDUE',
      PAYMENT_REFUNDED:  'REFUNDED',
      PAYMENT_DELETED:   'CANCELED',
      PAYMENT_CANCELED:  'CANCELED',
    }

    const novoStatus = statusMap[event]
    if (!novoStatus) return NextResponse.json({ ok: true })

    const admin = supabaseAdmin()

    // Busca pagamento pelo asaas_payment_id
    const { data: pag }: { data: any } = await admin
      .from('pagamentos')
      .select('id, restaurante_id')
      .eq('asaas_payment_id', payment.id)
      .single() as any

    // Se não encontrou, ignora mas retorna 200
    if (!pag) return NextResponse.json({ ok: true })

    // Atualiza status
    await admin
      .from('pagamentos')
      .update({ status: novoStatus, atualizado_em: new Date().toISOString() })
      .eq('id', pag.id)

    return NextResponse.json({ ok: true })

  } catch (err: any) {
    console.error('[webhook/asaas]', err?.message ?? err)
    // Retorna 200 mesmo em erro para o Asaas não pausar o webhook
    return NextResponse.json({ ok: true })
  }
}
