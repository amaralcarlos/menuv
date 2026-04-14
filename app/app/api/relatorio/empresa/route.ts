import { NextRequest } from 'next/server'
import { supabaseServer, ok, E, withAuth } from '@/lib/api-helpers'

export const GET = withAuth(['restaurante', 'rest_usuario', 'colaborador', 'admin'])(
  async (req, meta) => {
    const empresaId = req.nextUrl.searchParams.get('empresaId')
    const mesAno    = req.nextUrl.searchParams.get('mesAno')

    if (!empresaId) return E.badRequest('empresaId é obrigatório.')
    if (!mesAno)    return E.badRequest('mesAno é obrigatório (MM/YYYY).')

    const parts = mesAno.split('/')
    if (parts.length !== 2) return E.badRequest('Formato inválido. Use MM/YYYY.')
    const [mes, ano] = parts.map(Number)

    const sb = await supabaseServer()
    const { data: emp } = await sb
      .from('empresas').select('id, nome, preco_por_refeicao, restaurante_id').eq('id', empresaId).single()
    if (!emp) return E.notFound('Empresa não encontrada.')

    const isColab     = meta.app_role === 'colaborador' && meta.empresa_id === empresaId
    const isRestaurante = meta.app_role !== 'colaborador' && meta.restaurante_id === emp.restaurante_id
    if (!isColab && !isRestaurante && meta.app_role !== 'admin') return E.forbidden()

    const inicio = `${ano}-${String(mes).padStart(2,'0')}-01`
    const fim    = new Date(ano, mes, 0).toISOString().split('T')[0]

    const { data: pedidos } = await sb
      .from('pedidos').select('id, colaboradores(id, nome)')
      .eq('empresa_id', empresaId).gte('data_pedido', inicio).lte('data_pedido', fim)

    const cnt: Record<string, number> = {}
    ;(pedidos ?? []).forEach((p: any) => {
      const nome = p.colaboradores?.nome ?? 'Desconhecido'
      cnt[nome] = (cnt[nome] ?? 0) + 1
    })

    const preco = Number(emp.preco_por_refeicao)
    const colaboradores = Object.entries(cnt).map(([nome, total]) => ({ nome, total, valor: total * preco }))

    return ok({
      empresaNome:   emp.nome,
      precoRefeicao: preco,
      totalPedidos:  (pedidos ?? []).length,
      valorTotal:    (pedidos ?? []).length * preco,
      colaboradores,
      mesAno,
    })
  }
)
