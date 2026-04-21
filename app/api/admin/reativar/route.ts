import { NextRequest } from 'next/server'
import { supabaseServer, ok, E, sanitize, log } from '@/lib/api-helpers'

function parseJwt(token: string) {
  try { return JSON.parse(atob(token.split('.')[1])) } catch { return null }
}

export async function POST(req: NextRequest) {
  const sb = await supabaseServer()
  const { data: { session } } = await sb.auth.getSession()
  if (!session) return E.unauthorized()

  const meta = parseJwt(session.access_token)?.app_metadata as any
  if (meta?.app_role !== 'admin') return E.forbidden()

  const body = await req.json().catch(() => null)
  if (!body) return E.badRequest()

  const tipo      = body.tipo === 'empresa' ? 'empresa' : 'restaurante'
  const titularId = sanitize(body.titularId)
  if (!titularId) return E.badRequest('titularId é obrigatório.')

  if (tipo === 'restaurante') {
    await sb.from('restaurantes').update({ ativo: true }).eq('id', titularId)
  } else {
    await sb.from('empresas').update({ ativa: true }).eq('id', titularId)
  }

  const colFk = tipo === 'restaurante' ? 'restaurante_id' : 'empresa_id'
  await sb.from('planos').upsert({
    titular_tipo: tipo, [colFk]: titularId,
    plano: 'ativo', status: 'ativo', observacao: 'Reativado pelo admin',
  }, { onConflict: colFk })

  await log('ACESSO_REATIVADO', `${tipo} ${titularId}`)
  return ok({})
}
