import { NextRequest } from 'next/server'
import { supabaseServer, ok, E, withAuth } from '@/lib/api-helpers'

export const GET = withAuth()(
  async (req, meta) => {
    const sb     = await supabaseServer()
    const restId = meta.restaurante_id ?? null
    const empId  = meta.empresa_id     ?? null

    let restaurante = null
    if (restId) {
      const { data } = await sb.from('restaurantes').select('id, nome').eq('id', restId).single()
      restaurante = data
    }

    let empresas: any[] = []
    if ((meta.app_role === 'restaurante' || meta.app_role === 'rest_usuario') && restId) {
      const { data } = await sb.from('empresas')
        .select('id, nome, horario_limite, preco_por_refeicao')
        .eq('restaurante_id', restId).eq('ativa', true).order('nome')
      empresas = data ?? []
    }

    let empresaConfig = null
    if (empId) {
      const { data } = await sb.from('empresas')
        .select('id, nome, horario_limite, preco_por_refeicao').eq('id', empId).single()
      empresaConfig = data
    }

    let cardapioHoje   = null
    let cardapioSemana: any[] = []
    const cardapioRestId = restId ?? meta.restaurante_id ?? null

    if (cardapioRestId) {
      const base       = req.nextUrl.origin
      const cookieHdr  = req.headers.get('cookie') ?? ''
      const semanaRes  = await fetch(`${base}/api/cardapio/semana?restauranteId=${cardapioRestId}`, { headers: { cookie: cookieHdr } })
      if (semanaRes.ok) {
        const { data } = await semanaRes.json() as { data: Array<{ data: string }> }
        cardapioSemana = data ?? []
        const n = new Date()
        const hoje = `${String(n.getDate()).padStart(2,'0')}/${String(n.getMonth()+1).padStart(2,'0')}/${n.getFullYear()}`
        cardapioHoje = cardapioSemana.find(d => d.data === hoje) ?? null
      }
    }

    const agora = new Date()
    const hoje  = `${String(agora.getDate()).padStart(2,'0')}/${String(agora.getMonth()+1).padStart(2,'0')}/${agora.getFullYear()}`
    const horarioAtual = `${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`

    return ok({ role: meta.app_role, hoje, horarioAtual, restaurante, empresas, empresaConfig, cardapioHoje, cardapioSemana, restId, timestamp: Date.now() })
  }
)
