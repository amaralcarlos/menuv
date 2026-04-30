import { NextRequest } from 'next/server'
import { supabaseAdmin, getAppMeta, ok, E, log } from '@/lib/api-helpers'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const meta = await getAppMeta()
  if (!meta) return E.unauthorized()
  if (meta.app_role !== 'admin') return E.forbidden()

  const { id } = await params
  if (!id) return E.badRequest()

  const admin = supabaseAdmin()

  const { data: emp } = await admin
    .from('empresas')
    .select('id, nome, status_plano')
    .eq('id', id)
    .single()

  if (!emp) return E.notFound('Empresa não encontrada.')
  if (emp.status_plano === 'ativo') return E.conflict('Empresa já está ativa.')

  const { error } = await admin
    .from('empresas')
    .update({ status_plano: 'ativo' })
    .eq('id', id)

  if (error) return E.internal(error.message)

  await log('EMPRESA_CONVERTIDA', `${emp.nome} → ativo (admin)`, id)
  return ok({ id, status_plano: 'ativo' })
}
