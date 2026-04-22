'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useApi } from '@/lib/use-api'
import { useToast } from '@/components/ui'
import { AppShell } from '@/components/layout/AppShell'
import { Card, SectionLabel, Badge, Btn, Spinner } from '@/components/ui'
import ResumoColabPane from './ResumoColabPane'

const DIAS_PT  = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

type ItemSel = { nome: string; ajuste: 'normal' | 'extra' | 'reduzido' }

function isPassado(dataStr: string) {
  const parts = dataStr.split('/')
  const date  = new Date(+parts[2], +parts[1] - 1, +parts[0])
  return date < new Date(new Date().setHours(0,0,0,0))
}

/* ── Day selector ────────────────────────────────────────── */
function DaySelector({ dias, selected, onSelect }: {
  dias: any[]; selected: string; onSelect: (d: string) => void
}) {
  return (
    <div className="grid grid-cols-5 gap-1.5 mb-4">
      {dias.map(d => {
        const parts = d.data.split('/')
        const date  = new Date(+parts[2], +parts[1] - 1, +parts[0])
        const dow   = DIAS_PT[date.getDay()]
        const hasPedido = !!d.pedido
        const n = new Date()
        const hojeStr = `${String(n.getDate()).padStart(2,'0')}/${String(n.getMonth()+1).padStart(2,'0')}/${n.getFullYear()}`
        const isToday = d.data === hojeStr
        const isPast  = isPassado(d.data)

        return (
          <button key={d.data}
            onClick={() => !isPast && onSelect(d.data)}
            disabled={isPast}
            className={`relative py-2 px-1 rounded-[11px] text-center transition-all border
              ${isPast
                ? 'opacity-40 cursor-not-allowed border-[#1c2e48] bg-[#0d1525]'
                : selected === d.data
                  ? 'cursor-pointer border-[#00e87a] bg-[rgba(0,232,122,.06)]'
                  : isToday
                    ? 'cursor-pointer border-[rgba(0,232,122,.2)] bg-[rgba(0,232,122,.03)]'
                    : 'cursor-pointer border-[#1c2e48] bg-[#0d1525] hover:border-[rgba(0,232,122,.3)]'}
              ${hasPedido ? 'after:content-["✓"] after:absolute after:top-[-5px] after:right-[-5px] after:bg-[#00e87a] after:text-black after:text-[9px] after:font-bold after:w-3.5 after:h-3.5 after:rounded-full after:flex after:items-center after:justify-center' : ''}`}>
            <div className={`font-[var(--mono)] text-[10px] tracking-[.3px] ${selected === d.data ? 'text-[rgba(0,232,122,.7)]' : 'text-[#3d5875]'}`}>{dow}</div>
            <div className={`text-sm font-semibold mt-0.5 ${selected === d.data ? 'text-[#00e87a]' : 'text-[#ddeaf8]'}`}>{String(date.getDate()).padStart(2,'0')}</div>
          </button>
        )
      })}
    </div>
  )
}

