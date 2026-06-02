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
  const hojeStr = hoje.toISOString().split('T')[0]

  const { data: rest }: { data: any } = await admin
    .from('restaurantes')
    .select('id, dia_vencimento')
    .eq('id', restId).single() as any

  if (!rest) return ok({ alerta: null })

  const { data: pagamentos }: { data: any } = await admin
    .from('pagamentos')
    .select('id, valor, status, tipo, vencimento, criado_em')
    .eq('restaurante_id', restId)
    .order('vencimento', { ascending: false }) as any

  const pags = pagamentos ?? []

  const anoAtual  = hoje.getFullYear()
  const mesAtual  = hoje.getMonth()
  const ultimoDia = new Date(anoAtual, mesAtual + 1, 0).getDate()
  const inicioPeriodo = new Date(anoAtual, mesAtual, 1).toISOString()
  const fimPeriodo    = new Date(anoAtual, mesAtual + 1, 0, 23, 59, 59).toISOString()

  // Mês atual já tem pagamento confirmado?
  const pagoMes = pags.find((p: any) =>
    ['RECEIVED', 'CONFIRMED'].includes(p.status) &&
    p.criado_em >= inicioPeriodo &&
    p.criado_em <= fimPeriodo
  )
  if (pagoMes) return ok({ alerta: null })

  // ── Planos longos (anual ou cartão recorrente) ───────────────
  // Verifica pagamento pendente com vencimento FUTURO (ainda não venceu)
  const planoLongoFuturo = pags.find((p: any) =>
    ['pix_anual', 'cartao_mensal'].includes(p.tipo) &&
    p.status === 'PENDING' &&
    p.vencimento > hojeStr
  )
  if (planoLongoFuturo) {
    const diasAte = Math.floor((new Date(planoLongoFuturo.vencimento).getTime() - hoje.getTime()) / 86_400_000)
    if (diasAte <= 5) {
      return ok({
        alerta: {
          tipo:     'proximo',
          mensagem: diasAte === 0 ? 'Seu plano vence hoje!' : `Seu plano vence em ${diasAte} dia${diasAte !== 1 ? 's' : ''}.`,
          valor:    planoLongoFuturo.valor,
        }
      })
    }
    return ok({ alerta: null })
  }

  // Plano longo vencido (PENDING com data passada = não pago)
  const planoLongoVencido = pags.find((p: any) =>
    ['pix_anual', 'cartao_mensal'].includes(p.tipo) &&
    p.status === 'PENDING' &&
    p.vencimento <= hojeStr
  )
  if (planoLongoVencido) {
    const diasAtraso = Math.floor((hoje.getTime() - new Date(planoLongoVencido.vencimento).getTime()) / 86_400_000)
    return ok({
      alerta: {
        tipo:     'vencido',
        mensagem: `Mantenha o seu acesso ao sistema — pagamento vencido há ${diasAtraso} dia${diasAtraso !== 1 ? 's' : ''}.`,
        valor:    planoLongoVencido.valor,
      }
    })
  }

  // ── Plano mensal (dia_vencimento) ────────────────────────────
  const diaVenc = rest.dia_vencimento
  if (!diaVenc) return ok({ alerta: null })

  const diaReal = Math.min(diaVenc, ultimoDia)
  const vencMes = new Date(anoAtual, mesAtual, diaReal)
  const diasAteVenc = Math.floor((vencMes.getTime() - hoje.getTime()) / 86_400_000)

  // Vencido
  if (hoje > vencMes) {
    const diasAtraso = Math.abs(diasAteVenc)
    return ok({
      alerta: {
        tipo:     'vencido',
        mensagem: `Mantenha o seu acesso ao sistema — pagamento vencido há ${diasAtraso} dia${diasAtraso !== 1 ? 's' : ''}.`,
        valor:    null,
      }
    })
  }

  // Vence em até 5 dias
  if (diasAteVenc <= 5) {
    return ok({
      alerta: {
        tipo:     'proximo',
        mensagem: diasAteVenc === 0
          ? `Seu pagamento vence hoje (dia ${diaReal})!`
          : `Seu pagamento vence em ${diasAteVenc} dia${diasAteVenc !== 1 ? 's' : ''} (dia ${diaReal}).`,
        valor:    null,
      }
    })
  }

  return ok({ alerta: null })
}
