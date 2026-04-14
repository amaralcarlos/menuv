import { supabaseServer, ok, E, withAuth, sanitize, log } from '@/lib/api-helpers'

async function getOwner(pedidoId: string) {
  const sb = await supabaseServer()
  const { data } = await sb.from('pedidos')
    .select('colaborador_id, empresa_id, empresas(restaurante_id)')
    .eq('id', pedidoId).single()
  return data as any
}

export const PUT = withAuth(['colaborador', 'restaurante', 'rest_usuario', 'admin'])(
  async (req, meta, params) => {
    const id = params?.id
    if (!id) return E.badRequest()
    const body = await req.json().catch(() => null)
    if (!body) return E.badRequest()

    const itens = (body.itens ?? []).map((i: unknown) => sanitize(i)).filter(Boolean)
    const obs   = sanitize(body.obs ?? '')
    const owner = await getOwner(id)
    if (!owner) return E.notFound('Pedido não encontrado.')

    if (meta.app_role === 'colaborador' && owner.colaborador_id !== meta.colaborador_id) return E.forbidden()
    if (meta.app_role !== 'admin' && meta.app_role !== 'colaborador') {
      if (owner.empresas?.restaurante_id !== meta.restaurante_id) return E.forbidden()
    }

    const sb = await supabaseServer()
    await sb.from('pedidos').update({ obs }).eq('id', id)
    await sb.from('pedido_itens').delete().eq('pedido_id', id)
    if (itens.length > 0) {
      await sb.from('pedido_itens').insert(itens.map((item: string, ordem: number) => ({ pedido_id: id, item, ordem })))
    }
    await log('PEDIDO_EDITADO', id, owner.colaborador_id)
    return ok({})
  }
)

export const DELETE = withAuth(['colaborador', 'restaurante', 'rest_usuario', 'admin'])(
  async (_req, meta, params) => {
    const id = params?.id
    if (!id) return E.badRequest()
    const owner = await getOwner(id)
    if (!owner) return E.notFound('Pedido não encontrado.')

    if (meta.app_role === 'colaborador' && owner.colaborador_id !== meta.colaborador_id) return E.forbidden()
    if (meta.app_role !== 'admin' && meta.app_role !== 'colaborador') {
      if (owner.empresas?.restaurante_id !== meta.restaurante_id) return E.forbidden()
    }

    const sb = await supabaseServer()
    const { error } = await sb.from('pedidos').delete().eq('id', id)
    if (error) return E.internal(error.message)
    await log('PEDIDO_EXCLUIDO', id)
    return ok({})
  }
)
