import { supabaseServer, ok, E, withAuth, sanitize, log } from '@/lib/api-helpers'

export const PUT = withAuth(['restaurante', 'admin'])(
  async (req, meta, params) => {
    const id = params?.id
    if (!id) return E.badRequest()
    const body = await req.json().catch(() => null)
    if (!body) return E.badRequest()

    const nome     = sanitize(body.nome)
    const isGestor = Boolean(body.isGestor)
    const ativo    = body.ativo !== false
    if (!nome) return E.badRequest('Nome é obrigatório.')

    const sb = await supabaseServer()
    if (meta.app_role !== 'admin') {
      const { data: c } = await sb
        .from('colaboradores').select('empresas(restaurante_id)').eq('id', id).single() as any
      const restId = (c?.empresas as any)?.restaurante_id
      if (restId !== meta.restaurante_id) return E.forbidden()
    }

    const { error } = await sb.from('colaboradores')
      .update({ nome, is_gestor: isGestor, ativo }).eq('id', id)
    if (error) return E.internal(error.message)

    await log('COLAB_EDITADO', nome, id)
    return ok({ id })
  }
)

export const DELETE = withAuth(['restaurante', 'admin'])(
  async (_req, meta, params) => {
    const id = params?.id
    if (!id) return E.badRequest()

    const sb = await supabaseServer()
    if (meta.app_role !== 'admin') {
      const { data: c } = await sb
        .from('colaboradores').select('empresas(restaurante_id)').eq('id', id).single() as any
      const restId = (c?.empresas as any)?.restaurante_id
      if (restId !== meta.restaurante_id) return E.forbidden()
    }

    const { error } = await sb.from('colaboradores').update({ ativo: false }).eq('id', id)
    if (error) return E.internal(error.message)

    await log('COLAB_REMOVIDO', id)
    return ok({})
  }
)