/* ── Buffet form ─────────────────────────────────────────── */
function BuffetForm({ dia, colabId, empId, onSaved }: {
  dia: any; colabId: string; empId: string; onSaved: () => void
}) {
  const { call } = useApi()
  const toast    = useToast()
  const existingPedido = dia.pedido
  const [saving,    setSaving]    = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [empConfig, setEmpConfig] = useState<any>(null)

  useEffect(() => {
    call<any[]>(`/api/empresas?empresaId=${empId}`).then(r => {
      if (r.success && Array.isArray(r.data)) setEmpConfig(r.data[0])
      else if (r.success) setEmpConfig(r.data)
    })
  }, [empId])

  const parts   = dia.data.split('/')
  const date    = new Date(+parts[2], +parts[1] - 1, +parts[0])
  const dow     = DIAS_PT[date.getDay()]
  const hoje    = new Date()
  const isToday = date.toDateString() === hoje.toDateString()
  const isPast  = isPassado(dia.data)

  let bloqueado = false
  let motivoBloqueio = ''
  if (isToday && empConfig?.horario_limite) {
    const [h, m] = empConfig.horario_limite.split(':').map(Number)
    const cutoff = new Date(); cutoff.setHours(h, m, 0, 0)
    if (hoje >= cutoff) { bloqueado = true; motivoBloqueio = `Reservas encerradas às ${empConfig.horario_limite}` }
  }

  const allItems = [
    ...(dia.pratos     ?? []).map((p: any) => p.nome),
    ...(dia.guarnicoes ?? []).map((g: any) => g.nome),
    ...(dia.outros     ?? []).map((o: any) => o.nome),
  ]

  async function reservar() {
    if (!colabId) { toast('Erro: faça logout e login novamente.', 'error'); return }
    setSaving(true)
    const res = await call('/api/pedidos', {
      method: 'POST',
      body: JSON.stringify({
        colaboradorId: colabId,
        empresaId:     empId,
        data:          `${parts[2]}-${parts[1]}-${parts[0]}`,
        itens:         ['reserva'],
        obs:           '',
      }),
    })
    setSaving(false)
    if (res.success) { toast('Reserva confirmada!'); onSaved() }
    else toast(res.error ?? 'Erro ao reservar.', 'error')
  }

  async function cancelar() {
    if (!existingPedido?.id) return
    if (!confirm('Cancelar reserva?')) return
    setCanceling(true)
    const res = await call(`/api/pedidos/${existingPedido.id}`, { method: 'DELETE' })
    setCanceling(false)
    if (res.success) { toast('Reserva cancelada.'); onSaved() }
    else toast(res.error ?? 'Erro ao cancelar.', 'error')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-[#ddeaf8]">
          {dow}, {String(date.getDate()).padStart(2,'0')} {MESES_PT[date.getMonth()]}
        </p>
        {existingPedido
          ? <Badge color="green">Reservado</Badge>
          : <Badge color="gray">Sem reserva</Badge>
        }
      </div>

      {isPast && (
        <div className="bg-[rgba(122,150,184,.07)] border border-[rgba(122,150,184,.2)] rounded-[11px] px-3 py-2 mb-3">
          <p className="font-[var(--mono)] text-xs text-[#7a96b8]">📅 Consulta apenas — dia anterior.</p>
        </div>
      )}

      {!isPast && bloqueado && (
        <div className="bg-[rgba(255,179,64,.07)] border border-[rgba(255,179,64,.2)] rounded-[11px] px-3 py-2 mb-3">
          <p className="font-[var(--mono)] text-xs text-[#ffb340]">⏰ {motivoBloqueio}</p>
        </div>
      )}

      {allItems.length > 0 && (
        <div className="mb-4">
          <p className="font-[var(--mono)] text-[10px] text-[#3d5875] uppercase tracking-[1px] mb-2">
            🍽️ Cardápio do dia
          </p>
          <div className="flex flex-col gap-1">
            {allItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-[#0d1525] border border-[#1c2e48] rounded-[8px] px-3 py-2">
                <span className="text-sm text-[#ddeaf8]">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {allItems.length === 0 && (
        <p className="font-[var(--mono)] text-xs text-[#3d5875] py-4 text-center">
          Sem cardápio para este dia.
        </p>
      )}

      {!isPast && !bloqueado && allItems.length > 0 && (
        <div className="flex flex-col gap-2">
          {!existingPedido ? (
            <Btn onClick={reservar} loading={saving}>✅ Confirmar reserva</Btn>
          ) : (
            <Btn variant="danger" onClick={cancelar} loading={canceling}>✕ Cancelar reserva</Btn>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Marmita form ────────────────────────────────────────── */
function OrderForm({ dia, colabId, empId, restId, onSaved }: {
  dia: any; colabId: string; empId: string; restId: string; onSaved: () => void
}) {
  const { call } = useApi()
  const toast    = useToast()
  const existingPedido = dia.pedido

  const allItems = [
    ...(dia.pratos     ?? []).map((p: any) => ({ nome: p.nome, tipo: 'prato'     })),
    ...(dia.guarnicoes ?? []).map((g: any) => ({ nome: g.nome, tipo: 'guarnicao' })),
    ...(dia.outros     ?? []).map((o: any) => ({ nome: o.nome, tipo: 'outro'     })),
  ]

  function parseExisting(): ItemSel[] {
    if (!existingPedido?.itens) return []
    return existingPedido.itens.map((s: string) => {
      if (s.endsWith(' [extra]'))    return { nome: s.replace(' [extra]', ''),    ajuste: 'extra'    as const }
      if (s.endsWith(' [reduzido]')) return { nome: s.replace(' [reduzido]', ''), ajuste: 'reduzido' as const }
      return { nome: s, ajuste: 'normal' as const }
    })
  }

  const [selected,  setSelected]  = useState<ItemSel[]>(parseExisting())
  const [obs,       setObs]       = useState<string>(existingPedido?.obs ?? '')
  const [saving,    setSaving]    = useState(false)
  const [empConfig, setEmpConfig] = useState<any>(null)

  useEffect(() => {
    setSelected(parseExisting())
    setObs(existingPedido?.obs ?? '')
  }, [dia.data])

  useEffect(() => {
    call<any[]>(`/api/empresas?restauranteId=${restId}`).then(r => {
      if (r.success) setEmpConfig(r.data.find((e: any) => e.id === empId))
    })
  }, [empId])

  const parts   = dia.data.split('/')
  const date    = new Date(+parts[2], +parts[1] - 1, +parts[0])
  const dow     = DIAS_PT[date.getDay()]
  const hoje    = new Date()
  const isToday = date.toDateString() === hoje.toDateString()
  const isPast  = isPassado(dia.data)

  let bloqueado = false
  let motivoBloqueio = ''
  if (isToday && empConfig?.horario_limite) {
    const [h, m] = empConfig.horario_limite.split(':').map(Number)
    const cutoff = new Date(); cutoff.setHours(h, m, 0, 0)
    if (hoje >= cutoff) { bloqueado = true; motivoBloqueio = `Pedidos encerrados às ${empConfig.horario_limite}` }
  }

  function isItemSelected(nome: string) {
    return selected.some(s => s.nome === nome)
  }

  function getAjuste(nome: string): 'normal' | 'extra' | 'reduzido' {
    return selected.find(s => s.nome === nome)?.ajuste ?? 'normal'
  }

  function toggleItem(nome: string) {
    setSelected(s => s.some(i => i.nome === nome)
      ? s.filter(i => i.nome !== nome)
      : [...s, { nome, ajuste: 'normal' }]
    )
  }

  function toggleAjuste(nome: string, ajuste: 'extra' | 'reduzido') {
    setSelected(s => s.map(i => i.nome === nome
      ? { ...i, ajuste: i.ajuste === ajuste ? 'normal' : ajuste }
      : i
    ))
  }

  async function salvar() {
    if (selected.length === 0) { toast('Selecione ao menos um item.', 'error'); return }
    if (!colabId) { toast('Erro: faça logout e login novamente.', 'error'); return }
    setSaving(true)
    const itens = selected.map(s =>
      s.ajuste === 'normal' ? s.nome : `${s.nome} [${s.ajuste}]`
    )
    const res = await call('/api/pedidos', {
      method: 'POST',
      body: JSON.stringify({
        colaboradorId: colabId,
        empresaId:     empId,
        data:          `${parts[2]}-${parts[1]}-${parts[0]}`,
        itens,
        obs,
      }),
    })
    setSaving(false)
    if (res.success) { toast('Pedido salvo!'); onSaved() }
    else toast(res.error ?? 'Erro ao salvar pedido.', 'error')
  }

  const tipoBadge: Record<string, string> = {
    prato:     'bg-[rgba(0,232,122,.08)] text-[#00e87a]',
    guarnicao: 'bg-[rgba(77,166,255,.1)] text-[#4da6ff]',
    outro:     'bg-[rgba(122,150,184,.08)] text-[#7a96b8]',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-[#ddeaf8]">
          {dow}, {String(date.getDate()).padStart(2,'0')} {MESES_PT[date.getMonth()]}
        </p>
        {existingPedido && <Badge color="green">Pedido feito</Badge>}
      </div>

      {isPast && (
        <div className="bg-[rgba(122,150,184,.07)] border border-[rgba(122,150,184,.2)] rounded-[11px] px-3 py-2 mb-3">
          <p className="font-[var(--mono)] text-xs text-[#7a96b8]">📅 Consulta apenas — dia anterior.</p>
        </div>
      )}

      {!isPast && bloqueado && (
        <div className="bg-[rgba(255,179,64,.07)] border border-[rgba(255,179,64,.2)] rounded-[11px] px-3 py-2 mb-3">
          <p className="font-[var(--mono)] text-xs text-[#ffb340]">⏰ {motivoBloqueio}</p>
        </div>
      )}

      {allItems.length === 0 && (
        <p className="font-[var(--mono)] text-xs text-[#3d5875] py-4 text-center">
          Sem cardápio para este dia.
        </p>
      )}

      <div className="flex flex-col gap-2 mb-4">
        {allItems.map((item, idx) => {
          const sel    = isItemSelected(item.nome)
          const ajuste = getAjuste(item.nome)
          return (
            <div key={`${item.nome}-${idx}`}
              className={`rounded-[11px] border transition-all
                ${sel
                  ? 'border-[rgba(0,232,122,.4)] bg-[rgba(0,232,122,.06)]'
                  : 'border-[#1c2e48] bg-[#0d1525]'}`}>
              <button
                onClick={() => !bloqueado && !isPast && toggleItem(item.nome)}
                disabled={bloqueado || isPast}
                className="w-full flex items-center gap-2.5 p-3 text-left cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center flex-shrink-0 transition-all
                  ${sel ? 'bg-[#00e87a] border-[#00e87a]' : 'border-[#253d5e]'}`}>
                  {sel && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l3 3 5-6" stroke="#003320" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className="flex-1 text-sm font-medium text-[#ddeaf8]">{item.nome}</span>
                <span className={`font-[var(--mono)] text-[9px] tracking-[.5px] px-1.5 py-0.5 rounded-full ${tipoBadge[item.tipo]}`}>
                  {item.tipo === 'prato' ? 'prato' : item.tipo === 'guarnicao' ? 'guarnicao' : 'outro'}
                </span>
              </button>

              {sel && !bloqueado && !isPast && (
                <div className="flex gap-2 px-3 pb-3">
                  {(['extra', 'reduzido'] as const).map(a => (
                    <button
                      key={a}
                      onClick={() => toggleAjuste(item.nome, a)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border font-[var(--mono)] text-[10px] uppercase tracking-[.5px] transition-all cursor-pointer
                        ${ajuste === a
                          ? 'bg-[rgba(0,232,122,.12)] border-[rgba(0,232,122,.4)] text-[#00e87a]'
                          : 'bg-transparent border-[#253d5e] text-[#3d5875] hover:border-[#3d5875]'
                        }`}>
                      <div className={`w-3 h-3 rounded-[3px] border flex items-center justify-center flex-shrink-0
                        ${ajuste === a ? 'bg-[#00e87a] border-[#00e87a]' : 'border-[#3d5875]'}`}>
                        {ajuste === a && (
                          <svg width="7" height="6" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4l3 3 5-6" stroke="#003320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      {a === 'extra' ? 'Extra' : 'Reduzido'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!isPast && !bloqueado && allItems.length > 0 && (
        <Btn onClick={salvar} loading={saving}>
          {existingPedido ? 'Atualizar pedido' : 'Confirmar pedido'}
        </Btn>
      )}
    </div>
  )
}

/* ── Main pedidos page ───────────────────────────────────── */
function PedidosContent() {
  const { meta }  = useAuth()
  const { call }  = useApi()
  const [semana,       setSemana]       = useState<any[]>([])
  const [empConfig,    setEmpConfig]    = useState<any>(null)
  const [loading,      setLoading]      = useState(true)
  const [selectedDate, setSelectedDate] = useState('')

  const colabId = meta?.colaborador_id ?? ''
  const empId   = meta?.empresa_id     ?? ''

  async function load() {
    if (!meta?.restaurante_id) return

    const empRes = await call<any[]>(`/api/empresas?restauranteId=${meta.restaurante_id}`)
    if (empRes.success) {
      const emp = empRes.data.find((e: any) => e.id === empId)
      setEmpConfig(emp)
    }

    const res = await call<any[]>(`/api/cardapio/semana?restauranteId=${meta.restaurante_id}`)
    if (res.success && res.data.length > 0) {
      const pedRes = await call<any[]>(`/api/pedidos?empresaId=${empId}`)
      const pedMap: Record<string, any> = {}
      if (pedRes.success) {
        pedRes.data.forEach((p: any) => {
          const parts = p.data.split('-')
          const key   = `${parts[2]}/${parts[1]}/${parts[0]}`
          pedMap[key] = p
        })
      }
      const merged = res.data.map(d => ({ ...d, pedido: pedMap[d.data] ?? null }))
      setSemana(merged)

      const n       = new Date()
      const hojeStr = `${String(n.getDate()).padStart(2,'0')}/${String(n.getMonth()+1).padStart(2,'0')}/${n.getFullYear()}`
      const todayDia = merged.find(d => d.data === hojeStr)
      setSelectedDate(todayDia?.data ?? merged[0]?.data ?? '')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [meta])

  if (loading) return <Spinner />

  const isBuffet = empConfig?.formato === 'buffet'

  if (semana.length === 0) return (
    <div className="px-4 pt-8 text-center">
      <p className="text-4xl mb-3">🍽️</p>
      <p className="font-bold text-[#ddeaf8] mb-1">Sem cardápio disponível</p>
      <p className="font-[var(--mono)] text-xs text-[#3d5875]">
        Aguarde seu restaurante publicar o cardápio da semana.
      </p>
    </div>
  )

  const diaSelected = semana.find(d => d.data === selectedDate)

  return (
    <div className="px-4 pt-4 pb-24">
      {isBuffet && (
        <div className="flex items-center gap-2 mb-3 bg-[rgba(77,166,255,.06)] border border-[rgba(77,166,255,.15)] rounded-[8px] px-3 py-2">
          <span className="text-sm">🍽️</span>
          <p className="font-[var(--mono)] text-[10px] text-[#4da6ff]">Formato buffet — visualize o cardápio e faça a sua reserva</p>
        </div>
      )}
      <SectionLabel>Selecione o dia</SectionLabel>
      <DaySelector dias={semana} selected={selectedDate} onSelect={setSelectedDate} />
      {diaSelected && (
        <Card highlight={!!diaSelected.pedido}>
          {isBuffet ? (
            <BuffetForm
              key={selectedDate}
              dia={diaSelected}
              colabId={colabId}
              empId={empId}
              onSaved={load}
            />
          ) : (
            <OrderForm
              key={selectedDate}
              dia={diaSelected}
              colabId={colabId}
              empId={empId}
              restId={meta?.restaurante_id ?? ''}
              onSaved={load}
            />
          )}
        </Card>
      )}
    </div>
  )
}

export default function PedidosPage() {
  const { meta } = useAuth()
  const isGestor = meta?.is_gestor
  const empId    = meta?.empresa_id ?? ''

  const tabs = [
    { id: 'pedido',  label: 'Pedido',  icon: 'pedido'    as const, component: <PedidosContent /> },
    { id: 'resumo',  label: 'Resumo',  icon: 'relatorio' as const, component: <ResumoColabPane empresaId={empId} /> },
    ...(isGestor ? [{ id: 'relatorio', label: 'Relatório', icon: 'relatorio' as const, component: <div /> }] : []),
  ]

  return <AppShell tabs={tabs} nome={meta?.nome ?? 'Menuv'} badge="colaborador" role="Colaborador" subInfo={meta?.empresa_nome} />
}
