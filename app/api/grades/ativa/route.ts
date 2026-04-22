import { NextRequest } from 'next/server'
import { supabaseServer, ok, E } from '@/lib/api-helpers'

function parseJwt(token: string) {
  try { return JSON.parse(atob(token.split('.')[1])) } catch { return null }
}

export async function GET(req: NextRequest) {
  const sb = await supabaseServer()
  const { data: { session } } = await sb.auth.getSession()
  if (!session) return E.unauthorized()

  const meta   = parseJwt(session.access_token)?.app_metadata as any
  const restId = req.nextUrl.searchParams.get('restauranteId') ?? meta?.restaurante_id ?? ''
  if (!restId) return E.badRequest('restauranteId é obrigatório.')

  const { data, error } = await sb.rpc('get_grade_ativa', { p_restaurante_id: restId })
  if (error) return E.internal(error.message)

  const grade = Array.isArray(data) && data.length > 0 ? data[0] : null
  return ok(grade)
}
