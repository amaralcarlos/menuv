import { NextRequest } from 'next/server'
import { supabaseServer, ok, E, sanitize, toIsoDate, log } from '@/lib/api-helpers'

function parseJwt(token: string) {
  try { return JSON.parse(atob(token.split('.')[1])) } catch { return null }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id) return E.badRequest()

  const sb = await supabaseServer()
  const { data: { session } } = await sb.auth.getSession()
  if (!session) return E.unauthorized()
  const meta = parseJwt(session.access_token)?.app_metadata as any

  const body       = await req.json().catch(() => ({}))
  const dataInicio = body.dataInicio ? toIsoDate(sanitize(body.dataInicio)) : null
  const dataFim    = body.dataFim    ? toIsoDate(sanitize(body.dataFim))    : null

  if (meta?.app_role !== 'admin') {
    const { data: g } = await sb.from('grades').select('restaurante_id').eq('id', id).single() as any
    if (!g || g.restaurante_id !== meta?.restaurante_id) return E.forbidden()
  }

  const { error } = await sb.rpc('publicar_grade', {
    p_grade_id: id, p_data_inicio: dataInicio, p_data_fim: dataFim,
  })
  if (error) return E.internal(error.message)

  await log('GRADE_PUBLICADA', `${id} ${dataInicio ?? ''} → ${dataFim ?? ''}`)
  return ok({})
}
