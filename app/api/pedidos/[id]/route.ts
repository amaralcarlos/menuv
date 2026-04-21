import { NextRequest } from 'next/server'
import { supabaseServer, ok, E, sanitize, log } from '@/lib/api-helpers'

function parseJwt(token: string) {
  try { return JSON.parse(atob(token.split('.')[1])) } catch { return null }
}

async function getSession() {
  const sb = await supabaseServer()
  const { data: { session } } = await sb.auth.getSession()
  return session
}

async function getOwner(pedidoId: string) {
  const sb = await supabaseServer()
  const { data } = await sb.from('pedidos')
    .select('colaborador_id, empresa_id, empresas(restaurante_id)')
    .eq('id', pedidoId).single() as any
  return data as any
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params?.id
  if (!id) return E.badRequest()

  const session = await getSession()
  if (!session) return E.unauthorized()
  const meta = parseJwt(session.access_token)?.app_metadata as any

  const body = await req.json().catch(() => null)
  if (!body) return E.badRequest()

  const itens = (body.itens ?? []).map((i: unknown) => sanitize(i)).filter(Boolean)
  const obs   = sanitize(body.obs ?? '')

  const owner = await getOwner(id)
  if (!owner) return E.notFound('Pedido não encontrado.')

  if (meta?.app_role === 'colaborador' && owner.colaborador_id !== meta?.colaborador_id) return E.forbidden()
  if (meta?.app_role !== 'admin' && meta?.app_role !== 'colaborador') {
    if ((owner.empresas as any)?.restaurante_id !== meta?.restaurante_id) return E.forbidden()
  }

  const sb = await supabaseServer()
  await sb.from('pedidos').update({ obs }).eq('id', id)
  await sb.from('pedido_itens').delete().eq('pedido_id', id)
  if (itens.length > 0) {
    await sb.from('pedido_itens').insert(
      itens.map((item: string, ordem: number) => ({ pedido_id: id, item, ordem }))
    )
  }

  await log('PEDIDO_EDITADO', id, owner.colaborador_id)
  return ok({})
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params?.id
  if (!id) return E.badRequest()

  const session = await getSession()
  if (!session) return E.unauthorized()
  const meta = parseJwt(session.access_token)?.app_metadata as any

  // Só restaurante e admin podem actualizar status
  if (!['restaurante', 'rest_usuario', 'admin'].includes(meta?.app_role)) return E.forbidden()

  const body = await req.json().catch(() => null)
  if (!body) return E.badRequest()

  const status = sanitize(body.status)
  const validStatus = ['aberto', 'separado', 'despachado', 'reservado', 'confirmado']
  if (!validStatus.includes(status)) return E.badRequest('Status inválido.')

  const owner = await getOwner(id)
  if (!owner) return E.notFound('Pedido não encontrado.')

  if (meta?.app_role !== 'admin') {
    if ((owner.empresas as any)?.restaurante_id !== meta?.restaurante_id) return E.forbidden()
  }

  const sb = await supabaseServer()
  const { error } = await sb.from('pedidos').update({ status }).eq('id', id)
  if (error) return E.internal(error.message)

  await log('PEDIDO_STATUS', `${id} → ${status}`)
  return ok({})
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = params?.id
  if (!id) return E.badRequest()

  const session = await getSession()
  if (!session) return E.unauthorized()
  const meta = parseJwt(session.access_token)?.app_metadata as any

  const owner = await getOwner(id)
  if (!owner) return E.notFound('Pedido não encontrado.')

  if (meta?.app_role === 'colaborador' && owner.colaborador_id !== meta?.colaborador_id) return E.forbidden()
  if (meta?.app_role !== 'admin' && meta?.app_role !== 'colaborador') {
    if ((owner.empresas as any)?.restaurante_id !== meta?.restaurante_id) return E.forbidden()
  }

  const sb = await supabaseServer()
  const { error } = await sb.from('pedidos').delete().eq('id', id)
  if (error) return E.internal(error.message)

  await log('PEDIDO_EXCLUIDO', id)
  return ok({})
}
