import { NextRequest } from 'next/server'
import { supabaseAdmin, ok, E, sanitize, sanitizeEmail, log } from '@/lib/api-helpers'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return E.badRequest()

  const nome           = sanitize(body.nome)
  const email          = sanitizeEmail(body.email)
  const senha          = sanitize(body.senha)
  const restauranteRef = sanitize(body.restauranteRef ?? '')
  const empresaId      = sanitize(body.empresaId ?? '')
  const isGestor       = Boolean(body.isGestor)

  if (!nome)  return E.badRequest('Nome é obrigatório.')
  if (!email) return E.badRequest('E-mail é obrigatório.')
  if (!senha || senha.length < 4) return E.badRequest('Senha deve ter ao menos 4 caracteres.')

  const admin = supabaseAdmin()

  // Gestor precisa de restauranteRef
  if (isGestor) {
    if (!restauranteRef) return E.badRequest('Link de convite inválido.')
const { data: rest } = await admin
  .from('restaurantes').select('id, ativo').eq('id', restauranteRef).maybeSingle() as any
    if (!rest || !rest.ativo) return E.notFound('Link de convite inválido ou restaurante inativo.')
  }

  // Colaborador comum precisa de empresaId
  if (!isGestor) {
    if (!empresaId) return E.badRequest('Código da empresa é obrigatório.')
    const { data: emp } = await admin
      .from('empresas').select('id, ativa').eq('id', empresaId).maybeSingle() as any
    if (!emp || !emp.ativa) return E.notFound('Empresa não encontrada ou inativa.')

    // Verifica duplicidade
    const { data: dup } = await admin
      .from('colaboradores').select('id').eq('email', email).eq('empresa_id', empresaId).eq('ativo', true).maybeSingle()
    if (dup) return E.conflict('Este e-mail já está cadastrado.')
  }

  // Cria usuário no Auth
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email, password: senha, email_confirm: true,
  })
  if (authErr || !authData.user) return E.internal(authErr?.message ?? 'Erro ao criar conta.')

  // Gestor é criado sem empresa (vincula no step 2)
  const { data: colab, error: dbErr } = await admin
    .from('colaboradores')
    .insert({
      nome, email,
      empresa_id:   isGestor ? null : empresaId,
      is_gestor:    isGestor,
      ativo:        true,
      auth_user_id: authData.user.id,
    })
    .select('id').single()

  if (dbErr) {
    await admin.auth.admin.deleteUser(authData.user.id)
    return E.internal(dbErr.message)
  }

  await log('CADASTRO', `${nome} (${email}) — ${isGestor ? 'gestor' : 'colaborador'}`, colab.id)
  return ok({ id: colab.id, nome, isGestor }, 201)
}
