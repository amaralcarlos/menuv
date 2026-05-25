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

  const { data: rest }: { data: any } = await admin
    .from('restaurantes')
    .select('id, dia_vencimento')
    .eq('id', restId).single() as any

  if (!rest) return ok({ alerta: null })

  // Busca todos os pagamentos do restaurante
  const { data: pagamentos }: { data: any } = await admin
    .from('pagamentos')
    .select('id, valor, status, tipo, vencimento, criado_em')
    .eq('restaurante_id', restId)
    .order('vencimento', { ascending: false }) as any

  const pags = pagamentos ?? []

  // ── 1. Planos longos (pix_anual ou cartao_mensal ativo) ──────
  // Verifica se há pagamento pendente com data futura de plano longo
  const planosLongos = pags.filter((p: any) =>
    ['pix_anual', 'cartao_mensal'].includes(p.tipo) &&
    p.status === 'PENDING' &&
    p.vencimento >= hoje.toISOString().split('T')[0]
  )

  if (planosLongos.length > 0) {
    const proximo = planosLongos[0]
    const diasAte = Math.floor((new Date(proximo.vencimento).getTime() - hoje.getTime()) / 86_400_000)
    if (diasAte <= 5) {
      return ok({
        alerta: {
          tipo:     'proximo',
          mensagem: diasAte === 0 ? 'Seu plano vence hoje!' : `Seu plano vence em ${diasAte} dia${diasAte !== 1 ? 's' : ''}.`,
          valor:    proximo.valor,
        }
      })
    }
    return ok({ alerta: null }) // plano longo OK, vence em mais de 5 dias
  }

  // ── 2. Plano mensal — usa dia_vencimento definido pelo admin ─
  const diaVenc = rest.dia_vencimento
  if (!diaVenc) return ok({ alerta: null }) // admin ainda não definiu o dia

  // Calcula data de vencimento do mês atual
  const anoAtual = hoje.getFullYear()
  const mesAtual = hoje.getMonth() // 0-indexed
  // Garante que o dia não ultrapasse o último dia do mês
  const ultimoDia = new Date(anoAtual, mesAtual + 1, 0).getDate()
  const diaReal   = Math.min(diaVenc, ultimoDia)
  const vencMes   = new Date(anoAtual, mesAtual, diaReal)

  // Verifica se o mês atual já foi pago
  const inicioPeriodo = new Date(anoAtual, mesAtual, 1).toISOString()
  const fimPeriodo    = new Date(anoAtual, mesAtual + 1, 0, 23, 59, 59).toISOString()

  const pageMes = pags.find((p: any) =>
    ['RECEIVED', 'CONFIRMED'].includes(p.status) &&
    p.criado_em >= inicioPeriodo &&
    p.criado_em <= fimPeriodo
  )

  if (pageMes) return ok({ alerta: null }) // mês já pago, sem alerta

  const diasAteVenc = Math.floor((vencMes.getTime() - hoje.getTime()) / 86_400_000)

  // Vencido (passou do dia)
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
