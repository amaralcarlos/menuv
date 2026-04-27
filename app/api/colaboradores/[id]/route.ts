import { NextRequest } from 'next/server'
import { supabaseServer, supabaseAdmin, ok, E, sanitize, log } from '@/lib/api-helpers'

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

  const nome     = sanitize(body.nome)
  const isGestor = Boolean(body.isGestor)
  const ativo    = body.ativo !== false
  if (!nome) return E.badRequest('Nome é obrigatório.')

  if (meta?.app_role !== 'admin') {
    const { data: c } = await sb.from('colaboradores').select('empresa_id').eq('id', id).single() as any
    if (!c) return E.notFound()
    const { data: emp } = await sb.from('empresas').select('restaurante_id').eq('id', c.empresa_id).single() as any
    const pertenceAoRestaurante = emp?.restaurante_id === meta?.restaurante_id
    const pertenceAoGestor      = meta?.empresa_id === c.empresa_id
    if (!pertenceAoRestaurante && !pertenceAoGestor) return E.forbidden()
  }

  const { error } = await sb.from('colaboradores')
    .update({ nome, is_gestor: isGestor, ativo }).eq('id', id)
  if (error) return E.internal(error.message)

  await log('COLAB_EDITADO', nome, id)
  return ok({ id })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id) return E.badRequest()

  const sb = await supabaseServer()
  const { data: { session } } = await sb.auth.getSession()
  if (!session) return E.unauthorized()
  const meta = parseJwt(session.access_token)?.app_metadata as any

  if (meta?.app_role !== 'admin') {
    const { data: c } = await sb.from('colaboradores').select('empresa_id').eq('id', id).single() as any
    if (!c) return E.notFound()
    const { data: emp } = await sb.from('empresas').select('restaurante_id').eq('id', c.empresa_id).single() as any
    const pertenceAoRestaurante = emp?.restaurante_id === meta?.restaurante_id
    const pertenceAoGestor      = meta?.empresa_id === c.empresa_id
    if (!pertenceAoRestaurante && !pertenceAoGestor) return E.forbidden()
  }

  const body = await req.json().catch(() => ({}))
  const permanent = body?.permanent === true

  if (permanent) {
    // Apaga pedidos e itens primeiro
    const { data: pedidos } = await sb.from('pedidos').select('id').eq('colaborador_id', id)
    const pedidoIds = (pedidos ?? []).map((p: any) => p.id)
    if (pedidoIds.length > 0) {
      await sb.from('pedido_itens').delete().in('pedido_id', pedidoIds)
      await sb.from('pedidos').delete().in('id', pedidoIds)
    }

    // Busca auth_user_id antes de apagar
    const { data: colab } = await sb.from('colaboradores').select('auth_user_id').eq('id', id).single() as any
    await sb.from('colaboradores').delete().eq('id', id)

    // Apaga do auth
    if (colab?.auth_user_id) {
      const admin = supabaseAdmin()
      await admin.auth.admin.deleteUser(colab.auth_user_id)
    }

    await log('COLAB_EXCLUIDO', id)
  } else {
    const { error } = await sb.from('colaboradores').update({ ativo: false }).eq('id', id)
    if (error) return E.internal(error.message)
    await log('COLAB_REMOVIDO', id)
  }

  return ok({})
}
