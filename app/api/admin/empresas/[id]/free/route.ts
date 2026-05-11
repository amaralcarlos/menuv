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

  const { data: emp }: { data: any } = await admin
    .from('empresas').select('id, nome, status_plano').eq('id', id).single() as any

  if (!emp) return E.notFound('Empresa não encontrada.')
  if (emp.status_plano === 'free') return E.conflict('Empresa já está no plano free.')

  const { error } = await admin
    .from('empresas').update({ status_plano: 'free' }).eq('id', id)

  if (error) return E.internal(error.message)

  await log('EMPRESA_FREE', `${emp.nome} → plano free (admin)`, id)
  return ok({ id, status_plano: 'free' })
}
