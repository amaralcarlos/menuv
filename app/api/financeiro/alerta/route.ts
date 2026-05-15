import { NextRequest } from 'next/server'
import { supabaseAdmin, getAppMeta, ok, E } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  const meta = await getAppMeta()
  if (!meta) return E.unauthorized()
  if (meta.app_role !== 'restaurante' && meta.app_role !== 'admin') return E.forbidden()

  const restId = meta.app_role === 'admin'
    ? (req.nextUrl.searchParams.get('restauranteId') ?? '')
    : (meta.restaurante_id ?? '')

  if (!restId) return E.forbidden()

  const admin = supabaseAdmin()

  const hoje  = new Date()
  const em5   = new Date(); em5.setDate(em5.getDate() + 5)
  const hojeStr = hoje.toISOString().split('T')[0]
  const em5Str  = em5.toISOString().split('T')[0]

  const { data: pagamentos }: { data: any } = await admin
    .from('pagamentos')
    .select('id, valor, status, tipo, vencimento')
    .eq('restaurante_id', restId)
    .in('status', ['PENDING', 'OVERDUE'])
    .order('vencimento', { ascending: true })
    .limit(5) as any

  if (!pagamentos?.length) return ok({ alerta: null })

  // Vencido
  const vencido = pagamentos.find((p: any) => p.status === 'OVERDUE')
  if (vencido) {
    const diasAtraso = Math.floor(
      (hoje.getTime() - new Date(vencido.vencimento).getTime()) / 86_400_000
    )
    return ok({
      alerta: {
        tipo:       'vencido',
        mensagem:   `Pagamento vencido há ${diasAtraso} dia${diasAtraso !== 1 ? 's' : ''}. Regularize para evitar suspensão.`,
        pagamentoId: vencido.id,
        valor:       vencido.valor,
      }
    })
  }

  // Vence em até 5 dias
  const proximo = pagamentos.find((p: any) =>
    p.status === 'PENDING' && p.vencimento >= hojeStr && p.vencimento <= em5Str
  )
  if (proximo) {
    const diasRestantes = Math.floor(
      (new Date(proximo.vencimento).getTime() - hoje.getTime()) / 86_400_000
    )
    return ok({
      alerta: {
        tipo:       'proximo',
        mensagem:   diasRestantes === 0
          ? `Pagamento vence hoje!`
          : `Pagamento vence em ${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''}.`,
        pagamentoId: proximo.id,
        valor:       proximo.valor,
      }
    })
  }

  return ok({ alerta: null })
}
