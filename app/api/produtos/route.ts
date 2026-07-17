import { NextRequest } from 'next/server'
import { supabaseAdmin, getAppMeta, ok, E, sanitize } from '@/lib/api-helpers'

// GET /api/produtos?restauranteId=xxx
export async function GET(req: NextRequest) {
  const meta = await getAppMeta()
  if (!meta) return E.unauthorized()

  const admin = supabaseAdmin()
  const restId = meta.app_role === 'admin'
    ? req.nextUrl.searchParams.get('restauranteId') ?? ''
    : meta.restaurante_id ?? ''

  if (!restId) return E.badRequest('restauranteId é obrigatório.')

  const { data, error } = await admin
    .from('produtos')
    .select('id, nome, descricao, preco_base, tipo, ativo')
    .eq('restaurante_id', restId)
    .order('tipo').order('nome') as any

  if (error) return E.internal(error.message)
  return ok(data ?? [])
}

// POST /api/produtos
export async function POST(req: NextRequest) {
  const meta = await getAppMeta()
  if (!meta) return E.unauthorized()
  if (meta.app_role !== 'restaurante' && meta.app_role !== 'admin') return E.forbidden()

  const body = await req.json().catch(() => null)
  if (!body) return E.badRequest()

  const nome      = sanitize(body.nome ?? '')
  const descricao = sanitize(body.descricao ?? '')
  const preco     = parseFloat(body.preco_base ?? '0') || 0
  const tipo      = sanitize(body.tipo ?? 'avulso')
  const restId    = meta.restaurante_id ?? ''

  if (!nome)   return E.badRequest('Nome do produto é obrigatório.')
  if (!restId) return E.forbidden()
  if (!['marmita','buffet','avulso'].includes(tipo)) return E.badRequest('Tipo inválido.')

  const admin = supabaseAdmin()
  const { data, error } = await admin
    .from('produtos')
    .insert({ restaurante_id: restId, nome, descricao, preco_base: preco, tipo })
    .select('id, nome, tipo').single() as any

  if (error) return E.internal(error.message)
  return ok(data, 201)
}
