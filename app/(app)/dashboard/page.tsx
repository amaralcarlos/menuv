'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useApi } from '@/lib/use-api'
import { useToast } from '@/components/ui'
import { AppShell } from '@/components/layout/AppShell'
import { Card, SectionLabel, Badge, Spinner, Btn } from '@/components/ui'
import GradesPane from '@/components/grade/GradesPane'
import EmpresasPane from '../empresas/EmpresasPane'
import RelatorioPane from '../relatorio/RelatorioPane'

const DIAS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

/* ── Day selector do restaurante ─────────────────────────── */
function DaySelectorRest({ dias, selected, onSelect }: {
  dias: string[]; selected: string; onSelect: (d: string) => void
}) {
  return (
    <div className="grid grid-cols-5 gap-1.5 mb-4">
      {dias.map(d => {
        const parts = d.split('/')
        const date  = new Date(+parts[2], +parts[1] - 1, +parts[0])
        const dow   = DIAS_PT[date.getDay()]
        const n     = new Date()
        const hojeStr = `${String(n.getDate()).padStart(2,'0')}/${String(n.getMonth()+1).padStart(2,'0')}/${n.getFullYear()}`
        const isToday = d === hojeStr

        return (
          <button key={d} onClick={() => onSelect(d)}
            className={`py-2 px-1 rounded-[11px] text-center cursor-pointer transition-all border
              ${selected === d
                ? 'border-[#00e87a] bg-[rgba(0,232,122,.06)]'
                : isToday
                  ? 'border-[rgba(0,232,122,.2)] bg-[rgba(0,232,122,.03)]'
                  : 'border-[#1c2e48] bg-[#0d1525] hover:border-[rgba(0,232,122,.3)]'}`}>
            <div className={`font-[var(--mono)] text-[10px] tracking-[.3px] ${selected === d ? 'text-[rgba(0,232,122,.7)]' : 'text-[#3d5875]'}`}>{dow}</div>
            <div className={`text-sm font-semibold mt-0.5 ${selected === d ? 'text-[#00e87a]' : 'text-[#ddeaf8]'}`}>{String(date.getDate()).padStart(2,'0')}</div>
          </button>
        )
      })}
    </div>
  )
}

