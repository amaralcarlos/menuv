import { NextRequest } from 'next/server'
import { supabaseServer } from '@/lib/api-helpers'
import { ok, E, sanitizeEmail, sanitize } from '@/lib/api-helpers'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return E.badRequest('Body JSON inválido.')

  const email = sanitizeEmail(body.email)
  const senha = sanitize(body.senha)

  if (!email) return E.badRequest('E-mail é obrigatório.')
  if (!senha || senha.length < 4) return E.badRequest('Senha inválida.')

  const sb = await supabaseServer()
  const { data, error } = await sb.auth.signInWithPassword({ email, password: senha })

  if (error || !data.user) return E.unauthorized('E-mail ou senha incorretos.')

  const meta = data.user.app_metadata as Record<string, unknown>
  if (meta?.app_role === 'suspenso') {
    await sb.auth.signOut()
    return E.forbidden('Conta suspensa. Entre em contato com o suporte Menuv.')
  }

  return ok({
    role:          meta?.app_role,
    restauranteId: meta?.restaurante_id  ?? null,
    empresaId:     meta?.empresa_id      ?? null,
    colaboradorId: meta?.colaborador_id  ?? null,
    isGestor:      meta?.is_gestor       ?? false,
  })
}
