import { NextRequest } from 'next/server'
import { supabaseServer, supabaseAdmin, ok, E, sanitize, log } from '@/lib/api-helpers'

function parseJwt(token: string) {
  try { return JSON.parse(atob(token.split('.')[1])) } catch { return null }
}

export async function GET(req: NextRequest) {
  const sb = await supabaseServer()
  const { data: { session } } = await sb.auth.getSession()
  if (!session) return E.unauthorized()

  const jwt  = parseJwt(session.access_token)
  const meta = jwt?.app_metadata as any

  const restId = (req.nextUrl.searchParams.get('restauranteId') ?? meta?.restaurante_id ?? '').trim()
  if (!restId) return E.badRequest('restauranteId é obrigatório.')

  if (meta?.app_role === 'colaborador') {
    const { data, error } = await sb
      .from('empresas')
      .select('id, nome, horario_limite, preco_por_refeicao, ativa, formato')
      .eq('id', meta?.empresa_id).eq('ativa', true)
    if (error) return E.internal(error.message)
    return ok(data ?? [])
  }

  if (meta?.app_role !== 'admin' && meta?.restaurante_id !== restId) {
    return E.forbidden()
  }

  const { data, error } = await sb
    .from('empresas')
    .select('id, nome, horario_limite, preco_por_refeicao, ativa, formato')
    .eq('restaurante_id', restId).eq('ativa', true).order('nome')
  if (error) return E.internal(error.message)
  return ok(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return E.badRequest()

  const nome           = sanitize(body.nome)
  const restauranteRef = sanitize(body.restauranteRef ?? '')
  const hl             = sanitize(body.horarioLimite) || '09:30'
  const preco          = parseFloat(String(body.preco ?? '15')) || 15
  const colabId        = sanitize(body.colabId ?? '')
  const formato        = sanitize(body.formato ?? 'marmita')

  if (!nome)           return E.badRequest('Nome da empresa é obrigatório.')
  if (!restauranteRef) return E.badRequest('Referência do restaurante é obrigatória.')

  const admin = supabaseAdmin()
  const { data: rest } = await admin
    .from('restaurantes').select('id, ativo').eq('id', restauranteRef).maybeSingle() as any
  if (!rest || !rest.ativo) return E.notFound('Restaurante não encontrado.')

  const { data: emp, error } = await admin
    .from('empresas')
    .insert({ nome, restaurante_id: rest.id, horario_limite: hl, preco_por_refeicao: preco, formato })
    .select('id').single() as any
  if (error) return E.internal(error.message)

  if (colabId) {
    await admin.from('colaboradores')
      .update({ empresa_id: emp.id })
      .eq('id', colabId)
  }

  await log('EMPRESA_CRIADA', `${nome} → ${rest.id}`, emp.id)
  return ok({ id: emp.id }, 201)
}
