import { NextRequest } from 'next/server'
import { supabaseAdmin, ok, E, withAuth, sanitize, log } from '@/lib/api-helpers'

export const POST = withAuth(['admin'])(
  async (req) => {
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
)
