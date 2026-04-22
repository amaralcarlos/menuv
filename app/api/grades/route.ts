import { NextRequest } from 'next/server'
import { supabaseServer, ok, E, sanitize, log } from '@/lib/api-helpers'

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
  if (meta?.app_role !== 'admin' && meta?.restaurante_id !== restId) return E.forbidden()

  const { data, error } = await sb
    .from('grades')
    .select('id, nome, status, dias, data_inicio, data_fim, criado_em, atualizado_em')
    .eq('restaurante_id', restId).order('criado_em', { ascending: false })
  if (error) return E.internal(error.message)
  return ok(data)
}

export async function POST(req: NextRequest) {
  const sb = await supabaseServer()
  const { data: { session } } = await sb.auth.getSession()
  if (!session) return E.unauthorized()

  const meta = parseJwt(session.access_token)?.app_metadata as any
  const body = await req.json().catch(() => null)
  if (!body) return E.badRequest()

  const nome   = sanitize(body.nome)
  const restId = sanitize(body.restauranteId) || meta?.restaurante_id
  const dias   = body.dias ?? {}

  if (!nome)   return E.badRequest('Nome da grade é obrigatório.')
  if (!restId) return E.badRequest('restauranteId é obrigatório.')
  if (meta?.app_role !== 'admin' && meta?.restaurante_id !== restId) return E.forbidden()

  if (body.id) {
    const { error } = await sb.from('grades').update({ nome, dias }).eq('id', body.id).eq('restaurante_id', restId)
    if (error) return E.internal(error.message)
    await log('GRADE_SALVA', nome, body.id)
    return ok({ id: body.id })
  }

  const { data, error } = await sb
    .from('grades').insert({ nome, restaurante_id: restId, dias, status: 'rascunho' }).select('id').single() as any
  if (error) return E.internal(error.message)
  await log('GRADE_CRIADA', nome, data.id)
  return ok({ id: data.id }, 201)
}
