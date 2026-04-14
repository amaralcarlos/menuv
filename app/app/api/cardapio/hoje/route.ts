import { NextRequest } from 'next/server'
import { ok, E, withAuth } from '@/lib/api-helpers'

export const GET = withAuth(['restaurante', 'rest_usuario', 'colaborador', 'admin'])(
  async (req, meta) => {
    const restId = req.nextUrl.searchParams.get('restauranteId') ?? meta.restaurante_id
    if (!restId) return E.badRequest('restauranteId é obrigatório.')

    const base = req.nextUrl.origin
    const res  = await fetch(`${base}/api/cardapio/semana?restauranteId=${restId}`, {
      headers: { cookie: req.headers.get('cookie') ?? '' },
    })
    if (!res.ok) return E.internal('Erro ao buscar cardápio.')
    const { data: semana } = await res.json() as { data: Array<{ data: string }> }

    const n = new Date()
    const hoje = `${String(n.getDate()).padStart(2,'0')}/${String(n.getMonth()+1).padStart(2,'0')}/${n.getFullYear()}`
    return ok(semana?.find(d => d.data === hoje) ?? null)
  }
)
