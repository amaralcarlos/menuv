import { supabaseServer, ok, E, withAuth, log } from '@/lib/api-helpers'

export const DELETE = withAuth(['restaurante', 'rest_usuario', 'admin'])(
  async (_req, meta, params) => {
    const id = params?.id
    if (!id) return E.badRequest()
    const sb = await supabaseServer()
    if (meta.app_role !== 'admin') {
      const { data: g } = await sb.from('grades').select('restaurante_id').eq('id', id).single()
      if (!g || g.restaurante_id !== meta.restaurante_id) return E.forbidden()
    }
    const { error } = await sb.from('grades').delete().eq('id', id)
    if (error) return E.internal(error.message)
    await log('GRADE_REMOVIDA', id)
    return ok({})
  }
)
