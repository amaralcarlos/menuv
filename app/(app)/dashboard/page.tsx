'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useApi } from '@/lib/use-api'
import { useToast } from '@/components/ui'
import { AppShell } from '@/components/layout/AppShell'
import { Card, SectionLabel, Badge, Spinner, Btn } from '@/components/ui'
import GradesPane from '@/components/grade/GradesPane'
import EmpresasPane from '../empresas/EmpresasPane'
import RelatorioPane from '../relatorio/RelatorioPane'

/* ── Tarja de empresa com pedidos ────────────────────────── */
function EmpresaTarja({ empresa, restId }: { empresa: any; restId: string }) {
  const { call } = useApi()
  const toast = useToast()
  const [expanded, setExpanded] = useState(false)
  const [pedidos, setPedidos]   = useState<any[]>([])
  const [loading, setLoading]   = useState(false)
  const [salvando, setSalvando] = useState<string | null>(null)

  const hoje = new Date()
  const dataStr = `${String(hoje.getDate()).padStart(2,'0')}/${String(hoje.getMonth()+1).padStart(2,'0')}/${hoje.getFullYear()}`

  const total      = empresa.total ?? 0
  const separados  = pedidos.filter(p => p.status === 'separado' || p.status === 'confirmado').length
  const despachado = pedidos.every(p => p.status === 'despachado' || p.status === 'confirmado') && pedidos.length > 0

  const statusBadge = despachado
    ? { label: 'Despachado', color: 'green' as const }
    : separados > 0
      ? { label: `${separados}/${total} separados`, color: 'blue' as const }
      : { label: `${total} em aberto`, color: 'gray' as const }

  async function expandir() {
    if (expanded) { setExpanded(false); return }
    setLoading(true)
    setExpanded(true)
    const res = await call<any[]>(`/api/pedidos?empresaId=${empresa.id}&data=${dataStr}`)
    if (res.success) setPedidos(res.data)
    setLoading(false)
  }

  async function marcarStatus(pedidoId: string, status: string) {
    setSalvando(pedidoId)
    const res = await call(`/api/pedidos/${pedidoId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
    if (res.success) {
      setPedidos(ps => ps.map(p => p.id === pedidoId ? { ...p, status } : p))
      toast('Status atualizado.')
    } else {
      toast(res.error ?? 'Erro ao atualizar.', 'error')
    }
    setSalvando(null)
  }

  async function despacharTudo() {
    if (!confirm(`Marcar todos os pedidos de ${empresa.nome} como despachados?`)) return
    setSalvando('all')
    await Promise.all(pedidos.map(p => call(`/api/pedidos/${p.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: empresa.formato === 'buffet' ? 'confirmado' : 'despachado' }),
    })))
    setPedidos(ps => ps.map(p => ({ ...p, status: empresa.formato === 'buffet' ? 'confirmado' : 'despachado' })))
    toast('Todos despachados!')
    setSalvando(null)
  }

  const isMarmita = empresa.formato !== 'buffet'

  return (
    <div className="mb-3">
      <button
        onClick={expandir}
        className="w-full text-left"
      >
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
              <svg
                className={`text-[#3d5875] transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
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
              Nenhum pedido hoje.
            </p>
          )}

          {!loading && pedidos.map(p => (
            <div key={p.id} className="bg-[#0d1525] border border-[#1c2e48] rounded-[8px] p-3 mb-2">
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-sm text-[#ddeaf8]">{p.colaboradorNome}</p>
                <Badge color={
                  p.status === 'despachado' || p.status === 'confirmado' ? 'green' :
                  p.status === 'separado' ? 'blue' : 'gray'
                }>
                  {p.status === 'despachado' ? 'Despachado' :
                   p.status === 'confirmado' ? 'Confirmado' :
                   p.status === 'separado'   ? 'Separado'   :
                   isMarmita ? 'Em aberto' : 'Reservado'}
                </Badge>
              </div>

              {isMarmita && p.itens?.length > 0 && (
                <p className="font-[var(--mono)] text-[10px] text-[#7a96b8] mb-2">
                  {p.itens.join(', ')}
                </p>
              )}

              {p.obs && (
                <p className="font-[var(--mono)] text-[10px] text-[#3d5875] mb-2">
                  Obs: {p.obs}
                </p>
              )}

              {isMarmita && p.status === 'aberto' && (
                <Btn size="sm" className="w-auto" loading={salvando === p.id}
                  onClick={() => marcarStatus(p.id, 'separado')}>
                  Marcar separado
                </Btn>
              )}
            </div>
          ))}

          {!loading && pedidos.length > 0 && !despachado && (
            <Btn
              size="sm"
              variant="primary"
              className="w-full mt-1"
              loading={salvando === 'all'}
              onClick={despacharTudo}>
              {isMarmita ? '🚀 Despachar todos' : '✅ Confirmar todos'}
            </Btn>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Pedidos pane ────────────────────────────────────────── */
function PedidosPane({ restId }: { restId: string }) {
  const { call } = useApi()
  const [empresas, setEmpresas] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!restId) return
    async function load() {
      const hoje = new Date()
      const dataStr = `${String(hoje.getDate()).padStart(2,'0')}/${String(hoje.getMonth()+1).padStart(2,'0')}/${hoje.getFullYear()}`

      const [empRes, pedRes] = await Promise.all([
        call<any[]>(`/api/empresas?restauranteId=${restId}`),
        call<any[]>(`/api/pedidos?restauranteId=${restId}&data=${dataStr}`),
      ])

      if (empRes.success && pedRes.success) {
        const pedidos = pedRes.data ?? []
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

  if (loading) return <Spinner />

  return (
    <div className="px-4 pt-4 pb-24">
      <SectionLabel>Pedidos de hoje</SectionLabel>

      {empresas.length === 0 && (
        <Card>
          <p className="text-center font-[var(--mono)] text-xs text-[#3d5875] py-4">
            Nenhuma empresa cadastrada.
          </p>
        </Card>
      )}

      {empresas.map(e => (
        <EmpresaTarja key={e.id} empresa={e} restId={restId} />
      ))}
    </div>
  )
}

/* ── Main ────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { meta, loading } = useAuth()
  const restId = meta?.restaurante_id ?? ''

  if (loading || !restId) return (
    <div className="min-h-screen bg-[#080c14] flex items-center justify-center">
      <Spinner />
    </div>
  )

  const tabs = [
    { id: 'pedidos',   label: 'Pedidos',   icon: 'pedido'    as const, component: <PedidosPane restId={restId} /> },
    { id: 'grades',    label: 'Cardápio Semanal', icon: 'grade' as const, component: <GradesPane restId={restId} /> },
    { id: 'empresas',  label: 'Empresas',  icon: 'empresas'  as const, component: <EmpresasPane restId={restId} /> },
    { id: 'relatorio', label: 'Relatório', icon: 'relatorio' as const, component: <RelatorioPane restId={restId} /> },
  ]

  const badge = meta?.app_role === 'rest_usuario'
    ? (meta.perfil === 'admin' ? 'admin' : 'equipe')
    : 'restaurante'

  return <AppShell tabs={tabs} nome={meta?.nome ?? 'Menuv'} badge={badge} role="Restaurante" />
}
