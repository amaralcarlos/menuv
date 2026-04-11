export const dynamic = 'force-dynamic'

'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useApi } from '@/lib/use-api'
import { useToast } from '@/components/ui'
import { AppShell } from '@/components/layout/AppShell'
import { Card, SectionLabel, Badge, Btn, Spinner, Modal, Input } from '@/components/ui'

const PLANO_LABELS: Record<string, string> = { trial: 'Trial', starter: 'Starter', pro: 'Pro', scale: 'Scale', free: 'Free' }
const STATUS_COLOR: Record<string, any> = { trial: 'yellow', ativo: 'green', suspenso: 'red', cancelado: 'red' }

/* ── Dashboard pane ──────────────────────────────────────── */
function DashboardPane() {
  const { call } = useApi()
  const toast = useToast()
  const [dados, setDados] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [planoModal, setPlanoModal] = useState<any>(null)
  const [planoForm, setPlanoForm] = useState({ plano: 'trial', status: 'trial', trialFim: '', obs: '' })
  const [saving, setSaving] = useState(false)
  const [acting, setActing] = useState('')

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
      body: JSON.stringify({
        tipo: planoModal.tipo,
        titularId: planoModal.id,
        ...planoForm,
      }),
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

  if (loading) return <Spinner />

  return (
    <div className="px-4 pt-4 pb-24">
      {/* Totals */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {[
          { label: 'Restaurantes', value: dados?.totais?.restaurantes ?? 0, color: 'text-[#00e87a]' },
          { label: 'Empresas',     value: dados?.totais?.empresas     ?? 0, color: 'text-[#4da6ff]' },
          { label: 'Colaboradores',value: dados?.totais?.colaboradores ?? 0, color: 'text-[#a259ff]' },
          { label: 'Pedidos/mês',  value: dados?.totais?.pedidosMes   ?? 0, color: 'text-[#ffb340]' },
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
          <div className="flex gap-2 flex-wrap">
            <Btn size="sm" variant="secondary" className="w-auto"
              onClick={() => { setPlanoModal({ ...r, tipo: 'restaurante' }); setPlanoForm({ plano: r.plano, status: r.statusPlano, trialFim: r.trialFim ?? '', obs: r.obs ?? '' }) }}>
              Plano
            </Btn>
            {r.statusPlano === 'suspenso'
              ? <Btn size="sm" className="w-auto" loading={acting === r.id} onClick={() => reativar('restaurante', r.id)}>Reativar</Btn>
              : <Btn size="sm" variant="danger" className="w-auto" loading={acting === r.id} onClick={() => suspender('restaurante', r.id)}>Suspender</Btn>
            }
          </div>
        </Card>
      ))}

      {/* Plano modal */}
      <Modal open={!!planoModal} onClose={() => setPlanoModal(null)} title={`Plano: ${planoModal?.nome}`}>
        <div className="flex flex-col gap-4">
          <div>
            <label className="font-[var(--mono)] text-[10px] tracking-[1.5px] text-[#3d5875] uppercase block mb-1.5">Plano</label>
            <select
              value={planoForm.plano}
              onChange={e => setPlanoForm(f => ({ ...f, plano: e.target.value }))}
              className="w-full bg-[#080c14] border border-[#253d5e] rounded-[11px] px-3 py-2.5 font-[var(--mono)] text-[#ddeaf8] outline-none"
            >
              {['trial','starter','pro','scale','free'].map(p => <option key={p} value={p}>{PLANO_LABELS[p]}</option>)}
            </select>
          </div>
          <div>
            <label className="font-[var(--mono)] text-[10px] tracking-[1.5px] text-[#3d5875] uppercase block mb-1.5">Status</label>
            <select
              value={planoForm.status}
              onChange={e => setPlanoForm(f => ({ ...f, status: e.target.value }))}
              className="w-full bg-[#080c14] border border-[#253d5e] rounded-[11px] px-3 py-2.5 font-[var(--mono)] text-[#ddeaf8] outline-none"
            >
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

/* ── Logs pane ───────────────────────────────────────────── */
function LogsPane() {
  const { call } = useApi()
  const [logs, setLogs] = useState<any[]>([])
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
          <span className="text-xs text-[#7a96b8]">{l.detalhe}</span>
          {l.email && <span className="font-[var(--mono)] text-[10px] text-[#3d5875]">{l.email}</span>}
        </div>
      ))}
      {logs.length === 0 && <p className="font-[var(--mono)] text-xs text-[#3d5875] text-center py-8">Sem logs.</p>}
    </div>
  )
}

/* ── Admin page ──────────────────────────────────────────── */
export default function AdminPage() {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'home'  as const, component: <DashboardPane /> },
    { id: 'logs',      label: 'Logs',      icon: 'admin' as const, component: <LogsPane /> },
  ]

  return (
    <AppShell
      tabs={tabs}
      nome="Menuv Admin"
      badge="superadmin"
      role="Admin"
    />
  )
}
