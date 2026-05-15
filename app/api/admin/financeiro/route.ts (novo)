import { supabaseAdmin, getAppMeta, ok, E } from '@/lib/api-helpers'

export async function GET() {
  const meta = await getAppMeta()
  if (!meta) return E.unauthorized()
  if (meta.app_role !== 'admin') return E.forbidden()

  const admin = supabaseAdmin()

  const hoje   = new Date()
  const ini    = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0]
  const fim    = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0]
  const em5    = new Date(); em5.setDate(em5.getDate() + 5)
  const em5Str = em5.toISOString().split('T')[0]
  const hojeStr = hoje.toISOString().split('T')[0]

  const { data: pagamentos }: { data: any } = await admin
    .from('pagamentos')
    .select('id, restaurante_id, valor, status, tipo, vencimento, criado_em')
    .order('vencimento', { ascending: true }) as any

  const { data: restaurantes }: { data: any } = await admin
    .from('restaurantes')
    .select('id, nome, email, ativo')
    .eq('ativo', true) as any

  const pags    = pagamentos ?? []
  const rests   = restaurantes ?? []

  // Receita do mês (RECEIVED + CONFIRMED)
  const receitaMes = pags
    .filter((p: any) => ['RECEIVED','CONFIRMED'].includes(p.status) && p.criado_em >= ini && p.criado_em <= fim + 'T23:59:59')
    .reduce((acc: number, p: any) => acc + Number(p.valor), 0)

  // Receita total
  const receitaTotal = pags
    .filter((p: any) => ['RECEIVED','CONFIRMED'].includes(p.status))
    .reduce((acc: number, p: any) => acc + Number(p.valor), 0)

  // Vencendo em até 5 dias (PENDING)
  const vencendoEmBreve = pags
    .filter((p: any) => p.status === 'PENDING' && p.vencimento >= hojeStr && p.vencimento <= em5Str)
    .map((p: any) => ({
      ...p,
      nomeRest: rests.find((r: any) => r.id === p.restaurante_id)?.nome ?? '—',
      diasRestantes: Math.floor((new Date(p.vencimento).getTime() - hoje.getTime()) / 86_400_000),
    }))

  // Vencidos (OVERDUE)
  const vencidos = pags
    .filter((p: any) => p.status === 'OVERDUE')
    .map((p: any) => ({
      ...p,
      nomeRest: rests.find((r: any) => r.id === p.restaurante_id)?.nome ?? '—',
      diasAtraso: Math.floor((hoje.getTime() - new Date(p.vencimento).getTime()) / 86_400_000),
    }))

  // Pendentes (PENDING fora dos próximos 5 dias)
  const pendentes = pags
    .filter((p: any) => p.status === 'PENDING' && p.vencimento > em5Str)
    .map((p: any) => ({
      ...p,
      nomeRest: rests.find((r: any) => r.id === p.restaurante_id)?.nome ?? '—',
      diasRestantes: Math.floor((new Date(p.vencimento).getTime() - hoje.getTime()) / 86_400_000),
    }))

  // Pagos no mês
    const pagosMes = pags
    .filter((p: any) => ['RECEIVED','CONFIRMED'].includes(p.status) && p.criado_em?.slice(0,7) === hojeStr.slice(0,7))
    .map((p: any) => ({
      ...p,
      nomeRest: rests.find((r: any) => r.id === p.restaurante_id)?.nome ?? '—',
    }))

  return ok({
    resumo: {
      receitaMes:         parseFloat(receitaMes.toFixed(2)),
      receitaTotal:       parseFloat(receitaTotal.toFixed(2)),
      numVencendoEmBreve: vencendoEmBreve.length,
      numVencidos:        vencidos.length,
      numPendentes:       pendentes.length,
      numPagosMes:        pagosMes.length,
    },
    vencendoEmBreve,
    vencidos,
    pendentes,
    pagosMes,
  })
}
