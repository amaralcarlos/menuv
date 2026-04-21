import { NextRequest } from 'next/server'
import { supabaseServer, supabaseAdmin, ok, E, sanitize, sanitizeEmail, log } from '@/lib/api-helpers'

function parseJwt(token: string) {
  try { return JSON.parse(atob(token.split('.')[1])) } catch { return null }
}

export async function GET(req: NextRequest) {
  const sb = await supabaseServer()
  const { data: { session } } = await sb.auth.getSession()
  if (!session) return E.unauthorized()

  const jwt  = parseJwt(session.access_token)
  const meta = jwt?.app_metadata as any

  const empresaId = req.nextUrl.searchParams.get('empresaId')
  if (!empresaId) return E.badRequest('empresaId é obrigatório.')

  if (meta?.app_role !== 'admin') {
    const { data: emp } = await sb.from('empresas').select('restaurante_id').eq('id', empresaId).single() as any
    const pertenceAoRestaurante = emp?.restaurante_id === meta?.restaurante_id
    const pertenceAoGestor      = meta?.empresa_id === empresaId
    if (!pertenceAoRestaurante && !pertenceAoGestor) return E.forbidden()
  }

  const { data, error } = await sb
    .from('colaboradores')
    .select('id, nome, email, is_gestor, ativo')
    .eq('empresa_id', empresaId).eq('ativo', true).order('nome')
  if (error) return E.internal(error.message)
  return ok(data)
}

export async function POST(req: NextRequest) {
  const sb = await supabaseServer()
  const { data: { session } } = await sb.auth.getSession()
  if (!session) return E.unauthorized()

  const jwt  = parseJwt(session.access_token)
  const meta = jwt?.app_metadata as any

  if (!['restaurante', 'admin', 'colaborador'].includes(meta?.app_role)) return E.forbidden()

  const body = await req.json().catch(() => null)
  if (!body) return E.badRequest()

  const nome      = sanitize(body.nome)
  const email     = sanitizeEmail(body.email)
  const senha     = sanitize(body.senha)
  const empresaId = sanitize(body.empresaId)
  const isGestor  = Boolean(body.isGestor)

  if (!nome)      return E.badRequest('Nome é obrigatório.')
  if (!email)     return E.badRequest('E-mail é obrigatório.')
  if (!senha || senha.length < 4) return E.badRequest('Senha deve ter ao menos 4 caracteres.')
  if (!empresaId) return E.badRequest('empresaId é obrigatório.')

  const admin = supabaseAdmin()

  if (meta?.app_role !== 'admin') {
    const { data: emp } = await admin.from('empresas').select('restaurante_id').eq('id', empresaId).single() as any
    const pertenceAoRestaurante = emp?.restaurante_id === meta?.restaurante_id
    const pertenceAoGestor      = meta?.empresa_id === empresaId
    if (!pertenceAoRestaurante && !pertenceAoGestor) return E.forbidden()
  }

  const { data: dup } = await admin
    .from('colaboradores').select('id').eq('email', email).eq('empresa_id', empresaId).eq('ativo', true).maybeSingle() as any
  if (dup) return E.conflict('Este e-mail já está cadastrado.')

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email, password: senha, email_confirm: true,
  })
  if (authErr || !authData.user) return E.internal(authErr?.message ?? 'Erro ao criar usuário.')

  const { data: colab, error: dbErr } = await admin
    .from('colaboradores')
    .insert({ nome, email, empresa_id: empresaId, is_gestor: isGestor, ativo: true, auth_user_id: authData.user.id })
    .select('id').single() as any

  if (dbErr) {
    await admin.auth.admin.deleteUser(authData.user.id)
    return E.internal(dbErr.message)
  }

  await log('COLAB_CRIADO', `${nome} (${email})`, colab.id)
  return ok({ id: colab.id }, 201)
}
