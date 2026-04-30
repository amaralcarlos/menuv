import { NextRequest } from 'next/server'
import { supabaseAdmin, getAppMeta, ok, E } from '@/lib/api-helpers'
import { syncStatusEmpresas, calcularFatura, detalhesStatus } from '@/lib/status-empresa'

export async function GET(req: NextRequest) {
  const meta = await getAppMeta()
  if (!meta) return E.unauthorized()
  if (meta.app_role !== 'restaurante' && meta.app_role !== 'admin') return E.forbidden()

  const restId = meta.app_role === 'admin'
    ? (req.nextUrl.searchParams.get('restauranteId') ?? '')
    : (meta.restaurante_id ?? '')

  if (!restId) return E.badRequest('restauranteId é obrigatório.')

  // Sincroniza status antes de calcular
  await syncStatusEmpresas(restId)

  const admin = supabaseAdmin()

  const [{ data: rest }, { data: empresas }] = await Promise.all([
    admin.from('restaurantes')
      .select('id, nome, comissionamento_ativo')
      .eq('id', restId)
      .single(),
    admin.from('empresas')
      .select('id, nome, status_plano, trial_inicio')
      .eq('restaurante_id', restId),
  ])

  if (!rest) return E.notFound('Restaurante não encontrado.')

  const fatura = calcularFatura(empresas ?? [], rest.comissionamento_ativo ?? true)

  // Detalha cada empresa para exibição
  const empresasDetalhadas = (empresas ?? []).map(e => ({
    ...e,
    ...detalhesStatus(e.trial_inicio, e.status_plano as any),
  }))

  return ok({ fatura, empresas: empresasDetalhadas })
}
