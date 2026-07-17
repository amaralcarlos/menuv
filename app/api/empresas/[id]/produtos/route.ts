import { NextRequest } from 'next/server'
import { supabaseAdmin, getAppMeta, ok, E } from '@/lib/api-helpers'

// GET /api/empresas/[id]/produtos — lista produtos liberados para a empresa
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const meta = await getAppMeta()
  if (!meta) return E.unauthorized()

  const { id: empresaId } = await params
  const admin = supabaseAdmin()

  const { data, error } = await admin
    .from('empresa_produtos')
    .select('id, ativo, preco, produto:produto_id(id, nome, descricao, preco_base, tipo)')
    .eq('empresa_id', empresaId) as any

  if (error) return E.internal(error.message)
  return ok(data ?? [])
}

// POST /api/empresas/[id]/produtos — habilita um produto para a empresa
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const meta = await getAppMeta()
  if (!meta) return E.unauthorized()
  if (meta.app_role !== 'restaurante' && meta.app_role !== 'admin') return E.forbidden()

  const { id: empresaId } = await params
  const body = await req.json().catch(() => null)
  const produto_id = body?.produto_id
  const preco      = body?.preco !== undefined ? parseFloat(body.preco) : null

  if (!produto_id) return E.badRequest('produto_id é obrigatório.')

  const admin = supabaseAdmin()

  // Upsert — se já existe, reativa
  const { data, error } = await admin
    .from('empresa_produtos')
    .upsert({ empresa_id: empresaId, produto_id, preco, ativo: true },
             { onConflict: 'empresa_id,produto_id' })
    .select().single() as any

  if (error) return E.internal(error.message)
  return ok(data, 201)
}

// PATCH /api/empresas/[id]/produtos — atualiza preco ou ativo de um produto da empresa
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const meta = await getAppMeta()
  if (!meta) return E.unauthorized()
  if (meta.app_role !== 'restaurante' && meta.app_role !== 'admin') return E.forbidden()

  const { id: empresaId } = await params
  const body = await req.json().catch(() => null)
  const { empresa_produto_id, preco, ativo } = body ?? {}

  if (!empresa_produto_id) return E.badRequest('empresa_produto_id é obrigatório.')

  const admin   = supabaseAdmin()
  const updates: any = {}
  if (preco !== undefined) updates.preco = parseFloat(preco) || 0
  if (ativo !== undefined) updates.ativo = Boolean(ativo)

  const { data, error } = await admin
    .from('empresa_produtos')
    .update(updates)
    .eq('id', empresa_produto_id)
    .eq('empresa_id', empresaId)
    .select().single() as any

  if (error) return E.internal(error.message)
  return ok(data)
}