/* ── Relatório de cozinha ────────────────────────────────── */
function gerarRelatorioCozinha(empresa: any, pedidos: any[], dataStr: string) {
  const isMarmita = empresa.formato !== 'buffet'
  const hoje = new Date().toLocaleDateString('pt-BR')

  const linhas = pedidos.map((p, i) => {
    const itens = p.itens?.length > 0 ? p.itens.join(', ') : (isMarmita ? '—' : 'Reserva')
    const obs   = p.obs ? `\n   Obs: ${p.obs}` : ''
    const status = p.status === 'separado' ? ' ✓' : ''
    return `${String(i+1).padStart(2,'0')}. ${p.colaboradorNome}${status}\n   ${itens}${obs}`
  }).join('\n\n')

  const total = pedidos.length
  const separados = pedidos.filter(p => p.status === 'separado' || p.status === 'despachado' || p.status === 'confirmado').length

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
  <title>Cozinha — ${empresa.nome} — ${dataStr}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Courier New', monospace; padding: 24px; color: #111; font-size: 14px; }
    .header { border-bottom: 3px solid #111; padding-bottom: 12px; margin-bottom: 16px; }
    .title { font-size: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
    .sub { font-size: 12px; color: #444; margin-top: 4px; }
    .stats { display: flex; gap: 24px; margin-bottom: 16px; padding: 10px; background: #f5f5f5; border-radius: 4px; }
    .stat { text-align: center; }
    .stat-val { font-size: 24px; font-weight: bold; }
    .stat-lbl { font-size: 10px; text-transform: uppercase; color: #666; }
    .divider { border: none; border-top: 1px dashed #ccc; margin: 8px 0; }
    .pedido { padding: 10px 0; border-bottom: 1px solid #eee; }
    .pedido:last-child { border-bottom: none; }
    .num { font-size: 11px; color: #666; }
    .nome { font-size: 16px; font-weight: bold; margin: 2px 0; }
    .itens { font-size: 13px; color: #222; padding-left: 8px; border-left: 3px solid #111; margin-top: 4px; }
    .obs { font-size: 11px; color: #666; margin-top: 3px; font-style: italic; }
    .check { float: right; width: 20px; height: 20px; border: 2px solid #111; border-radius: 3px; margin-top: 2px; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #ccc; font-size: 11px; color: #999; text-align: center; }
    .btn-print { background: #111; color: white; border: none; padding: 10px 24px; border-radius: 4px; cursor: pointer; font-size: 13px; margin-bottom: 20px; font-family: inherit; }
    @media print { .btn-print { display: none; } body { padding: 12px; } }
  </style></head><body>
  <button class="btn-print" onclick="window.print()">🖨️ Imprimir</button>
  <div class="header">
    <div class="title">📋 Cozinha — ${empresa.nome}</div>
    <div class="sub">${isMarmita ? '🍱 Marmita' : '🍽️ Buffet'} · ${dataStr} · Gerado às ${hoje}</div>
  </div>
  <div class="stats">
    <div class="stat"><div class="stat-val">${total}</div><div class="stat-lbl">Total</div></div>
    <div class="stat"><div class="stat-val">${separados}</div><div class="stat-lbl">Separados</div></div>
    <div class="stat"><div class="stat-val">${total - separados}</div><div class="stat-lbl">Pendentes</div></div>
  </div>
  <hr class="divider"/>
  ${pedidos.map((p, i) => `
    <div class="pedido">
      <div class="check"></div>
      <div class="num">#${String(i+1).padStart(2,'0')}</div>
      <div class="nome">${p.colaboradorNome}</div>
      ${p.itens?.length > 0
        ? `<div class="itens">${p.itens.join('<br/>')}</div>`
        : `<div class="itens">${isMarmita ? '—' : 'Reserva buffet'}</div>`
      }
      ${p.obs ? `<div class="obs">⚠️ ${p.obs}</div>` : ''}
    </div>
  `).join('')}
  <div class="footer">Menuv · ${dataStr} · ${total} refeições</div>
  </body></html>`

  const w = window.open('', '_blank')
  w?.document.write(html)
  w?.document.close()
}

/* ── Tarja de empresa com pedidos ────────────────────────── */
function EmpresaTarja({ empresa, dataStr }: { empresa: any; dataStr: string }) {
  const { call } = useApi()
  const toast    = useToast()
  const [expanded, setExpanded] = useState(false)
  const [pedidos,  setPedidos]  = useState<any[]>([])
  const [loading,  setLoading]  = useState(false)
  const [salvando, setSalvando] = useState<string | null>(null)

  const total      = empresa.total ?? 0
  const separados  = pedidos.filter(p => p.status === 'separado' || p.status === 'confirmado').length
  const despachado = pedidos.every(p => p.status === 'despachado' || p.status === 'confirmado') && pedidos.length > 0

  const statusBadge = despachado
    ? { label: 'Despachado',                       color: 'green' as const }
    : separados > 0
      ? { label: `${separados}/${total} separados`, color: 'blue'  as const }
      : { label: `${total} em aberto`,              color: 'gray'  as const }

  useEffect(() => {
    setExpanded(false)
    setPedidos([])
  }, [dataStr])

  async function expandir() {
    if (expanded) { setExpanded(false); return }
    setLoading(true)
    setExpanded(true)
    const res = await call<any[]>(`/api/pedidos?empresaId=${empresa.id}&data=${dataStr}`)
    if (res.success) setPedidos(res.data)
    setLoading(false)
  }

  async function toggleSeparado(pedidoId: string, atual: string) {
    const novoStatus = (atual === 'separado' || atual === 'confirmado') ? 'aberto' : 'separado'
    setSalvando(pedidoId)
    const res = await call(`/api/pedidos/${pedidoId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: novoStatus }),
    })
    if (res.success) {
      setPedidos(ps => ps.map(p => p.id === pedidoId ? { ...p, status: novoStatus } : p))
    } else toast(res.error ?? 'Erro ao atualizar.', 'error')
    setSalvando(null)
  }

  async function despacharTudo() {
    if (!confirm(`Marcar todos os pedidos de ${empresa.nome} como despachados?`)) return
    setSalvando('all')
    const novoStatus = empresa.formato === 'buffet' ? 'confirmado' : 'despachado'
    await Promise.all(pedidos.map(p => call(`/api/pedidos/${p.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: novoStatus }),
    })))
    setPedidos(ps => ps.map(p => ({ ...p, status: novoStatus })))
    toast('Todos despachados!')
    setSalvando(null)
  }

  const isMarmita = empresa.formato !== 'buffet'

  return (
    <div className="mb-3">
      <button onClick={expandir} className="w-full text-left">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-sm text-[#ddeaf8]">{empresa.nome}</p>
              <p className="font-[var(--mono)] text-[10px] text-[#3d5875] mt-0.5">
                {isMarmita ? '🍱 Marmita' : '🍽️ Buffet'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge color={statusBadge.color}>{statusBadge.label}</Badge>
              <svg className={`text-[#3d5875] transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>
        </Card>
      </button>

      {expanded && (
        <div className="ml-2 border-l-2 border-[#1c2e48] pl-3 mt-1">
          {loading && <Spinner />}

          {!loading && pedidos.length === 0 && (
            <p className="font-[var(--mono)] text-xs text-[#3d5875] py-2 px-2">
              Nenhum pedido neste dia.
            </p>
          )}

          {!loading && pedidos.map(p => {
            const isSeparado = p.status === 'separado' || p.status === 'confirmado' || p.status === 'despachado'
            return (
              <div key={p.id} className={`bg-[#0d1525] border rounded-[8px] px-3 py-2 mb-1.5 transition-all
                ${isSeparado ? 'border-[rgba(0,232,122,.3)] opacity-70' : 'border-[#1c2e48]'}`}>
                <div className="flex items-center gap-2">
                  {/* Checkbox */}
                  <button
                    onClick={() => !despachado && toggleSeparado(p.id, p.status)}
                    disabled={salvando === p.id || p.status === 'despachado' || p.status === 'confirmado'}
                    className="flex-shrink-0 cursor-pointer disabled:cursor-not-allowed">
                    <div className={`w-5 h-5 rounded-[4px] border-2 flex items-center justify-center transition-all
                      ${isSeparado
                        ? 'bg-[#00e87a] border-[#00e87a]'
                        : 'border-[#3d5875] hover:border-[#00e87a]'}`}>
                      {isSeparado && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4l3 3 5-6" stroke="#003320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </button>

                  {/* Nome */}
                  <span className={`font-semibold text-sm flex-1 ${isSeparado ? 'line-through text-[#3d5875]' : 'text-[#ddeaf8]'}`}>
                    {p.colaboradorNome}
                  </span>

                  {/* Badge status */}
                  <Badge color={
                    p.status === 'despachado' || p.status === 'confirmado' ? 'green' :
                    p.status === 'separado' ? 'blue' : 'gray'
                  }>
                    {p.status === 'despachado' ? 'Desp.' :
                     p.status === 'confirmado' ? 'Conf.' :
                     p.status === 'separado'   ? 'Sep.'  :
                     isMarmita ? 'Aberto' : 'Reservado'}
                  </Badge>
                </div>

                {isMarmita && p.itens?.length > 0 && (
                  <p className="font-[var(--mono)] text-[10px] text-[#7a96b8] mt-1 ml-7">
                    {p.itens.join(', ')}
                  </p>
                )}

                {p.obs && (
                  <p className="font-[var(--mono)] text-[10px] text-[#ffb340] mt-0.5 ml-7">
                    ⚠️ {p.obs}
                  </p>
                )}
              </div>
            )
          })}

          {!loading && pedidos.length > 0 && (
            <div className="flex gap-2 mt-2">
              <Btn size="sm" variant="secondary" className="flex-1"
                onClick={() => gerarRelatorioCozinha(empresa, pedidos, dataStr)}>
                🖨️ Cozinha
              </Btn>
              {!despachado && (
                <Btn size="sm" variant="primary" className="flex-1"
                  loading={salvando === 'all'} onClick={despacharTudo}>
                  {isMarmita ? '🚀 Despachar' : '✅ Confirmar'}
                </Btn>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Pedidos pane ────────────────────────────────────────── */
function PedidosPane({ restId }: { restId: string }) {
  const { call }  = useApi()
  const [empresas,     setEmpresas]     = useState<any[]>([])
  const [diasSemana,   setDiasSemana]   = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    if (!restId) return
    async function load() {
      const n       = new Date()
      const hojeStr = `${String(n.getDate()).padStart(2,'0')}/${String(n.getMonth()+1).padStart(2,'0')}/${n.getFullYear()}`

      const cardRes = await call<any[]>(`/api/cardapio/semana?restauranteId=${restId}`)
      let dias: string[] = []
      if (cardRes.success && cardRes.data.length > 0) {
        dias = cardRes.data.map((d: any) => d.data)
      } else {
        dias = [hojeStr]
      }
      setDiasSemana(dias)

      const hoje = dias.includes(hojeStr) ? hojeStr : dias[0]
      setSelectedDate(hoje)

      const [empRes, pedRes] = await Promise.all([
        call<any[]>(`/api/empresas?restauranteId=${restId}`),
        call<any[]>(`/api/pedidos?restauranteId=${restId}&data=${hoje}`),
      ])

      if (empRes.success) {
        const pedidos = pedRes.success ? (pedRes.data ?? []) : []
        const emps = (empRes.data ?? []).map((e: any) => ({
          ...e,
          total: pedidos.filter((p: any) => p.empresaNome === e.nome).length,
        }))
        setEmpresas(emps)
      }
      setLoading(false)
    }
    load()
  }, [restId])

  async function mudarDia(data: string) {
    setSelectedDate(data)
    const [empRes, pedRes] = await Promise.all([
      call<any[]>(`/api/empresas?restauranteId=${restId}`),
      call<any[]>(`/api/pedidos?restauranteId=${restId}&data=${data}`),
    ])
    if (empRes.success) {
      const pedidos = pedRes.success ? (pedRes.data ?? []) : []
      const emps = (empRes.data ?? []).map((e: any) => ({
        ...e,
        total: pedidos.filter((p: any) => p.empresaNome === e.nome).length,
      }))
      setEmpresas(emps)
    }
  }

  if (loading) return <Spinner />

  const n = new Date()
  const hojeStr = `${String(n.getDate()).padStart(2,'0')}/${String(n.getMonth()+1).padStart(2,'0')}/${n.getFullYear()}`

  return (
    <div className="px-4 pt-4 pb-24">
      {diasSemana.length > 1 && (
        <>
          <SectionLabel>Selecione o dia</SectionLabel>
          <DaySelectorRest dias={diasSemana} selected={selectedDate} onSelect={mudarDia} />
        </>
      )}

      <SectionLabel>
        Pedidos de {selectedDate === hojeStr ? 'hoje' : selectedDate}
      </SectionLabel>

      {empresas.length === 0 && (
        <Card>
          <p className="text-center font-[var(--mono)] text-xs text-[#3d5875] py-4">
            Nenhuma empresa cadastrada.
          </p>
        </Card>
      )}

      {empresas.map(e => (
        <EmpresaTarja key={e.id} empresa={e} dataStr={selectedDate} />
      ))}
    </div>
  )
}

/* ── Main ────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { meta, loading } = useAuth()
  const searchParams   = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const restIdOverride = searchParams?.get('restId') ?? ''
  const restId         = (meta?.app_role === 'admin' && restIdOverride) ? restIdOverride : (meta?.restaurante_id ?? '')

  if (loading || !restId) return (
    <div className="min-h-screen bg-[#080c14] flex items-center justify-center">
      <Spinner />
    </div>
  )

  const tabs = [
    { id: 'pedidos',   label: 'Pedidos',         icon: 'pedido'    as const, component: <PedidosPane restId={restId} /> },
    { id: 'cardapio',  label: 'Cardápio Semanal', icon: 'grade'     as const, component: <GradesPane restId={restId} /> },
    { id: 'empresas',  label: 'Empresas',         icon: 'empresas'  as const, component: <EmpresasPane restId={restId} /> },
    { id: 'relatorio', label: 'Relatório',        icon: 'relatorio' as const, component: <RelatorioPane restId={restId} /> },
  ]

  const badge = meta?.app_role === 'rest_usuario'
    ? (meta.perfil === 'admin' ? 'admin' : 'equipe')
    : 'restaurante'

  return <AppShell tabs={tabs} nome={meta?.nome ?? 'Menuv'} badge={badge} role="Restaurante" />
}
