import { supabaseServer, ok, E, withAuth, log } from '@/lib/api-helpers'

export const PATCH = withAuth(['restaurante', 'rest_usuario', 'admin'])(
  async (_req, meta, params) => {
    const id = params?.id
    if (!id) return E.badRequest()
    const sb = await supabaseServer()
    if (meta.app_role !== 'admin') {
      const { data: g } = await sb.from('grades').select('restaurante_id').eq('id', id).single() as any
      if (!g || g.restaurante_id !== meta.restaurante_id) return E.forbidden()
    }
    const { error } = await sb.from('grades')
      .update({ status: 'rascunho', data_inicio: null, data_fim: null }).eq('id', id)
    if (error) return E.internal(error.message)
    await log('GRADE_DESPUBLICADA', id)
    return ok({})
  }
)
