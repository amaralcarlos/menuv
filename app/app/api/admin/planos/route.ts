import { NextRequest } from 'next/server'
import { supabaseServer, ok, E, withAuth, sanitize, toIsoDate, log } from '@/lib/api-helpers'

export const POST = withAuth(['admin'])(
  async (req) => {
    const body = await req.json().catch(() => null)
    if (!body) return E.badRequest()

    const tipo      = body.tipo === 'empresa' ? 'empresa' : 'restaurante'
    const titularId = sanitize(body.titularId)
    const plano     = sanitize(body.plano)
    const status    = sanitize(body.status)
    const obs       = sanitize(body.obs ?? '')
    const trialFim  = body.trialFim ? toIsoDate(sanitize(body.trialFim)) : null

    if (!titularId) return E.badRequest('titularId é obrigatório.')

    const colFk  = tipo === 'restaurante' ? 'restaurante_id' : 'empresa_id'
    const record = {
      titular_tipo:   tipo,
      restaurante_id: tipo === 'restaurante' ? titularId : null,
      empresa_id:     tipo === 'empresa'     ? titularId : null,
      plano, status, trial_fim: trialFim, observacao: obs,
    }

    const sb = await supabaseServer()
    const { error } = await sb.from('planos').upsert(record, { onConflict: colFk })
    if (error) return E.internal(error.message)

    await log('PLANO_SALVO', `${tipo} ${titularId} → ${plano}/${status}`)
    return ok({})
  }
)
