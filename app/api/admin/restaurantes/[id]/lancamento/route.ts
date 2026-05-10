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

  const body = await req.json().catch(() => null)
  const admin = supabaseAdmin()

  const { data: rest }: { data: any } = await admin
    .from('restaurantes').select('id, nome, plano_lancamento').eq('id', id).single() as any

  if (!rest) return E.notFound('Restaurante não encontrado.')

  const novoValor = typeof body?.ativo === 'boolean' ? body.ativo : !rest.plano_lancamento

  const { error } = await admin
    .from('restaurantes').update({ plano_lancamento: novoValor }).eq('id', id)

  if (error) return E.internal(error.message)

  await log('PLANO_LANCAMENTO', `${rest.nome} → ${novoValor ? 'ativado' : 'desativado'} (admin)`)
  return ok({ id, plano_lancamento: novoValor })
}
