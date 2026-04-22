import { NextRequest } from 'next/server'
import { supabaseServer, ok, E } from '@/lib/api-helpers'

function parseJwt(token: string) {
  try { return JSON.parse(atob(token.split('.')[1])) } catch { return null }
}

export async function GET(req: NextRequest) {
  const sb = await supabaseServer()
  const { data: { session } } = await sb.auth.getSession()
  if (!session) return E.unauthorized()

  const meta   = parseJwt(session.access_token)?.app_metadata as any
  const mesAno = req.nextUrl.searchParams.get('mesAno')
  const restId = req.nextUrl.searchParams.get('restauranteId') ?? meta?.restaurante_id

  if (!mesAno) return E.badRequest('mesAno é obrigatório (MM/YYYY).')
  if (!restId) return E.badRequest('restauranteId é obrigatório.')
  if (meta?.app_role !== 'admin' && meta?.restaurante_id !== restId) return E.forbidden()

  const parts = mesAno.split('/')
  if (parts.length !== 2) return E.badRequest('Formato inválido. Use MM/YYYY.')
  const [mes, ano] = parts.map(Number)

  const { data: porEmpresa, error } = await sb.rpc('relatorio_mensal', {
    p_restaurante_id: restId, p_mes: mes, p_ano: ano,
  })
  if (error) return E.internal(error.message)

  const empresaIds = (porEmpresa ?? []).map((e: any) => e.empresa_id)
  let colabMap: Record<string, { nome: string; total: number }[]> = {}

  if (empresaIds.length > 0) {
    const inicio = `${ano}-${String(mes).padStart(2,'0')}-01`
    const fim    = new Date(ano, mes, 0).toISOString().split('T')[0]
    const { data: pedidos } = await sb
      .from('pedidos').select('empresa_id, colaboradores(nome)')
      .in('empresa_id', empresaIds).gte('data_pedido', inicio).lte('data_pedido', fim)

    ;(pedidos ?? []).forEach((p: any) => {
      const nome = p.colaboradores?.nome ?? 'Desconhecido'
      if (!colabMap[p.empresa_id]) colabMap[p.empresa_id] = []
      const ex = colabMap[p.empresa_id].find(c => c.nome === nome)
      if (ex) ex.total++
      else colabMap[p.empresa_id].push({ nome, total: 1 })
    })
  }

  const resultado = (porEmpresa ?? []).map((e: any) => ({
    empresaId:     e.empresa_id,
    empresaNome:   e.empresa_nome,
    precoRefeicao: Number(e.preco_refeicao),
    totalPedidos:  Number(e.total_pedidos),
    valorTotal:    Number(e.valor_total),
    colaboradores: colabMap[e.empresa_id] ?? [],
  }))

  return ok({ mesAno, resultado })
}
