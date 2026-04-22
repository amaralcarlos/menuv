import { NextRequest } from 'next/server'
import { supabaseServer, ok, E, sanitize, log } from '@/lib/api-helpers'

function parseJwt(token: string) {
  try { return JSON.parse(atob(token.split('.')[1])) } catch { return null }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id) return E.badRequest()

  const sb = await supabaseServer()
  const { data: { session } } = await sb.auth.getSession()
  if (!session) return E.unauthorized()
  const meta = parseJwt(session.access_token)?.app_metadata as any

  const body = await req.json().catch(() => null)
  if (!body) return E.badRequest()

  const nome    = sanitize(body.nome)
  if (!nome) return E.badRequest('Nome é obrigatório.')
  const hl      = sanitize(body.horarioLimite) || '09:30'
  const preco   = parseFloat(String(body.preco ?? '15')) || 15
  const ativa   = body.ativa !== false
  const formato = sanitize(body.formato ?? 'marmita')

  if (meta?.app_role !== 'admin') {
    const { data: emp } = await sb.from('empresas').select('restaurante_id').eq('id', id).single() as any
    const pertenceAoRestaurante = emp?.restaurante_id === meta?.restaurante_id
    const pertenceAoGestor      = meta?.empresa_id === id
    if (!pertenceAoRestaurante && !pertenceAoGestor) return E.forbidden()
  }

  const { error } = await sb.from('empresas')
    .update({ nome, horario_limite: hl, preco_por_refeicao: preco, ativa, formato }).eq('id', id)
  if (error) return E.internal(error.message)

  await log('EMPRESA_EDITADA', nome, id)
  return ok({ id })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id) return E.badRequest()

  const sb = await supabaseServer()
  const { data: { session } } = await sb.auth.getSession()
  if (!session) return E.unauthorized()
  const meta = parseJwt(session.access_token)?.app_metadata as any

  if (meta?.app_role !== 'admin') {
    const { data: emp } = await sb.from('empresas').select('restaurante_id').eq('id', id).single() as any
    const pertenceAoRestaurante = emp?.restaurante_id === meta?.restaurante_id
    const pertenceAoGestor      = meta?.empresa_id === id
    if (!pertenceAoRestaurante && !pertenceAoGestor) return E.forbidden()
  }

  const { error } = await sb.from('empresas').update({ ativa: false }).eq('id', id)
  if (error) return E.internal(error.message)

  await log('EMPRESA_REMOVIDA', id)
  return ok({})
}
