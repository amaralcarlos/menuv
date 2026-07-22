'use client'

import { useEffect, useState } from 'react'
import FinanceiroAdminPane from './FinanceiroAdminPane'
import { useApi } from '@/lib/use-api'
import { useToast } from '@/components/ui'
import { AppShell } from '@/components/layout/AppShell'
import { Card, SectionLabel, Badge, Btn, Spinner, Modal, Input } from '@/components/ui'

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const PLANO_LABELS: Record<string, string> = { trial: 'Trial', starter: 'Starter', pro: 'Pro', scale: 'Scale', free: 'Free' }
const STATUS_COLOR: Record<string, any>  = { trial: 'yellow', ativo: 'green', suspenso: 'red', cancelado: 'red', conversao: 'yellow', bloqueado: 'red', gratuito: 'green', free: 'green' }
const STATUS_EMP_LABEL: Record<string, string> = { trial: 'Trial', conversao: 'Conversão', ativo: 'Ativo', bloqueado: 'Bloqueado', gratuito: 'Gratuito', free: 'Free' }

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

  async function ativarFree(id: string, nome: string) {
    if (!confirm(`Mover "${nome}" para o plano free permanente?`)) return
    setActing(id)
    const r = await call(`/api/admin/empresas/${id}/free`, { method: 'POST' })
    setActing('')
    if (r.success) { toast(`${nome} agora está no plano free.`); load(); onRefresh() }
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
                {e.status_plano === 'free'      && 'Plano free — acesso permanente'}
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
            {e.status_plano !== 'gratuito' && e.status_plano !== 'free' && (
              <Btn size="sm" variant="secondary" className="w-auto"
                onClick={() => { setGratuidadeModal(e); setGratuidadeMotivo('') }}>
                🎁 Gratuidade
              </Btn>
            )}

            {/* Plano Free */}
            {e.status_plano !== 'free' && e.status_plano !== 'gratuito' && (
              <Btn size="sm" variant="secondary" className="w-auto"
                onClick={() => ativarFree(e.id, e.nome)}>
                ⚡ Free
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

/* ── VencimentoEditor ───────────────────────────────────────── */
function VencimentoEditor({ restId, nomeRest, diaAtual, onSalvar }: {
  restId: string; nomeRest: string; diaAtual: number | null
  onSalvar: (id: string, nome: string, dia: number) => void
}) {
  const [editando, setEditando] = useState(false)
  const [dia,      setDia]      = useState(diaAtual?.toString() ?? '')

  return (
    <div className="bg-[#080c14] border border-[#1c2e48] rounded-[10px] px-3 py-2.5 flex items-center justify-between gap-2">
      <div>
        <p className="font-[var(--mono)] text-[9px] tracking-[1.5px] text-[#3d5875] uppercase">Dia de vencimento</p>
        {!editando ? (
          <p className="font-[var(--mono)] text-xs text-[#ddeaf8] mt-0.5">
            {diaAtual ? `Todo dia ${diaAtual} do mês` : 'Não definido'}
          </p>
        ) : (
          <input
            type="number" min="1" max="31"
            value={dia}
            onChange={e => setDia(e.target.value)}
            placeholder="1–31"
            autoFocus
            className="w-16 bg-[#0d1525] border border-[rgba(0,232,122,.4)] rounded-[6px] px-2 py-1 font-[var(--mono)] text-xs text-[#ddeaf8] outline-none text-center mt-0.5"
          />
        )}
      </div>
      <div className="flex items-center gap-1.5">
        {!editando ? (
          <button
            onClick={() => { setDia(diaAtual?.toString() ?? ''); setEditando(true) }}
            className="font-[var(--mono)] text-[10px] text-[#4da6ff] border border-[rgba(77,166,255,.25)] rounded-[6px] px-2.5 py-1.5 cursor-pointer hover:bg-[rgba(77,166,255,.08)] transition-colors bg-transparent">
            {diaAtual ? 'Editar' : 'Definir'}
          </button>
        ) : (
          <>
            <button
              onClick={() => setEditando(false)}
              className="font-[var(--mono)] text-[10px] text-[#3d5875] border border-[#1c2e48] rounded-[6px] px-2 py-1.5 cursor-pointer hover:bg-[#1c2e48] transition-colors bg-transparent">
              ✕
            </button>
            <button
              onClick={() => {
                const n = parseInt(dia, 10)
                if (n >= 1 && n <= 31) { onSalvar(restId, nomeRest, n); setEditando(false) }
              }}
              className="font-[var(--mono)] text-[10px] text-[#00e87a] border border-[rgba(0,232,122,.3)] rounded-[6px] px-2.5 py-1.5 cursor-pointer hover:bg-[rgba(0,232,122,.08)] transition-colors bg-transparent">
              Salvar
            </button>
          </>
        )}
      </div>
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
  const [expandedRest,    setExpandedRest]    = useState<string | null>(null)
  const [drawer,           setDrawer]           = useState<'restaurantes'|'empresas'|'colaboradores'|null>(null)
  const [vencModal,        setVencModal]        = useState<any>(null)
  const [vencForm,         setVencForm]         = useState({ dia: '30', inicio: '', meses: '12', valor: '' })
  const [vencSaving,       setVencSaving]       = useState(false)

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

  async function salvarVencimento(restId: string, nomeRest: string, dia: number) {
    if (dia < 1 || dia > 31) { toast('Dia inválido.', 'error'); return }
    const r = await call(`/api/admin/restaurantes/${restId}/vencimento`, {
      method: 'POST', body: JSON.stringify({ dia }),
    })
    if (r.success) { toast(`Vencimento do ${nomeRest} definido para dia ${dia}.`); load() }
    else toast(r.error, 'error')
  }

  async function gerarVencimentos() {
    if (!vencModal) return
    const r = await call<any>(`/api/admin/restaurantes/${vencModal.id}/vencimentos`, {
      method: 'POST',
      body: JSON.stringify({
        dia:    parseInt(vencForm.dia),
        inicio: vencForm.inicio,
        meses:  parseInt(vencForm.meses),
        valor:  parseFloat(vencForm.valor),
      }),
    })
    setVencSaving(false)
    if (r.success) {
      toast(`${r.data.gerados} vencimentos gerados (${r.data.primeiro} → ${r.data.ultimo}).`)
      setVencModal(null)
      load()
    } else {
      toast(r.error ?? 'Erro ao gerar vencimentos.', 'error')
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="px-4 pt-4 pb-24">

      {/* Totais — clicáveis */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {[
          { label: 'Restaurantes',  value: dados?.totais?.restaurantes ?? 0, color: 'text-[#00e87a]', key: 'restaurantes' },
          { label: 'Empresas',      value: dados?.totais?.empresas     ?? 0, color: 'text-[#4da6ff]', key: 'empresas' },
          { label: 'Colaboradores', value: dados?.totais?.colaboradores ?? 0, color: 'text-[#a259ff]', key: 'colaboradores' },
          { label: 'Pedidos/mês',   value: dados?.totais?.pedidosMes   ?? 0, color: 'text-[#ffb340]', key: null },
        ].map(s => (
          <button key={s.label}
            onClick={() => s.key && setDrawer(s.key as any)}
            className={`bg-[#0d1525] border border-[#1c2e48] rounded-[11px] p-3 text-center transition-all w-full
              ${s.key ? 'cursor-pointer hover:border-[rgba(0,232,122,.25)] hover:bg-[rgba(0,232,122,.03)]' : 'cursor-default'}`}>
            <div className={`text-2xl font-black font-[var(--mono)] ${s.color}`}>{s.value}</div>
            <div className="font-[var(--mono)] text-[10px] tracking-[1px] text-[#3d5875] uppercase mt-0.5">
              {s.label} {s.key && <span className="text-[#1c2e48]">›</span>}
            </div>
          </button>
        ))}
      </div>

      {/* Drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setDrawer(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full max-w-[480px] bg-[#0d1525] border-t border-[#1c2e48] rounded-t-[20px] max-h-[70vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-[#0d1525] px-4 py-3 border-b border-[#1c2e48] flex items-center justify-between">
              <p className="font-bold text-[#ddeaf8] capitalize">{drawer}</p>
              <button onClick={() => setDrawer(null)} className="text-[#3d5875] hover:text-[#ddeaf8] text-xl bg-transparent border-none cursor-pointer">×</button>
            </div>
            <div className="p-3 flex flex-col gap-2">

              {/* Restaurantes */}
              {drawer === 'restaurantes' && (dados?.restaurantes ?? []).map((r: any) => (
                <button key={r.id}
                  onClick={() => { window.location.href = `/dashboard?restId=${r.id}`; setDrawer(null) }}
                  className="w-full text-left bg-[#080c14] border border-[#1c2e48] rounded-[11px] px-3 py-2.5 hover:border-[rgba(0,232,122,.3)] transition-all cursor-pointer">
                  <p className="text-sm text-[#ddeaf8] font-medium">{r.nome}</p>
                  <p className="font-[var(--mono)] text-[10px] text-[#3d5875]">{r.numEmpresas} emp · {r.numColabs} colabs</p>
                </button>
              ))}

              {/* Empresas */}
              {drawer === 'empresas' && (dados?.restaurantes ?? []).flatMap((r: any) =>
                (r.empresas ?? []).map((e: any) => (
                  <button key={e.id}
                    onClick={() => { window.location.href = `/gestor/${e.id}`; setDrawer(null) }}
                    className="w-full text-left bg-[#080c14] border border-[#1c2e48] rounded-[11px] px-3 py-2.5 hover:border-[rgba(0,232,122,.3)] transition-all cursor-pointer">
                    <p className="text-sm text-[#ddeaf8] font-medium">{e.nome}</p>
                    <p className="font-[var(--mono)] text-[10px] text-[#3d5875]">{r.nome}</p>
                  </button>
                ))
              )}

              {/* Colaboradores */}
              {drawer === 'colaboradores' && (
                <p className="font-[var(--mono)] text-xs text-[#3d5875] text-center py-4">
                  Acesse uma empresa específica para ver os colaboradores.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <SectionLabel>Restaurantes</SectionLabel>
        <Btn size="sm" className="w-auto" onClick={() => window.location.href = '/cadastro?tipo=restaurante'}>
          + Novo restaurante
        </Btn>
      </div>
      {(dados?.restaurantes ?? []).map((r: any) => {
        const expanded = expandedRest === r.id
        const faturaMes = r.planoLancamento && r.numEmpresas <= 25 ? 49.90
          : r.numEmpresas <= 5 ? 99.00
          : r.numEmpresas <= 10 ? 149.00
          : r.numEmpresas <= 15 ? 249.00
          : 349.00

        // Status de pagamento do mês
        const hoje = new Date()
        const diaVenc = r.dia_vencimento
        const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate()
        const diaReal = diaVenc ? Math.min(diaVenc, ultimoDia) : null
        const vencMes = diaReal ? new Date(hoje.getFullYear(), hoje.getMonth(), diaReal) : null
        const diasAteVenc = vencMes ? Math.floor((vencMes.getTime() - hoje.getTime()) / 86_400_000) : null
        const statusPag = !diaVenc ? 'sem_config'
          : diasAteVenc === null ? 'sem_config'
          : diasAteVenc < 0 ? 'vencido'
          : diasAteVenc <= 5 ? 'proximo'
          : 'ok'
        const suspenso = r.statusPlano === 'suspenso'

        return (
          <div key={r.id}
            className={`rounded-[14px] border transition-all overflow-hidden
              ${suspenso ? 'border-[rgba(255,77,106,.3)] bg-[rgba(255,77,106,.04)]' : 'border-[#1c2e48] bg-[#0d1525]'}
              ${expanded ? 'shadow-[0_4px_32px_rgba(0,0,0,.4)]' : ''}
            `}>

            {/* ── Tarja clicável ── */}
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
              onClick={() => setExpandedRest(e => e === r.id ? null : r.id)}>
              <div className="flex items-center gap-3">
                {/* Indicador de status */}
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  suspenso ? 'bg-[#ff4d6a]' :
                  r.planoLancamento ? 'bg-[#ffb340]' :
                  'bg-[#00e87a]'
                }`} />
                <div>
                  <p className="font-bold text-sm text-[#ddeaf8] leading-tight">{r.nome}</p>
                  <p className="font-[var(--mono)] text-[10px] text-[#3d5875]">
                    {r.numEmpresas} emp · {r.numColabs} colabs
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {r.planoLancamento && (
                  <span className="font-[var(--mono)] text-[9px] text-[#ffb340] border border-[rgba(255,179,64,.3)] rounded-full px-1.5 py-0.5">
                    🚀
                  </span>
                )}
                {statusPag === 'vencido' && (
                  <span className="font-[var(--mono)] text-[9px] text-[#ff4d6a] border border-[rgba(255,77,106,.3)] rounded-full px-1.5 py-0.5">
                    🔴 Vencido
                  </span>
                )}
                {statusPag === 'proximo' && (
                  <span className="font-[var(--mono)] text-[9px] text-[#ffb340] border border-[rgba(255,179,64,.3)] rounded-full px-1.5 py-0.5">
                    ⚠️ Vence dia {diaReal}
                  </span>
                )}
                <Badge color={STATUS_COLOR[r.statusPlano] ?? 'gray'}>{r.statusPlano}</Badge>
                <span className="text-[#3d5875] text-xs">{expanded ? '▲' : '▼'}</span>
              </div>
            </div>

            {/* ── Painel expandido ── */}
            {expanded && (
              <div className="border-t border-[#1c2e48] px-4 pb-4 pt-3 flex flex-col gap-4">

                {/* Info geral */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Empresas',    value: r.numEmpresas,   color: 'text-[#4da6ff]' },
                    { label: 'Colabs',      value: r.numColabs,     color: 'text-[#a259ff]' },
                    { label: 'Pedidos/mês', value: r.numPedidosMes, color: 'text-[#ffb340]' },
                  ].map(s => (
                    <div key={s.label} className="bg-[#080c14] border border-[#1c2e48] rounded-[10px] p-2 text-center">
                      <div className={`text-lg font-black font-[var(--mono)] ${s.color}`}>{s.value}</div>
                      <div className="font-[var(--mono)] text-[9px] tracking-[1px] text-[#3d5875] uppercase">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Fatura estimada */}
                <div className="flex items-center justify-between bg-[#080c14] border border-[#1c2e48] rounded-[10px] px-3 py-2.5">
                  <div>
                    <p className="font-[var(--mono)] text-[9px] tracking-[1.5px] text-[#3d5875] uppercase">Fatura estimada</p>
                    <p className="font-[var(--mono)] text-[10px] text-[#7a96b8] mt-0.5">
                      {r.planoLancamento && r.numEmpresas <= 25 ? '🚀 Plano lançamento'
                        : r.numEmpresas <= 5 ? '0–5 empresas'
                        : r.numEmpresas <= 10 ? '6–10 empresas'
                        : r.numEmpresas <= 15 ? '11–15 empresas'
                        : 'Acima de 15 empresas'}
                    </p>
                  </div>
                  <span className="font-[var(--mono)] text-xl font-black text-[#00e87a]">
                    {faturaMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>

                {/* Email */}
                <p className="font-[var(--mono)] text-[10px] text-[#3d5875]">✉️ {r.email}</p>

                {/* Status de pagamento do mês */}
                {diaVenc && (
                  <div className={`rounded-[10px] border px-3 py-2.5 flex items-center justify-between
                    ${statusPag === 'vencido' ? 'border-[rgba(255,77,106,.3)] bg-[rgba(255,77,106,.05)]'
                    : statusPag === 'proximo' ? 'border-[rgba(255,179,64,.3)] bg-[rgba(255,179,64,.05)]'
                    : 'border-[#1c2e48] bg-[#080c14]'}`}>
                    <div>
                      <p className="font-[var(--mono)] text-[9px] tracking-[1.5px] text-[#3d5875] uppercase">Pagamento do mês</p>
                      <p className={`font-[var(--mono)] text-xs mt-0.5 font-bold
                        ${statusPag === 'vencido' ? 'text-[#ff4d6a]'
                        : statusPag === 'proximo' ? 'text-[#ffb340]'
                        : 'text-[#00e87a]'}`}>
                        {statusPag === 'vencido'
                          ? `🔴 Vencido há ${Math.abs(diasAteVenc!)} dia${Math.abs(diasAteVenc!) !== 1 ? 's' : ''}`
                          : statusPag === 'proximo'
                            ? diasAteVenc === 0 ? `⚠️ Vence hoje (dia ${diaReal})`
                            : `⚠️ Vence em ${diasAteVenc} dia${diasAteVenc !== 1 ? 's' : ''} (dia ${diaReal})`
                          : `✅ Em dia (vence dia ${diaReal})`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Dia de vencimento */}
                <VencimentoEditor
                  restId={r.id}
                  nomeRest={r.nome}
                  diaAtual={r.dia_vencimento ?? null}
                  onSalvar={salvarVencimento}
                />

                {/* Ações */}
                <div className="grid grid-cols-2 gap-2">
                  <Btn size="sm" variant="secondary"
                    onClick={() => { setPlanoModal({ ...r, tipo: 'restaurante' }); setPlanoForm({ plano: r.plano, status: r.statusPlano, trialFim: r.trialFim ?? '', obs: r.obs ?? '' }) }}>
                    📋 Plano
                  </Btn>
                  <Btn size="sm" variant="secondary"
                    onClick={() => window.location.href = `/dashboard?restId=${r.id}`}>
                    👁️ Dashboard
                  </Btn>
                  <Btn size="sm" variant="secondary"
                    onClick={() => setExpandedRest(id => { setTimeout(() => setExpandedRest(r.id), 50); return null })}>
                    🏢 Ver empresas
                  </Btn>
                  <Btn size="sm" variant="secondary"
                    onClick={() => {
                      const hoje = new Date()
                      const inicioDefault = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}-01`
                      setVencForm({ dia: r.dia_vencimento?.toString() ?? '30', inicio: inicioDefault, meses: '12', valor: String(faturaMes) })
                      setVencModal(r)
                    }}>
                    📅 Vencimentos
                  </Btn>
                  <Btn size="sm"
                    variant={r.planoLancamento ? 'danger' : 'secondary'}
                    loading={acting === r.id}
                    onClick={() => toggleLancamento(r.id, r.nome, !!r.planoLancamento)}>
                    🚀 {r.planoLancamento ? 'Lançamento ON' : 'OFF'}
                  </Btn>
                </div>

                {suspenso
                  ? <Btn loading={acting === r.id} onClick={() => reativar('restaurante', r.id)}>
                      🔓 Reativar restaurante
                    </Btn>
                  : <Btn variant="danger" loading={acting === r.id} onClick={() => suspender('restaurante', r.id)}>
                      Suspender acesso
                    </Btn>
                }

                {/* Empresas */}
                <EmpresasDoRest restId={r.id} onRefresh={load} />
              </div>
            )}
          </div>
        )
      })}

      {/* Modal de status do restaurante */}
      <Modal open={!!planoModal} onClose={() => setPlanoModal(null)} title={`Status: ${planoModal?.nome}`}>
        <div className="flex flex-col gap-4">

          {/* Plano atual — read-only, calculado pelo sistema */}
          <div className="bg-[#080c14] border border-[#1c2e48] rounded-[11px] px-4 py-3 flex flex-col gap-1">
            <p className="font-[var(--mono)] text-[9px] tracking-[1.5px] text-[#3d5875] uppercase">Plano atual (automático)</p>
            <p className="font-[var(--mono)] text-sm text-[#00e87a] font-bold">
              {planoModal?.planoLancamento && (planoModal?.numEmpresas ?? 0) <= 25
                ? '🚀 Lançamento — R$ 49,90/mês'
                : (planoModal?.numEmpresas ?? 0) <= 5  ? '0–5 empresas — R$ 99,00/mês'
                : (planoModal?.numEmpresas ?? 0) <= 10 ? '6–10 empresas — R$ 149,00/mês'
                : (planoModal?.numEmpresas ?? 0) <= 15 ? '11–15 empresas — R$ 249,00/mês'
                : 'Acima de 15 empresas — R$ 349,00/mês'}
            </p>
            <p className="font-[var(--mono)] text-[10px] text-[#3d5875]">
              {planoModal?.numEmpresas ?? 0} empresa{(planoModal?.numEmpresas ?? 0) !== 1 ? 's' : ''} cadastrada{(planoModal?.numEmpresas ?? 0) !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Status — o admin ainda pode forçar suspenso/cancelado */}
          <div>
            <label className="font-[var(--mono)] text-[10px] tracking-[1.5px] text-[#3d5875] uppercase block mb-1.5">Status de acesso</label>
            <select value={planoForm.status} onChange={e => setPlanoForm(f => ({ ...f, status: e.target.value }))}
              className="w-full bg-[#080c14] border border-[#253d5e] rounded-[11px] px-3 py-2.5 font-[var(--mono)] text-[#ddeaf8] outline-none">
              <option value="trial">Trial</option>
              <option value="ativo">Ativo</option>
              <option value="suspenso">Suspenso</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          <Input label="Observação interna" value={planoForm.obs} onChange={e => setPlanoForm(f => ({ ...f, obs: e.target.value }))} placeholder="Opcional — visível só pelo admin..." />
          <Btn loading={saving} onClick={savePlano}>Salvar</Btn>
        </div>
      </Modal>
      {/* Modal de vencimentos */}
      <Modal open={!!vencModal} onClose={() => setVencModal(null)} title={`Vencimentos: ${vencModal?.nome}`}>
        <div className="flex flex-col gap-4">
          <p className="font-[var(--mono)] text-[10px] text-[#7a96b8] leading-relaxed">
            Gera cobranças mensais para o restaurante. Útil para registrar um contrato anual ou semestral.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="font-[var(--mono)] text-[9px] tracking-[1.5px] text-[#3d5875] uppercase">Dia do mês</label>
              <input type="number" min="1" max="31"
                value={vencForm.dia}
                onChange={e => setVencForm(f => ({ ...f, dia: e.target.value }))}
                className="bg-[#080c14] border border-[#253d5e] rounded-[10px] px-3 py-2 font-[var(--mono)] text-sm text-[#ddeaf8] outline-none text-center" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-[var(--mono)] text-[9px] tracking-[1.5px] text-[#3d5875] uppercase">Nº de meses</label>
              <input type="number" min="1" max="24"
                value={vencForm.meses}
                onChange={e => setVencForm(f => ({ ...f, meses: e.target.value }))}
                className="bg-[#080c14] border border-[#253d5e] rounded-[10px] px-3 py-2 font-[var(--mono)] text-sm text-[#ddeaf8] outline-none text-center" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-[var(--mono)] text-[9px] tracking-[1.5px] text-[#3d5875] uppercase">Data de início (AAAA-MM-DD)</label>
            <input type="date"
              value={vencForm.inicio}
              onChange={e => setVencForm(f => ({ ...f, inicio: e.target.value }))}
              className="bg-[#080c14] border border-[#253d5e] rounded-[10px] px-3 py-2 font-[var(--mono)] text-sm text-[#ddeaf8] outline-none" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-[var(--mono)] text-[9px] tracking-[1.5px] text-[#3d5875] uppercase">Valor mensal (R$)</label>
            <input type="number" step="0.01"
              value={vencForm.valor}
              onChange={e => setVencForm(f => ({ ...f, valor: e.target.value }))}
              className="bg-[#080c14] border border-[#253d5e] rounded-[10px] px-3 py-2 font-[var(--mono)] text-sm text-[#ddeaf8] outline-none" />
          </div>
          <Btn loading={vencSaving} onClick={() => { setVencSaving(true); gerarVencimentos() }}>
            Gerar {vencForm.meses} vencimento{parseInt(vencForm.meses) !== 1 ? 's' : ''}
          </Btn>
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
            {l.detalhe || '—'}
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
    { id: 'dashboard',  label: 'Dashboard',  icon: 'home'     as const, component: <DashboardPane /> },
    { id: 'financeiro', label: 'Financeiro', icon: 'relatorio' as const, component: <FinanceiroAdminPane /> },
    { id: 'logs',       label: 'Logs',       icon: 'admin'    as const, component: <LogsPane /> },
  ]

  return (
    <AppShell tabs={tabs} nome="Menuv Admin" badge="superadmin" role="Admin" />
  )
}
