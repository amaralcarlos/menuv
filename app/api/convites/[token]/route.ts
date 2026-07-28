import { NextRequest } from 'next/server'
import { supabaseAdmin, ok, E } from '@/lib/api-helpers'

// GET /api/convites/[token] — valida token e retorna empresa
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!token) return E.badRequest('Token inválido.')

  const admin = supabaseAdmin()
  const agora = new Date().toISOString()

  const { data: convite } = await admin
    .from('convites')
    .select('id, empresa_id, expira_em, ativo, empresas(id, nome, restaurante_id)')
    .eq('token', token)
    .single() as any

  if (!convite)          return E.notFound('Convite não encontrado.')
  if (!convite.ativo)    return E.badRequest('Este convite foi desativado.')
  if (convite.expira_em < agora) return E.badRequest('Este convite expirou.')

  return ok({
    empresaId:     convite.empresa_id,
    empresaNome:   convite.empresas?.nome,
    restauranteId: convite.empresas?.restaurante_id,
    expiraEm:      convite.expira_em,
  })
}

// POST /api/convites/[token]/usar — registra uso do convite
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const admin = supabaseAdmin()
  const agora = new Date().toISOString()

  const { data: convite } = await admin
    .from('convites')
    .select('id, expira_em, ativo')
    .eq('token', token)
    .single() as any

  if (!convite || !convite.ativo || convite.expira_em < agora)
    return E.badRequest('Convite inválido ou expirado.')

  await admin
    .from('convites')
    .update({ usos: convite.usos + 1 })
    .eq('id', convite.id)

  return ok({ ok: true })
}
