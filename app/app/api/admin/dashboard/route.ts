import { supabaseServer, ok, E, withAuth } from '@/lib/api-helpers'

export const GET = withAuth(['admin'])(
  async () => {
    const sb   = await supabaseServer()
    const hoje = new Date()
    const mes  = hoje.getMonth() + 1
    const ano  = hoje.getFullYear()
    const ini  = `${ano}-${String(mes).padStart(2,'0')}-01`
    const fim  = new Date(ano, mes, 0).toISOString().split('T')[0]

    const [
      { data: restaurantes },
      { data: empresas },
      { data: colaboradores },
      { data: pedidosMes },
      { data: planos },
    ] = await Promise.all([
      sb.from('restaurantes').select('id, nome, email, ativo'),
      sb.from('empresas').select('id, nome, restaurante_id, ativa'),
      sb.from('colaboradores').select('id, nome, empresa_id, ativo'),
      sb.from('pedidos').select('id, empresa_id').gte('data_pedido', ini).lte('data_pedido', fim),
      sb.from('planos').select('restaurante_id, empresa_id, plano, status, trial_fim, observacao'),
    ])

    const restAtivos  = (restaurantes ?? []).filter((r: any) => r.ativo)
    const empAtivas   = (empresas     ?? []).filter((e: any) => e.ativa)
    const colabAtivos = (colaboradores ?? []).filter((c: any) => c.ativo)

    const planosMap: Record<string, any> = {}
    ;(planos ?? []).forEach((p: any) => {
      if (p.restaurante_id) planosMap[`rest_${p.restaurante_id}`] = p
      if (p.empresa_id)     planosMap[`emp_${p.empresa_id}`] = p
    })

    const restDetalhes = restAtivos.map((r: any) => {
      const emps  = empAtivas.filter((e: any) => e.restaurante_id === r.id)
      const cols  = colabAtivos.filter((c: any) => emps.some((e: any) => e.id === c.empresa_id))
      const peds  = (pedidosMes ?? []).filter((p: any) => emps.some((e: any) => e.id === p.empresa_id))
      const plano = planosMap[`rest_${r.id}`] ?? {}
      return { id: r.id, nome: r.nome, email: r.email,
        plano: plano.plano ?? 'trial', statusPlano: plano.status ?? 'trial',
        trialFim: plano.trial_fim ?? null, obs: plano.observacao ?? '',
        numEmpresas: emps.length, numColabs: cols.length, numPedidosMes: peds.length }
    })

    return ok({
      mes: `${String(mes).padStart(2,'0')}/${ano}`,
      totais: {
        restaurantes:  restAtivos.length,
        empresas:      empAtivas.length,
        colaboradores: colabAtivos.length,
        pedidosMes:    (pedidosMes ?? []).length,
      },
      restaurantes: restDetalhes,
    })
  }
)
