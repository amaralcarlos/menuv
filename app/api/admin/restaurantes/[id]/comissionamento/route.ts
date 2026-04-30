import { NextRequest } from 'next/server'
import { supabaseAdmin, getAppMeta, ok, E, log } from '@/lib/api-helpers'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const meta = await getAppMeta()
  if (!meta) return E.unauthorized()
  if (meta.app_role !== 'admin') return E.forbidden()

  const { id } = await params
  if (!id) return E.badRequest()

  const body  = await req.json().catch(() => null)
  const admin = supabaseAdmin()

  const { data: rest }: { data: any } = await admin
    .from('restaurantes')
    .select('id, nome, comissionamento_ativo')
    .eq('id', id)
    .single() as any

  if (!rest) return E.notFound('Restaurante não encontrado.')

  const novoValor = typeof body?.ativo === 'boolean'
    ? body.ativo
    : !rest.comissionamento_ativo

  const { error } = await admin
    .from('restaurantes')
    .update({ comissionamento_ativo: novoValor })
    .eq('id', id)

  if (error) return E.internal(error.message)

  await log(
    'COMISSIONAMENTO_ALTERADO',
    `${rest.nome} → ${novoValor ? 'ativo' : 'desativado'} (admin)`
  )
  return ok({ id, comissionamento_ativo: novoValor })
}
