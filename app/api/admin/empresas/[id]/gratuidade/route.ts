import { NextRequest } from 'next/server'
import { supabaseAdmin, getAppMeta, ok, E, sanitize, log } from '@/lib/api-helpers'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const meta = await getAppMeta()
  if (!meta) return E.unauthorized()
  if (meta.app_role !== 'admin') return E.forbidden()

  const { id } = await params
  if (!id) return E.badRequest()

  const body = await req.json().catch(() => null)
  const motivo = sanitize(body?.motivo ?? '')
  if (!motivo) return E.badRequest('Motivo é obrigatório para conceder gratuidade.')

  const admin = supabaseAdmin()

  const { data: emp } = await admin
    .from('empresas')
    .select('id, nome')
    .eq('id', id)
    .single() as any

  if (!emp) return E.notFound('Empresa não encontrada.')

  const { error } = await admin
    .from('empresas')
    .update({ status_plano: 'gratuito', gratuidade_motivo: motivo })
    .eq('id', id)

  if (error) return E.internal(error.message)

  await log('EMPRESA_GRATUIDADE', `${emp.nome} — motivo: ${motivo}`, id)
  return ok({ id, status_plano: 'gratuito' })
}
