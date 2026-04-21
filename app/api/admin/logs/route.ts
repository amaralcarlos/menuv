import { NextRequest } from 'next/server'
import { supabaseServer, ok, E } from '@/lib/api-helpers'

function parseJwt(token: string) {
  try { return JSON.parse(atob(token.split('.')[1])) } catch { return null }
}

export async function GET(req: NextRequest) {
  const sb = await supabaseServer()
  const { data: { session } } = await sb.auth.getSession()
  if (!session) return E.unauthorized()

  const meta = parseJwt(session.access_token)?.app_metadata as any
  if (meta?.app_role !== 'admin') return E.forbidden()

  const limite = Math.min(parseInt(req.nextUrl.searchParams.get('limite') ?? '100'), 500)
  const { data, error } = await sb.from('logs')
    .select('id, criado_em, usuario_id, email, acao, detalhe')
    .order('criado_em', { ascending: false }).limit(limite)
  if (error) return E.internal(error.message)
  return ok({ logs: data ?? [] })
}
