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
  const body = await req.json().catch(() => null)
  const dia = parseInt(body?.dia ?? '0', 10)

  if (!dia || dia < 1 || dia > 31) return E.badRequest('Dia inválido. Use um valor entre 1 e 31.')

  const admin = supabaseAdmin()
  const { data: rest }: { data: any } = await admin
    .from('restaurantes').select('id, nome').eq('id', id).single() as any

  if (!rest) return E.notFound('Restaurante não encontrado.')

  await admin.from('restaurantes').update({ dia_vencimento: dia }).eq('id', id)
  await log('VENCIMENTO_DEFINIDO', `${rest.nome} → dia ${dia}`)

  return ok({ dia_vencimento: dia })
}
