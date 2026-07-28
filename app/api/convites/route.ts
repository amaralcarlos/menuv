import { NextRequest } from 'next/server'
import { supabaseAdmin, getAppMeta, ok, E } from '@/lib/api-helpers'
import { randomBytes } from 'crypto'

// GET /api/convites?empresaId=xxx — busca convite ativo da empresa
export async function GET(req: NextRequest) {
  const empresaId = req.nextUrl.searchParams.get('empresaId')
  if (!empresaId) return E.badRequest('empresaId é obrigatório.')

  const admin = supabaseAdmin()
  const agora = new Date().toISOString()

  const { data } = await admin
    .from('convites')
    .select('id, token, expira_em, usos, criado_em')
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
    .gt('expira_em', agora)
    .order('criado_em', { ascending: false })
    .limit(1)
    .single() as any

  return ok(data ?? null)
}

// POST /api/convites — gera novo convite para a empresa
export async function POST(req: NextRequest) {
  const meta = await getAppMeta()
  if (!meta) return E.unauthorized()

  const isGestor     = meta.app_role === 'colaborador' && meta.is_gestor
  const isRestaurante = meta.app_role === 'restaurante'
  const isAdmin      = meta.app_role === 'admin'

  if (!isGestor && !isRestaurante && !isAdmin) return E.forbidden()

  const body      = await req.json().catch(() => null)
  const empresaId = body?.empresaId ?? meta.empresa_id

  if (!empresaId) return E.badRequest('empresaId é obrigatório.')

  const admin = supabaseAdmin()

  // Desativa convites anteriores da empresa
  await admin
    .from('convites')
    .update({ ativo: false })
    .eq('empresa_id', empresaId)
    .eq('ativo', true)

  // Gera token aleatório de 16 bytes (32 chars hex)
  const token    = randomBytes(16).toString('hex')
  const expiraEm = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await admin
    .from('convites')
    .insert({ token, empresa_id: empresaId, expira_em: expiraEm })
    .select('id, token, expira_em')
    .single() as any

  if (error) return E.internal(error.message)
  return ok(data, 201)
}
