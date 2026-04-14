import { NextRequest } from 'next/server'
import { supabaseServer, supabaseAdmin, ok, E, sanitize, sanitizeEmail, log } from '@/lib/api-helpers'

export async function GET() {
  const sb = await supabaseServer()
  const { data, error } = await sb
    .from('restaurantes')
    .select('id, nome, email')
    .eq('ativo', true)
    .order('nome')
  if (error) return E.internal(error.message)
  return ok(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return E.badRequest()

  const nome  = sanitize(body.nome)
  const email = sanitizeEmail(body.email)
  const senha = sanitize(body.senha)

  if (!nome)  return E.badRequest('Nome do restaurante é obrigatório.')
  if (!email) return E.badRequest('E-mail é obrigatório.')
  if (!senha || senha.length < 4) return E.badRequest('Senha deve ter ao menos 4 caracteres.')

  const admin = supabaseAdmin()

  const { data: existing } = await admin
    .from('restaurantes').select('id').eq('email', email).eq('ativo', true).maybeSingle()
  if (existing) return E.conflict('E-mail já cadastrado.')

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email, password: senha, email_confirm: true,
  })
  if (authError || !authData.user) return E.internal(authError?.message ?? 'Erro ao criar usuário.')

  const { data: rest, error: dbError } = await admin
    .from('restaurantes')
    .insert({ nome, email, auth_user_id: authData.user.id, ativo: true })
    .select('id, nome, email').single()

  if (dbError) {
    await admin.auth.admin.deleteUser(authData.user.id)
    return E.internal(dbError.message)
  }

  await admin.from('planos').insert({
    restaurante_id: rest.id, titular_tipo: 'restaurante',
    plano: 'trial', status: 'trial',
    trial_inicio: new Date().toISOString().split('T')[0],
    trial_fim: new Date(Date.now() + 14 * 86_400_000).toISOString().split('T')[0],
  })

  await log('REST_CADASTRO', `${nome} (${email})`, rest.id)
  return ok({ id: rest.id, nome: rest.nome, email: rest.email }, 201)
}
