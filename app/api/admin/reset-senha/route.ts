import { NextRequest } from 'next/server'
import { supabaseServer, supabaseAdmin, ok, E, sanitize, log } from '@/lib/api-helpers'

function parseJwt(token: string) {
  try { return JSON.parse(atob(token.split('.')[1])) } catch { return null }
}

export async function POST(req: NextRequest) {
  const sb = await supabaseServer()
  const { data: { session } } = await sb.auth.getSession()
  if (!session) return E.unauthorized()

  const meta = parseJwt(session.access_token)?.app_metadata as any
  if (meta?.app_role !== 'admin') return E.forbidden()

  const body = await req.json().catch(() => null)
  if (!body) return E.badRequest()

  const authUserId = sanitize(body.authUserId)
  const novaSenha  = sanitize(body.novaSenha)

  if (!authUserId) return E.badRequest('authUserId é obrigatório.')
  if (!novaSenha || novaSenha.length < 4) return E.badRequest('Senha deve ter ao menos 4 caracteres.')

  const admin = supabaseAdmin()
  const { error } = await admin.auth.admin.updateUserById(authUserId, { password: novaSenha })
  if (error) return E.internal(error.message)

  await log('ADMIN_RESET_SENHA', `authUserId=${authUserId}`)
  return ok({})
}
