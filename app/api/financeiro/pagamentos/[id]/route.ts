import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, getAppMeta, ok, E } from '@/lib/api-helpers'

async function cancelarNoAsaas(asaasPaymentId: string) {
  // Tenta cancelar no Asaas — ignora erro se já estiver cancelado
  try {
    await fetch(`https://api.asaas.com/v3/payments/${asaasPaymentId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': process.env.ASAAS_API_KEY!,
      },
    })
  } catch (_) {}
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const meta = await getAppMeta()
    if (!meta) return E.unauthorized()
    if (meta.app_role !== 'restaurante' && meta.app_role !== 'admin') return E.forbidden()

    const { id } = await params
    if (!id) return E.badRequest()

    const admin = supabaseAdmin()

    const { data: pag }: { data: any } = await admin
      .from('pagamentos')
      .select('id, restaurante_id, asaas_payment_id, status')
      .eq('id', id)
      .single() as any

    if (!pag) return E.notFound('Pagamento não encontrado.')

    // Verifica se o restaurante tem permissão
    if (meta.app_role === 'restaurante' && pag.restaurante_id !== meta.restaurante_id)
      return E.forbidden()

    // Só permite cancelar pagamentos pendentes
    if (!['PENDING', 'OVERDUE'].includes(pag.status))
      return E.badRequest('Apenas pagamentos pendentes podem ser cancelados.')

    // Cancela no Asaas
    if (pag.asaas_payment_id) {
      await cancelarNoAsaas(pag.asaas_payment_id)
    }

    // Remove do banco
    await admin.from('pagamentos').delete().eq('id', id)

    return ok({ id, cancelado: true })

  } catch (err: any) {
    console.error('[pagamentos/delete]', err?.message ?? err)
    return E.internal(err?.message ?? 'Erro ao cancelar pagamento.')
  }
}
