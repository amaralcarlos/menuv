import { NextRequest } from 'next/server'
import { supabaseServer, ok, E, withAuth, sanitize, log } from '@/lib/api-helpers'

export const POST = withAuth(['admin'])(
  async (req) => {
    const body = await req.json().catch(() => null)
    if (!body) return E.badRequest()

    const tipo      = body.tipo === 'empresa' ? 'empresa' : 'restaurante'
    const titularId = sanitize(body.titularId)
    if (!titularId) return E.badRequest('titularId é obrigatório.')

    const sb = await supabaseServer()
    if (tipo === 'restaurante') {
      await sb.from('restaurantes').update({ ativo: true }).eq('id', titularId)
    } else {
      await sb.from('empresas').update({ ativa: true }).eq('id', titularId)
    }

    const colFk = tipo === 'restaurante' ? 'restaurante_id' : 'empresa_id'
    await sb.from('planos').upsert({
      titular_tipo: tipo, [colFk]: titularId,
      plano: 'ativo', status: 'ativo', observacao: 'Reativado pelo admin',
    }, { onConflict: colFk })

    await log('ACESSO_REATIVADO', `${tipo} ${titularId}`)
    return ok({})
  }
)
