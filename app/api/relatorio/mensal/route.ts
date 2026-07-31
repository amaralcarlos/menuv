import { NextRequest } from 'next/server'
import { supabaseServer, supabaseAdmin, ok, E } from '@/lib/api-helpers'

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

  const inicio = `${ano}-${String(mes).padStart(2,'0')}-01`
  const fim    = new Date(ano, mes, 0).toISOString().split('T')[0]

  const admin = supabaseAdmin()

  // Busca empresas do restaurante
  const { data: empresas } = await admin
    .from('empresas')
    .select('id, nome, preco_por_refeicao')
    .eq('restaurante_id', restId)
    .eq('ativa', true) as any

  if (!empresas?.length) return ok({ mesAno, resultado: [] })

  const empresaIds = empresas.map((e: any) => e.id)

  // Busca preços por produto por empresa
  const { data: empProdutos } = await admin
    .from('empresa_produtos')
    .select('empresa_id, produto_id, preco')
    .in('empresa_id', empresaIds)
    .eq('ativo', true) as any

  // Map: empresa_id → { produto_id → preco }
  const precoMap: Record<string, Record<string, number>> = {}
  ;(empProdutos ?? []).forEach((ep: any) => {
    if (!precoMap[ep.empresa_id]) precoMap[ep.empresa_id] = {}
    precoMap[ep.empresa_id][ep.produto_id] = Number(ep.preco ?? 0)
  })

  // Busca pedidos do período (excluindo manuais)
  const { data: pedidos } = await admin
    .from('pedidos')
    .select('id, empresa_id, colaborador_id, produto_id, data_pedido, origem, colaboradores(id, nome)')
    .in('empresa_id', empresaIds)
    .gte('data_pedido', inicio)
    .lte('data_pedido', fim)
    .order('data_pedido', { ascending: true }) as any

  // Agrupa por empresa
  const byEmpresa: Record<string, any[]> = {}
  ;(pedidos ?? []).forEach((p: any) => {
    if (!byEmpresa[p.empresa_id]) byEmpresa[p.empresa_id] = []
    byEmpresa[p.empresa_id].push(p)
  })

  const resultado = empresas.map((emp: any) => {
    const peds     = byEmpresa[emp.id] ?? []
    const precoPad = emp.preco_por_refeicao ?? 0

    // Calcula valor total usando preço do produto
    let valorTotal = 0
    peds.forEach((p: any) => {
      const preco = p.produto_id && precoMap[emp.id]?.[p.produto_id]
        ? precoMap[emp.id][p.produto_id]
        : precoPad
      valorTotal += preco
    })

    // Agrupa por colaborador
    const colabMap: Record<string, { id: string; nome: string; total: number }> = {}
    peds.forEach((p: any) => {
      const id   = p.colaboradores?.id   ?? p.colaborador_id
      const nome = p.colaboradores?.nome ?? 'Desconhecido'
      if (!colabMap[id]) colabMap[id] = { id, nome, total: 0 }
      colabMap[id].total++
    })

    // Preço médio por refeição para exibição
    const precoMedio = peds.length > 0 ? valorTotal / peds.length : precoPad

    return {
      empresaId:     emp.id,
      empresaNome:   emp.nome,
      precoRefeicao: precoMedio,
      totalPedidos:  peds.length,
      valorTotal,
      colaboradores: Object.values(colabMap),
    }
  })

  return ok({ mesAno, resultado })
}
