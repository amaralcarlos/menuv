import { NextRequest } from 'next/server'
import { ok, E } from '@/lib/api-helpers'
import { supabaseServer } from '@/lib/api-helpers'

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

  const base      = req.nextUrl.origin
  const cookieHdr = req.headers.get('cookie') ?? ''
  const res       = await fetch(`${base}/api/cardapio/semana?restauranteId=${restId}`, {
    headers: { cookie: cookieHdr },
  })
  if (!res.ok) return E.internal('Erro ao buscar cardápio.')

  const { data: semana } = await res.json() as { data: Array<{ data: string }> }

  const n     = new Date()
  const hoje  = `${String(n.getDate()).padStart(2,'0')}/${String(n.getMonth()+1).padStart(2,'0')}/${n.getFullYear()}`
  return ok(semana?.find(d => d.data === hoje) ?? null)
}
