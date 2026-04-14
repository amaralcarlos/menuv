import { NextRequest } from 'next/server'
import { supabaseServer, ok, E, withAuth } from '@/lib/api-helpers'

export const GET = withAuth(['admin'])(
  async (req) => {
    const limite = Math.min(parseInt(req.nextUrl.searchParams.get('limite') ?? '100'), 500)
    const sb = await supabaseServer()
    const { data, error } = await sb.from('logs')
      .select('id, criado_em, usuario_id, email, acao, detalhe')
      .order('criado_em', { ascending: false }).limit(limite)
    if (error) return E.internal(error.message)
    return ok({ logs: data ?? [] })
  }
)
