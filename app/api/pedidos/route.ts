import { NextRequest } from 'next/server'
import { supabaseServer, ok, E, withAuth, sanitize, toIsoDate, log } from '@/lib/api-helpers'

export const GET = withAuth(['restaurante', 'rest_usuario', 'colaborador', 'admin'])(
  async (req, meta) => {
    const dataParam = req.nextUrl.searchParams.get('data')
    const empresaId = req.nextUrl.searchParams.get('empresaId')
    const dataIso   = dataParam ? toIsoDate(dataParam) : new Date().toISOString().split('T')[0]
    if (!dataIso) return E.badRequest('Data inválida. Use DD/MM/YYYY.')

    const sb = await supabaseServer()
    let query = sb.from('pedidos')
      .select('id, data_pedido, obs, criado_em, colaboradores(id,nome), empresas(id,nome), pedido_itens(item,ordem)')
      .eq('data_pedido', dataIso).order('criado_em')

    if (meta.app_role === 'colaborador') {
      query = query.eq('colaborador_id', meta.colaborador_id)
    } else if (empresaId) {
      if (meta.app_role !== 'admin') {
        const { data: emp } = await sb.from('empresas').select('restaurante_id').eq('id', empresaId).single() as any
        if (!emp || emp.restaurante_id !== meta.restaurante_id) return E.forbidden()
      }
      query = query.eq('empresa_id', empresaId)
    }

    const { data, error } = await query
    if (error) return E.internal(error.message)

    const pedidos = (data ?? []).map((p: any) => ({
      id:              p.id,
      data:            p.data_pedido,
      obs:             p.obs,
      colaboradorNome: p.colaboradores?.nome ?? '',
      empresaNome:     p.empresas?.nome ?? '',
      itens:           (p.pedido_itens ?? []).sort((a: any, b: any) => a.ordem - b.ordem).map((i: any) => i.item),
      timestamp:       p.criado_em,
    }))
    return ok(pedidos)
  }
)

export const POST = withAuth(['colaborador', 'restaurante', 'rest_usuario', 'admin'])(
  async (req, meta) => {
    const body = await req.json().catch(() => null)
    if (!body) return E.badRequest()

    const colaboradorId = sanitize(body.colaboradorId) || meta.colaborador_id
    const empresaId     = sanitize(body.empresaId)
    const dataStr       = sanitize(body.data)
    const itens         = (body.itens ?? []).map((i: unknown) => sanitize(i)).filter(Boolean)
    const obs           = sanitize(body.obs ?? '')

    if (!colaboradorId) return E.badRequest('colaboradorId é obrigatório.')
    if (!empresaId)     return E.badRequest('empresaId é obrigatório.')
    if (!dataStr)       return E.badRequest('data é obrigatório.')

    const dataIso = toIsoDate(dataStr)
    if (!dataIso) return E.badRequest('Formato de data inválido.')

    if (meta.app_role === 'colaborador' && colaboradorId !== meta.colaborador_id) return E.forbidden()

    const sb = await supabaseServer()
    const { data: pedidoId, error } = await sb.rpc('salvar_pedido', {
      p_colaborador_id: colaboradorId, p_empresa_id: empresaId,
      p_data_pedido: dataIso, p_itens: itens, p_obs: obs,
    })
    if (error) return E.internal(error.message)

    await log('PEDIDO_SALVO', `${colaboradorId} — ${itens.join(', ')}`, colaboradorId)
    return ok({ id: pedidoId })
  }
)
