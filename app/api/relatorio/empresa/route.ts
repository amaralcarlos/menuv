import { NextRequest } from 'next/server'
import { supabaseServer, ok, E } from '@/lib/api-helpers'

function parseJwt(token: string) {
  try { return JSON.parse(atob(token.split('.')[1])) } catch { return null }
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
    .select('id, nome, preco_por_refeicao, restaurante_id')
    .eq('id', empresaId).single() as any
  if (!emp) return E.notFound('Empresa não encontrada.')

  const isColab      = meta?.app_role === 'colaborador' && meta?.empresa_id === empresaId
  const isRestaurante = meta?.app_role !== 'colaborador' && meta?.restaurante_id === emp.restaurante_id
  if (!isColab && !isRestaurante && meta?.app_role !== 'admin') return E.forbidden()

  const inicio = `${ano}-${String(mes).padStart(2,'0')}-01`
  const fim    = new Date(ano, mes, 0).toISOString().split('T')[0]

  const { data: pedidos } = await sb
    .from('pedidos')
    .select('id, colaboradores(id, nome)')
    .eq('empresa_id', empresaId)
    .gte('data_pedido', inicio)
    .lte('data_pedido', fim)

  // Todos os colaboradores da empresa
  const { data: todosColabs } = await sb
    .from('colaboradores')
    .select('id, nome')
    .eq('empresa_id', empresaId)
    .eq('ativo', true)

  const cnt: Record<string, number> = {}
  ;(pedidos ?? []).forEach((p: any) => {
    const nome = p.colaboradores?.nome ?? 'Desconhecido'
    cnt[nome] = (cnt[nome] ?? 0) + 1
  })

  const preco = Number(emp.preco_por_refeicao)
  const colaboradores = (todosColabs ?? []).map((c: any) => ({
    nome:  c.nome,
    total: cnt[c.nome] ?? 0,
    valor: (cnt[c.nome] ?? 0) * preco,
  }))

  return ok({
    empresaNome:   emp.nome,
    empresaEmail:  '',
    preco,
    totalPedidos:  (pedidos ?? []).length,
    valorTotal:    (pedidos ?? []).length * preco,
    colaboradores,
    mesAno,
  })
}
