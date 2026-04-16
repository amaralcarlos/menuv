import { supabaseServer, ok, E, withAuth, sanitize, log } from '@/lib/api-helpers'

export const PUT = withAuth(['restaurante', 'admin'])(
  async (req, meta, params) => {
    const id = params?.id
    if (!id) return E.badRequest()
    const body = await req.json().catch(() => null)
    if (!body) return E.badRequest()

    const nome  = sanitize(body.nome)
    if (!nome) return E.badRequest('Nome é obrigatório.')
    const hl    = sanitize(body.horarioLimite) || '09:30'
    const preco = parseFloat(String(body.preco ?? '15')) || 15
    const ativa = body.ativa !== false

    const sb = await supabaseServer()
    if (meta.app_role !== 'admin') {
      const { data: emp } = await sb.from('empresas').select('restaurante_id').eq('id', id).single() as any
      if (!emp || emp.restaurante_id !== meta.restaurante_id) return E.forbidden()
    }

    const { error } = await sb.from('empresas')
      .update({ nome, horario_limite: hl, preco_por_refeicao: preco, ativa }).eq('id', id)
    if (error) return E.internal(error.message)

    await log('EMPRESA_EDITADA', nome, id)
    return ok({ id })
  }
)

export const DELETE = withAuth(['restaurante', 'admin'])(
  async (_req, meta, params) => {
    const id = params?.id
    if (!id) return E.badRequest()

    const sb = await supabaseServer()
    if (meta.app_role !== 'admin') {
      const { data: emp } = await sb.from('empresas').select('restaurante_id').eq('id', id).single() as any
      if (!emp || emp.restaurante_id !== meta.restaurante_id) return E.forbidden()
    }

    const { error } = await sb.from('empresas').update({ ativa: false }).eq('id', id)
    if (error) return E.internal(error.message)

    await log('EMPRESA_REMOVIDA', id)
    return ok({})
  }
)
