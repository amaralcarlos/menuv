'use client'

import { useEffect, useState } from 'react'
import { useApi } from '@/lib/use-api'
import { useToast } from '@/components/ui'
import { AppShell } from '@/components/layout/AppShell'
import { Card, SectionLabel, Badge, Btn, Spinner, Modal, Input } from '@/components/ui'

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const PLANO_LABELS: Record<string, string> = { trial: 'Trial', starter: 'Starter', pro: 'Pro', scale: 'Scale', free: 'Free' }
const STATUS_COLOR: Record<string, any>  = { trial: 'yellow', ativo: 'green', suspenso: 'red', cancelado: 'red', conversao: 'yellow', bloqueado: 'red', gratuito: 'green' }
const STATUS_EMP_LABEL: Record<string, string> = { trial: 'Trial', conversao: 'Conversão', ativo: 'Ativo', bloqueado: 'Bloqueado', gratuito: 'Gratuito' }

// ── Faixa de colaboradores ────────────────────────────────────
function faixaColabs(n: number): string {
  if (n <= 20) return `até 20 colabs → ${BRL(49.90)}/mês`
  if (n <= 50) return `21–50 colabs → ${BRL(79.90)}/mês`
  return `51+ colabs → ${BRL(119.90)}/mês`
}

/* ── Empresas do restaurante com controles de plano ──────────── */
function EmpresasDoRest({ restId, onRefresh }: { restId: string; onRefresh: () => void }) {
  const { call }  = useApi()
  const toast     = useToast()
  const [empresas,        setEmpresas]        = useState<any[]>([])
  const [loading,         setLoading]         = useState(true)
  const [acting,          setActing]          = useState('')
  const [gratuidadeModal, setGratuidadeModal] = useState<any>(null)
  const [gratuidadeMotivo,setGratuidadeMotivo]= useState('')
  const [savingGrat,      setSavingGrat]      = useState(false)

  function load() {
    call<any>(`/api/restaurante/fatura?restauranteId=${restId}`).then(r => {
      if (r.success) setEmpresas(r.data.empresas ?? [])
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [restId])

  async function converter(id: string, nome: string) {
    if (!confirm(`Converter "${nome}" para ativo (pago)?`)) return
    setActing(id)
    const r = await call(`/api/admin/empresas/${id}/converter`, { method: 'POST' })
    setActing('')
    if (r.success) { toast(`${nome} convertida para ativa.`); load(); onRefresh() }
    else toast(r.error, 'error')
  }

  async function reativar(id: string, nome: string) {
    if (!confirm(`Reativar acesso de "${nome}"?`)) return
    setActing(id)
    const r = await call('/api/admin/reativar', {
      method: 'POST', body: JSON.stringify({ tipo: 'empresa', titularId: id }),
    })
    setActing('')
    if (r.success) { toast(`${nome} reativada.`); load(); onRefresh() }
    else toast(r.error, 'error')
  }

  async function salvarGratuidade() {
    if (!gratuidadeMotivo.trim()) { toast('Informe o motivo.', 'error'); return }
    setSavingGrat(true)
    const r = await call(`/api/admin/empresas/${gratuidadeModal.id}/gratuidade`, {
      method: 'POST', body: JSON.stringify({ motivo: gratuidadeMotivo }),
    })
    setSavingGrat(false)
    if (r.success) {
      toast(`Gratuidade concedida para ${gratuidadeModal.nome}.`)
      setGratuidadeModal(null); setGratuidadeMotivo(''); load(); onRefresh()
    } else toast(r.error, 'error')
  }

  if (loading) return <div className="py-2"><Spinner /></div>
  if (!empresas.length) return (
    <p className="font-[var(--mono)] text-xs text-[#3d5875] py-2">Nenhuma empresa cadastrada.</p>
  )

  return (
    <div className="flex flex-col gap-2 mt-2 border-t border-[#1c2e48] pt-2">
      {empresas.map((e: any) => (
        <div key={e.id}
          className="bg-[#080c14] border border-[#1c2e48] rounded-[10px] px-3 py-2.5 flex flex-col gap-2">

          {/* Nome + status */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm text-[#ddeaf8] font-medium">{e.nome}</p>
              <p className="font-[var(--mono)] text-[10px] text-[#3d5875] mt-0.5">
                {e.status_plano === 'trial'     && `${e.diasRestantesTrial} dias de trial restantes`}
                {e.status_plano === 'conversao' && `${e.diasRestantesConversao} dias para converter`}
                {e.status_plano === 'ativo'     && 'Ativa e pagante'}
                {e.status_plano === 'gratuito'  && `Gratuidade: ${e.gratuidade_motivo ?? '—'}`}
                {e.status_plano === 'bloqueado' && 'Acesso bloqueado'}
              </p>
            </div>
            <Badge color={STATUS_COLOR[e.status_plano] ?? 'gray'}>
              {STATUS_EMP_LABEL[e.status_plano] ?? e.status_plano}
            </Badge>
          </div>

          {/* Botões de ação */}
          <div className="flex gap-1.5 flex-wrap">
            {/* Converter para ativo */}
            {(e.status_plano === 'trial' || e.status_plano === 'conversao' || e.status_plano === 'bloqueado') && (
              <Btn size="sm" className="w-auto" loading={acting === e.id}
                onClick={() => converter(e.id, e.nome)}>
                ✅ Converter
              </Btn>
            )}

            {/* Reativar bloqueada */}
            {e.status_plano === 'bloqueado' && (
              <Btn size="sm" variant="secondary" className="w-auto" loading={acting === e.id}
                onClick={() => reativar(e.id, e.nome)}>
                🔓 Reativar
              </Btn>
            )}

            {/* Gratuidade */}
            {e.status_plano !== 'gratuito' && (
              <Btn size="sm" variant="secondary" className="w-auto"
                onClick={() => { setGratuidadeModal(e); setGratuidadeMotivo('') }}>
                🎁 Gratuidade
              </Btn>
            )}

            {/* Link gestor */}
            <button
              onClick={() => window.location.href = `/gestor/${e.id}`}
              className="font-[var(--mono)] text-[10px] text-[#4da6ff] border border-[rgba(77,166,255,.3)] rounded-[6px] px-2.5 py-1 cursor-pointer hover:bg-[rgba(77,166,255,.08)] transition-colors">
              👥 Gestor
            </button>
          </div>
        </div>
      ))}

      {/* Modal gratuidade */}
      <Modal open={!!gratuidadeModal} onClose={() => setGratuidadeModal(null)}
        title={`Gratuidade: ${gratuidadeModal?.nome}`}>
        <div className="flex flex-col gap-4">
          <p className="font-[var(--mono)] text-[11px] text-[#7a96b8] leading-relaxed">
            A empresa ficará com acesso gratuito indefinidamente.
            O motivo é obrigatório e fica registrado nos logs.
          </p>
          <Input
            label="Motivo (obrigatório)"
            value={gratuidadeMotivo}
            onChange={e => setGratuidadeMotivo(e.target.value)}
            placeholder="Ex: parceiro estratégico, teste piloto..."
          />
          <Btn loading={savingGrat} onClick={salvarGratuidade}>
            Confirmar gratuidade
          </Btn>
        </div>
      </Modal>
    </div>
  )
}

/* ── Dashboard pane ────────────────────────────────────────── */
function DashboardPane() {
  const { call } = useApi()
  const toast    = useToast()
  const [dados,        setDados]        = useState<any>(null)
  const [loading,      setLoading]      = useState(true)
  const [planoModal,   setPlanoModal]   = useState<any>(null)
  const [planoForm,    setPlanoForm]    = useState({ plano: 'trial', status: 'trial', trialFim: '', obs: '' })
  const [saving,       setSaving]       = useState(false)
  const [acting,       setActing]       = useState('')
  const [expandedRest, setExpandedRest] = useState<string | null>(null)

  async function load() {
    const res = await call<any>('/api/admin/dashboard')
    if (res.success) setDados(res.data)
    else toast(res.error, 'error')
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function savePlano() {
    if (!planoModal) return
    setSaving(true)
    const res = await call('/api/admin/planos', {
      method: 'POST',
      body: JSON.stringify({ tipo: planoModal.tipo, titularId: planoModal.id, ...planoForm }),
    })
    setSaving(false)
    if (res.success) { toast('Plano atualizado.'); setPlanoModal(null); load() }
    else toast(res.error, 'error')
  }

  async function suspender(tipo: string, id: string) {
    if (!confirm('Suspender acesso?')) return
    setActing(id)
    await call('/api/admin/suspender', { method: 'POST', body: JSON.stringify({ tipo, titularId: id, motivo: 'Suspenso pelo admin' }) })
    setActing('')
    toast('Acesso suspenso.', 'error')
    load()
  }

  async function reativar(tipo: string, id: string) {
    setActing(id)
    await call('/api/admin/reativar', { method: 'POST', body: JSON.stringify({ tipo, titularId: id }) })
    setActing('')
    toast('Acesso reativado.')
    load()
  }

  async function toggleLancamento(restId: string, nomeRest: string, atual: boolean) {
    const acao = atual ? 'desativar' : 'ativar'
    if (!confirm(`${acao.charAt(0).toUpperCase() + acao.slice(1)} o plano de lançamento de "${nomeRest}"?`)) return
    setActing(restId)
    const r = await call(`/api/admin/restaurantes/${restId}/lancamento`, {
      method: 'POST', body: JSON.stringify({ ativo: !atual }),
    })
    setActing('')
    if (r.success) { toast(`Plano de lançamento ${!atual ? 'ativado' : 'desativado'}.`); load() }
    else toast(r.error, 'error')
  }

  if (loading) return <Spinner />

  return (
    <div className="px-4 pt-4 pb-24">

      {/* Totais */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {[
          { label: 'Restaurantes',  value: dados?.totais?.restaurantes ?? 0, color: 'text-[#00e87a]' },
          { label: 'Empresas',      value: dados?.totais?.empresas     ?? 0, color: 'text-[#4da6ff]' },
          { label: 'Colaboradores', value: dados?.totais?.colaboradores ?? 0, color: 'text-[#a259ff]' },
          { label: 'Pedidos/mês',   value: dados?.totais?.pedidosMes   ?? 0, color: 'text-[#ffb340]' },
        ].map(s => (
          <div key={s.label} className="bg-[#0d1525] border border-[#1c2e48] rounded-[11px] p-3 text-center">
            <div className={`text-2xl font-black font-[var(--mono)] ${s.color}`}>{s.value}</div>
            <div className="font-[var(--mono)] text-[10px] tracking-[1px] text-[#3d5875] uppercase mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <SectionLabel>Restaurantes</SectionLabel>
      {(dados?.restaurantes ?? []).map((r: any) => (
        <Card key={r.id}>
          {/* Cabeçalho do restaurante */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="font-bold text-sm text-[#ddeaf8]">{r.nome}</p>
              <p className="font-[var(--mono)] text-[10px] text-[#3d5875] mt-0.5">{r.email}</p>
              <p className="font-[var(--mono)] text-[10px] text-[#3d5875]">
                {r.numEmpresas} emp · {r.numColabs} colabs · {r.numPedidosMes} pedidos/mês
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge color={STATUS_COLOR[r.statusPlano] ?? 'gray'}>{r.statusPlano}</Badge>
              <Badge color="gray">{PLANO_LABELS[r.plano] ?? r.plano}</Badge>
            </div>
          </div>

          {/* Botões de ação do restaurante */}
          <div className="flex gap-2 flex-wrap mb-2">
            <Btn size="sm" variant="secondary" className="w-auto"
              onClick={() => { setPlanoModal({ ...r, tipo: 'restaurante' }); setPlanoForm({ plano: r.plano, status: r.statusPlano, trialFim: r.trialFim ?? '', obs: r.obs ?? '' }) }}>
              Plano
            </Btn>
            <Btn size="sm" variant="secondary" className="w-auto"
              onClick={() => window.location.href = `/dashboard?restId=${r.id}`}>
              👁️ Dashboard
            </Btn>
            <Btn size="sm" variant="secondary" className="w-auto"
              onClick={() => setExpandedRest(e => e === r.id ? null : r.id)}>
              🏢 Empresas {expandedRest === r.id ? '▲' : '▼'}
            </Btn>
            <Btn size="sm"
              variant={r.planoLancamento ? 'danger' : 'secondary'}
              className="w-auto"
              loading={acting === r.id}
              onClick={() => toggleLancamento(r.id, r.nome, !!r.planoLancamento)}>
              🚀 {r.planoLancamento ? 'Lançamento ON' : 'Lançamento OFF'}
            </Btn>
            {r.statusPlano === 'suspenso'
              ? <Btn size="sm" className="w-auto" loading={acting === r.id} onClick={() => reativar('restaurante', r.id)}>Reativar</Btn>
              : <Btn size="sm" variant="danger" className="w-auto" loading={acting === r.id} onClick={() => suspender('restaurante', r.id)}>Suspender</Btn>
            }
          </div>

          {/* Empresas expandidas */}
          {expandedRest === r.id && <EmpresasDoRest restId={r.id} onRefresh={load} />}
        </Card>
      ))}

      {/* Modal de plano do restaurante */}
      <Modal open={!!planoModal} onClose={() => setPlanoModal(null)} title={`Plano: ${planoModal?.nome}`}>
        <div className="flex flex-col gap-4">
          <div>
            <label className="font-[var(--mono)] text-[10px] tracking-[1.5px] text-[#3d5875] uppercase block mb-1.5">Plano</label>
            <select value={planoForm.plano} onChange={e => setPlanoForm(f => ({ ...f, plano: e.target.value }))}
              className="w-full bg-[#080c14] border border-[#253d5e] rounded-[11px] px-3 py-2.5 font-[var(--mono)] text-[#ddeaf8] outline-none">
              {['trial','starter','pro','scale','free'].map(p => <option key={p} value={p}>{PLANO_LABELS[p]}</option>)}
            </select>
          </div>
          <div>
            <label className="font-[var(--mono)] text-[10px] tracking-[1.5px] text-[#3d5875] uppercase block mb-1.5">Status</label>
            <select value={planoForm.status} onChange={e => setPlanoForm(f => ({ ...f, status: e.target.value }))}
              className="w-full bg-[#080c14] border border-[#253d5e] rounded-[11px] px-3 py-2.5 font-[var(--mono)] text-[#ddeaf8] outline-none">
              {['trial','ativo','suspenso','cancelado'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <Input label="Trial fim (DD/MM/AAAA)" value={planoForm.trialFim} onChange={e => setPlanoForm(f => ({ ...f, trialFim: e.target.value }))} placeholder="30/07/2025" />
          <Input label="Observação" value={planoForm.obs} onChange={e => setPlanoForm(f => ({ ...f, obs: e.target.value }))} placeholder="Opcional..." />
          <Btn loading={saving} onClick={savePlano}>Salvar plano</Btn>
        </div>
      </Modal>
    </div>
  )
}

/* ── Logs pane ─────────────────────────────────────────────── */
function LogsPane() {
  const { call } = useApi()
  const [logs,    setLogs]    = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    call<any>('/api/admin/logs?limite=100').then(r => {
      if (r.success) setLogs(r.data.logs ?? [])
      setLoading(false)
    })
  }, [])

  if (loading) return <Spinner />

  return (
    <div className="px-4 pt-4 pb-24">
      <SectionLabel>Logs recentes</SectionLabel>
      {logs.map(l => (
        <div key={l.id} className="border-b border-[#1c2e48] py-2.5 flex flex-col gap-0.5">
          <div className="flex items-center justify-between">
            <span className="font-[var(--mono)] text-xs text-[#00e87a]">{l.acao}</span>
            <span className="font-[var(--mono)] text-[10px] text-[#3d5875]">{l.criado_em?.slice(0,16).replace('T',' ')}</span>
          </div>
          <span className="text-xs text-[#7a96b8]">
            {l.detalhe?.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '…') || '—'}
          </span>
          {l.email && <span className="font-[var(--mono)] text-[10px] text-[#3d5875]">{l.email}</span>}
        </div>
      ))}
      {logs.length === 0 && <p className="font-[var(--mono)] text-xs text-[#3d5875] text-center py-8">Sem logs.</p>}
    </div>
  )
}

/* ── Admin page ────────────────────────────────────────────── */
export default function AdminPage() {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'home'  as const, component: <DashboardPane /> },
    { id: 'logs',      label: 'Logs',      icon: 'admin' as const, component: <LogsPane /> },
  ]

  return (
    <AppShell tabs={tabs} nome="Menuv Admin" badge="superadmin" role="Admin" />
  )
}
