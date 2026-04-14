import { NextRequest } from 'next/server'
import { ok, E, withAuth, sanitize, sanitizeEmail, log } from '@/lib/api-helpers'

export const POST = withAuth(['restaurante', 'rest_usuario', 'admin'])(
  async (req) => {
    const body = await req.json().catch(() => null)
    if (!body) return E.badRequest()

    const para    = sanitizeEmail(body.para)
    const assunto = sanitize(body.assunto)
    const corpo   = sanitize(body.corpo)

    if (!para)    return E.badRequest('E-mail de destino é obrigatório.')
    if (!assunto) return E.badRequest('Assunto é obrigatório.')

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return E.internal('Serviço de e-mail não configurado.')

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    process.env.EMAIL_FROM ?? 'noreply@menuv.app',
        to:      [para],
        subject: assunto,
        text:    corpo,
      }),
    })

    if (!res.ok) return E.internal(`Falha ao enviar e-mail: ${await res.text()}`)
    await log('EMAIL_ENVIADO', `${para} — ${assunto}`)
    return ok({})
  }
)
