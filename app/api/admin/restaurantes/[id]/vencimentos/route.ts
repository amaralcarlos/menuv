import { NextRequest } from 'next/server'
import { supabaseAdmin, getAppMeta, ok, E } from '@/lib/api-helpers'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const meta = await getAppMeta()
  if (!meta) return E.unauthorized()
  if (meta.app_role !== 'admin') return E.forbidden()

  const { id: restId } = await params
  const body = await req.json().catch(() => null)

  const dia       = parseInt(body?.dia ?? '0', 10)
  const meses     = parseInt(body?.meses ?? '12', 10)
  const valor     = parseFloat(body?.valor ?? '0')
  const inicio    = body?.inicio as string // YYYY-MM-DD

  if (!dia || dia < 1 || dia > 31)     return E.badRequest('Dia inválido (1–31).')
  if (!meses || meses < 1 || meses > 24) return E.badRequest('Meses inválido (1–24).')
  if (!valor || valor <= 0)             return E.badRequest('Valor inválido.')
  if (!inicio || !/^\d{4}-\d{2}-\d{2}$/.test(inicio)) return E.badRequest('Data de início inválida (YYYY-MM-DD).')

  const admin = supabaseAdmin()

  const { data: rest }: { data: any } = await admin
    .from('restaurantes').select('id, nome').eq('id', restId).single() as any

  if (!rest) return E.notFound('Restaurante não encontrado.')

  // Gera as datas de vencimento mês a mês
  const vencimentos: { restaurante_id: string; valor: number; status: string; tipo: string; vencimento: string }[] = []

  const [anoInicio, mesInicio] = inicio.split('-').map(Number)

  for (let i = 0; i < meses; i++) {
    // Calcula mês e ano
    const mesTotal  = mesInicio - 1 + i  // 0-indexed
    const ano       = anoInicio + Math.floor(mesTotal / 12)
    const mes       = (mesTotal % 12) + 1 // 1-indexed

    // Ajusta dia para o último dia do mês se necessário
    const ultimoDia = new Date(ano, mes, 0).getDate()
    const diaReal   = Math.min(dia, ultimoDia)

    const vencimento = `${ano}-${String(mes).padStart(2, '0')}-${String(diaReal).padStart(2, '0')}`
    vencimentos.push({
      restaurante_id: restId,
      valor,
      status:     'PENDING',
      tipo:       'pix_mensal',
      vencimento,
    })
  }

  const { error } = await admin.from('pagamentos').insert(vencimentos)
  if (error) return E.internal(error.message)

  return ok({
    gerados:     vencimentos.length,
    primeiro:    vencimentos[0].vencimento,
    ultimo:      vencimentos[vencimentos.length - 1].vencimento,
    vencimentos: vencimentos.map(v => v.vencimento),
  })
}
