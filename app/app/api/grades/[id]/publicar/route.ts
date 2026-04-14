import { NextRequest } from 'next/server'
import { supabaseServer, ok, E, withAuth, sanitize, toIsoDate, log } from '@/lib/api-helpers'

export const PATCH = withAuth(['restaurante', 'rest_usuario', 'admin'])(
  async (req, meta, params) => {
    const id = params?.id
    if (!id) return E.badRequest()
    const body = await req.json().catch(() => ({}))
    const dataInicio = body.dataInicio ? toIsoDate(sanitize(body.dataInicio)) : null
    const dataFim    = body.dataFim    ? toIsoDate(sanitize(body.dataFim))    : null

    const sb = await supabaseServer()
    if (meta.app_role !== 'admin') {
      const { data: g } = await sb.from('grades').select('restaurante_id').eq('id', id).single()
      if (!g || g.restaurante_id !== meta.restaurante_id) return E.forbidden()
    }

    const { error } = await sb.rpc('publicar_grade', {
      p_grade_id: id, p_data_inicio: dataInicio, p_data_fim: dataFim,
    })
    if (error) return E.internal(error.message)
    await log('GRADE_PUBLICADA', `${id} ${dataInicio ?? ''} → ${dataFim ?? ''}`)
    return ok({})
  }
)
