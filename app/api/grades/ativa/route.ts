import { NextRequest } from 'next/server'
import { supabaseServer, ok, E, withAuth } from '@/lib/api-helpers'

export const GET = withAuth(['restaurante', 'rest_usuario', 'colaborador', 'admin'])(
  async (req, meta) => {
    const restId = req.nextUrl.searchParams.get('restauranteId') ?? meta.restaurante_id
    if (!restId) return E.badRequest('restauranteId é obrigatório.')
    const sb = await supabaseServer()
    const { data, error } = await sb.rpc('get_grade_ativa', { p_restaurante_id: restId })
    if (error) return E.internal(error.message)
    const grade = Array.isArray(data) && data.length > 0 ? data[0] : null
    return ok(grade)
  }
)
