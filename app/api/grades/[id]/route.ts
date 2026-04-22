import { NextRequest } from 'next/server'
import { supabaseServer, ok, E, log } from '@/lib/api-helpers'

function parseJwt(token: string) {
  try { return JSON.parse(atob(token.split('.')[1])) } catch { return null }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id) return E.badRequest()

  const sb = await supabaseServer()
  const { data: { session } } = await sb.auth.getSession()
  if (!session) return E.unauthorized()
  const meta = parseJwt(session.access_token)?.app_metadata as any

  if (meta?.app_role !== 'admin') {
    const { data: g } = await sb.from('grades').select('restaurante_id').eq('id', id).single() as any
    if (!g || g.restaurante_id !== meta?.restaurante_id) return E.forbidden()
  }

  const { error } = await sb.from('grades').delete().eq('id', id)
  if (error) return E.internal(error.message)

  await log('GRADE_REMOVIDA', id)
  return ok({})
}
