import { NextRequest } from 'next/server'
import { supabaseServer, ok, E } from '@/lib/api-helpers'

function parseJwt(token: string) {
  try { return JSON.parse(atob(token.split('.')[1])) } catch { return null }
}

// Calcula o período do ciclo baseado no dia_ciclo da empresa e no mesAno informado
// Ex: dia_ciclo=21, mesAno=05/2026 → 21/05/2026 a 20/06/2026
function calcularPeriodoCiclo(diaCiclo: number, mes: number, ano: number) {
  // Início: dia_ciclo do mês informado
  const inicio = new Date(ano, mes - 1, diaCiclo)

  // Fim: dia_ciclo - 1 do mês seguinte
  const fimDate = new Date(ano, mes, diaCiclo - 1)

  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return {
    inicio:      fmt(inicio),
    fim:         fmt(fimDate),
    labelInicio: `${String(diaCiclo).padStart(2,'0')}/${String(mes).padStart(2,'0')}/${ano}`,
    labelFim:    `${String(diaCiclo - 1).padStart(2,'0')}/${String(mes + 1 > 12 ? 1 : mes + 1).padStart(2,'0')}/${mes + 1 > 12 ? ano + 1 : ano}`,
  }
}

export async function GET(req: NextRequest) {
  const sb = await supabaseServer()
  const { data: { session } } = await sb.auth.getSession()
  if (!session) return E.unauthorized()

  const meta      = parseJwt(session.access_token)?.app_metadata as any
  const empresaId = req.nextUrl.searchParams.get('empresaId')
  const mesAno    = req.nextUrl.searchParams.get('mesAno')

  if (!empresaId) return E.badRequest('empresaId é obrigatório.')
  if (!mesAno)    return E.badRequest('mesAno é obrigatório (MM/YYYY).')

  const parts = mesAno.split('/')
  if (parts.length !== 2) return E.badRequest('Formato inválido. Use MM/YYYY.')
  const [mes, ano] = parts.map(Number)

  const { data: emp } = await sb
    .from('empresas')
    .select('id, nome, preco_por_refeicao, restaurante_id, dia_ciclo')
    .eq('id', empresaId).single() as any

  if (!emp) return E.notFound('Empresa não encontrada.')

  const isColab       = meta?.app_role === 'colaborador' && meta?.empresa_id === empresaId
  const isRestaurante = meta?.app_role !== 'colaborador' && meta?.restaurante_id === emp.restaurante_id
  if (!isColab && !isRestaurante && meta?.app_role !== 'admin') return E.forbidden()

  // Usa ciclo personalizado se definido, senão mês calendário
  const diaCiclo = emp.dia_ciclo && emp.dia_ciclo > 1 ? emp.dia_ciclo : null

  let inicio: string, fim: string, periodoLabel: string

  if (diaCiclo) {
    const periodo = calcularPeriodoCiclo(diaCiclo, mes, ano)
    inicio       = periodo.inicio
    fim          = periodo.fim
    periodoLabel = `${periodo.labelInicio} a ${periodo.labelFim}`
  } else {
    inicio       = `${ano}-${String(mes).padStart(2,'0')}-01`
    fim          = new Date(ano, mes, 0).toISOString().split('T')[0]
    periodoLabel = mesAno
  }

  const { data: pedidos } = await sb
    .from('pedidos')
    .select('id, produto_id, colaboradores(id, nome)')
    .eq('empresa_id', empresaId)
    .gte('data_pedido', inicio)
    .lte('data_pedido', fim) as any

  // Busca subsídios por produto da empresa
  const { data: empProdutos } = await sb
    .from('empresa_produtos')
    .select('produto_id, preco, subsidio, produto:produto_id(nome, preco_base)')
    .eq('empresa_id', empresaId) as any

  const subsidioMap: Record<string, { subsidio: number; preco: number; nome: string }> = {}
  ;(empProdutos ?? []).forEach((ep: any) => {
    subsidioMap[ep.produto_id] = {
      subsidio: Number(ep.subsidio ?? 0),
      preco:    Number(ep.preco ?? ep.produto?.preco_base ?? 0),
      nome:     ep.produto?.nome ?? '',
    }
  })

  const { data: todosColabs } = await sb
    .from('colaboradores')
    .select('id, nome')
    .eq('empresa_id', empresaId)
    .eq('ativo', true) as any

  const cnt: Record<string, number> = {}
  ;(pedidos ?? []).forEach((p: any) => {
    const nome = p.colaboradores?.nome ?? 'Desconhecido'
    cnt[nome] = (cnt[nome] ?? 0) + 1
  })

  const preco = Number(emp.preco_por_refeicao)

  // Calcula por colaborador com subsídio por produto
  const pedidosPorColab: Record<string, any[]> = {}
  ;(pedidos ?? []).forEach((p: any) => {
    const nome = p.colaboradores?.nome ?? 'Desconhecido'
    if (!pedidosPorColab[nome]) pedidosPorColab[nome] = []
    pedidosPorColab[nome].push(p)
  })

  const colaboradores = (todosColabs ?? []).map((c: any) => {
    const peds = pedidosPorColab[c.nome] ?? []
    let valorBruto   = 0
    let valorSubsidio = 0
    peds.forEach((p: any) => {
      const info = p.produto_id ? subsidioMap[p.produto_id] : null
      const precoProd = info?.preco ?? preco
      const sub       = info?.subsidio ?? 0
      valorBruto    += precoProd
      valorSubsidio += sub
    })
    return {
      id:           c.id,
      nome:         c.nome,
      total:        peds.length,
      valorBruto,
      valorSubsidio,
      valorColab:   Math.max(0, valorBruto - valorSubsidio),
    }
  })

  const totalBruto    = colaboradores.reduce((a: number, c: any) => a + c.valorBruto, 0)
  const totalSubsidio = colaboradores.reduce((a: number, c: any) => a + c.valorSubsidio, 0)
  const totalColab    = colaboradores.reduce((a: number, c: any) => a + c.valorColab, 0)

  return ok({
    empresaNome:   emp.nome,
    preco,
    totalPedidos:  (pedidos ?? []).length,
    valorTotal:    totalBruto,
    totalSubsidio,
    totalColab,
    colaboradores,
    mesAno,
    periodoLabel,
    diaCiclo,
    inicio,
    fim,
  })
}
