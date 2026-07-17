import { NextRequest } from 'next/server'
import { supabaseAdmin, getAppMeta, ok, E, sanitize } from '@/lib/api-helpers'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const meta = await getAppMeta()
  if (!meta) return E.unauthorized()
  if (meta.app_role !== 'restaurante' && meta.app_role !== 'admin') return E.forbidden()

  const { id } = await params
  const body   = await req.json().catch(() => null)
  if (!body) return E.badRequest()

  const admin = supabaseAdmin()
  const updates: any = {}
  if (body.nome      !== undefined) updates.nome       = sanitize(body.nome)
  if (body.descricao !== undefined) updates.descricao  = sanitize(body.descricao)
  if (body.preco_base !== undefined) updates.preco_base = parseFloat(body.preco_base) || 0
  if (body.ativo     !== undefined) updates.ativo      = Boolean(body.ativo)

  const { data, error } = await admin
    .from('produtos').update(updates).eq('id', id).select().single() as any

  if (error) return E.internal(error.message)
  return ok(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const meta = await getAppMeta()
  if (!meta) return E.unauthorized()
  if (meta.app_role !== 'restaurante' && meta.app_role !== 'admin') return E.forbidden()

  const { id } = await params
  const admin  = supabaseAdmin()

  // Soft delete — desativa o produto
  const { error } = await admin
    .from('produtos').update({ ativo: false }).eq('id', id)

  if (error) return E.internal(error.message)
  return ok({ id, ativo: false })
}
