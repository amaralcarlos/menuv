'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useApi } from '@/lib/use-api'
import { useToast } from '@/components/ui'
import { AppShell } from '@/components/layout/AppShell'
import { Card, SectionLabel, Badge, Btn, Spinner } from '@/components/ui'

const DIAS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

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
        const isToday   = d.data === (() => {
          const n = new Date()
          return `${String(n.getDate()).padStart(2,'0')}/${String(n.getMonth()+1).padStart(2,'0')}/${n.getFullYear()}`
        })()

        return (
          <button key={d.data} onClick={() => onSelect(d.data)}
            className={`relative py-2 px-1 rounded-[11px] text-center cursor-pointer transition-all border
              ${selected === d.data
                ? 'border-[#00e87a] bg-[rgba(0,232,122,.06)]'
                : isToday
                  ? 'border-[rgba(0,232,122,.2)] bg-[rgba(0,232,122,.03)]'
                  : 'border-[#1c2e48] bg-[#0d1525] hover:border-[rgba(0,232,122,.3)]'}
              ${hasPedido ? 'after:content-["✓"] after:absolute after:top-[-5px] after:right-[-5px] after:bg-[#00e87a] after:text-black after:text-[9px] after:font-bold after:w-3.5 after:h-3.5 after:rounded-full after:flex after:items-center after:justify-center' : ''}`}>
            <div className={`font-[var(--mono)] text-[10px] tracking-[.3px] ${selected === d.data ? 'text-[rgba(0,232,122,.7)]' : 'text-[#3d5875]'}`}>{dow}</div>
            <div className={`text-sm font-semibold mt-0.5 ${selected === d.data ? 'text-[#00e87a]' : 'text-[#ddeaf8]'}`}>{String(date.getDate()).padStart(2,'0')}</div>
          </button>
        )
      })}
    </div>
  )
}

/* ── Order form ──────────────────────────────────────────── */
function OrderForm({ dia, colabId, empId, restId, onSaved }: {
  dia: any; colabId: string; empId: string; restId: string; onSaved: () => void
}) {
  const { call } = useApi()
  const toast = useToast()
  const existingPedido = dia.pedido
  const [selected, setSelected] = useState<string[]>(existingPedido?.itens ?? [])
  const [obs, setObs] = useState(existingPedido?.obs ?? '')
  const [saving, setSaving] = useState(false)

  // Empresa config for cutoff time
  const [empConfig, setEmpConfig] = useState<any>(null)
  useEffect(() => {
    call<any[]>(`/api/empresas?restauranteId=${restId}`).then(r => {
      if (r.success) setEmpConfig(r.data.find((e: any) => e.id === empId))
    })
  }, [empId])

  const parts = dia.data.split('/')
  const date  = new Date(+parts[2], +parts[1] - 1, +parts[0])
  const dow   = DIAS_PT[date.getDay()]
  const hoje  = new Date()
  const isToday = date.toDateString() === hoje.toDateString()

  // Check cutoff
  let bloqueado = false
  let motivoBloqueio = ''
  if (isToday && empConfig?.horario_limite) {
    const [h, m] = empConfig.horario_limite.split(':').map(Number)
    const cutoff = new Date(); cutoff.setHours(h, m, 0, 0)
    if (hoje >= cutoff) {
      bloqueado = true
      motivoBloqueio = `Pedidos encerrados às ${empConfig.horario_limite}`
    }
  }

  function toggle(item: string) {
    setSelected(s => s.includes(item) ? s.filter(i => i !== item) : [...s, item])
  }

  async function salvar() {
    if (selected.length === 0) { toast('Selecione ao menos um item.', 'error'); return }
    setSaving(true)
    const dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`
    const res = await call('/api/pedidos', {
      method: 'POST',
      body: JSON.stringify({ colaboradorId: colabId, empresaId: empId, data: dateStr, itens: selected, obs }),
    })
    setSaving(false)
    if (res.success) { toast('Pedido salvo!'); onSaved() }
    else toast(res.error, 'error')
  }

  const allItems = [
    ...(dia.pratos    ?? []).map((p: any) => ({ nome: p.nome, tipo: 'prato' })),
    ...(dia.guarnicoes ?? []).map((g: any) => ({ nome: g.nome, tipo: 'guarnicao' })),
    ...(dia.outros    ?? []).map((o: any) => ({ nome: o.nome, tipo: 'outro' })),
  ]

  const tipoBadge: Record<string, string> = {
    prato:     'bg-[rgba(0,232,122,.08)] text-[#00e87a]',
    guarnicao: 'bg-[rgba(77,166,255,.1)] text-[#4da6ff]',
    outro:     'bg-[rgba(122,150,184,.08)] text-[#7a96b8]',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-[#ddeaf8]">{dow}, {String(date.getDate()).padStart(2,'0')} {MESES_PT[date.getMonth()]}</p>
        {existingPedido && <Badge color="green">Pedido feito</Badge>}
      </div>

      {bloqueado && (
        <div className="bg-[rgba(255,179,64,.07)] border border-[rgba(255,179,64,.2)] rounded-[11px] px-3 py-2 mb-3">
          <p className="font-[var(--mono)] text-xs text-[#ffb340]">⏰ {motivoBloqueio}</p>
        </div>
      )}

      {allItems.length === 0 && (
        <p className="font-[var(--mono)] text-xs text-[#3d5875] py-4 text-center">Sem cardápio para este dia.</p>
      )}

      <div className="flex flex-col gap-1.5 mb-4">
        {allItems.map(item => (
          <button key={item.nome} onClick={() => !bloqueado && toggle(item.nome)}
            disabled={bloqueado}
            className={`flex items-center gap-2.5 p-3 rounded-[11px] border text-left transition-all cursor-pointer
              ${selected.includes(item.nome)
                ? 'border-[rgba(0,232,122,.4)] bg-[rgba(0,232,122,.06)] shadow-[0_0_10px_rgba(0,232,122,.1)]'
                : 'border-[#1c2e48] bg-[#0d1525] hover:border-[rgba(0,232,122,.2)]'}
              disabled:opacity-40 disabled:cursor-not-allowed`}>
            <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center flex-shrink-0 transition-all
              ${selected.includes(item.nome) ? 'bg-[#00e87a] border-[#00e87a]' : 'border-[#253d5e]'}`}>
              {selected.includes(item.nome) && (
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
        ))}
      </div>

      {!bloqueado && allItems.length > 0 && (
        <Btn onClick={salvar} loading={saving}>
          {existingPedido ? 'Atualizar pedido' : 'Confirmar pedido'}
        </Btn>
      )}
    </div>
  )
}

/* ── Main pedidos page ───────────────────────────────────── */
function PedidosContent() {
  const { meta } = useAuth()
  const { call } = useApi()
  const [semana, setSemana] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState('')

  const colabId = meta?.colaborador_id ?? ''
  const empId   = meta?.empresa_id ?? ''

  async function load() {
    if (!meta?.restaurante_id) return
    const res = await call<any[]>(`/api/cardapio/semana?restauranteId=${meta.restaurante_id}`)
    if (res.success && res.data.length > 0) {
      // Merge with existing pedidos
      const pedRes = await call<any[]>(`/api/pedidos?empresaId=${empId}`)
      const pedMap: Record<string, any> = {}
      if (pedRes.success) {
        pedRes.data.forEach((p: any) => {
          const parts = p.data.split('-')
          const key = `${parts[2]}/${parts[1]}/${parts[0]}`
          pedMap[key] = p
        })
      }
      const merged = res.data.map(d => ({ ...d, pedido: pedMap[d.data] ?? null }))
      setSemana(merged)

      // Select today or first day
      const hoje = new Date()
      const hojeStr = `${String(hoje.getDate()).padStart(2,'0')}/${String(hoje.getMonth()+1).padStart(2,'0')}/${hoje.getFullYear()}`
      const todayDia = merged.find(d => d.data === hojeStr)
      setSelectedDate(todayDia?.data ?? merged[0]?.data ?? '')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [meta])

  if (loading) return <Spinner />

  if (semana.length === 0) return (
    <div className="px-4 pt-8 text-center">
      <p className="text-4xl mb-3">🍽️</p>
      <p className="font-bold text-[#ddeaf8] mb-1">Sem cardápio disponível</p>
      <p className="font-[var(--mono)] text-xs text-[#3d5875]">Aguarde seu restaurante publicar o cardápio da semana.</p>
    </div>
  )

  const diaSelected = semana.find(d => d.data === selectedDate)

  return (
    <div className="px-4 pt-4 pb-24">
      <SectionLabel>Selecione o dia</SectionLabel>
      <DaySelector dias={semana} selected={selectedDate} onSelect={setSelectedDate} />

      {diaSelected && (
        <Card highlight={!!diaSelected.pedido}>
          <OrderForm
            key={selectedDate}
            dia={diaSelected}
            colabId={colabId}
            empId={empId}
            restId={meta?.restaurante_id ?? ''}
            onSaved={load}
          />
        </Card>
      )}
    </div>
  )
}

export default function PedidosPage() {
  const { meta } = useAuth()
  const nome = 'Menuv'
  const isGestor = meta?.is_gestor

  const tabs = [
    { id: 'pedido', label: 'Pedido', icon: 'pedido' as const, component: <PedidosContent /> },
    ...(isGestor ? [{ id: 'relatorio', label: 'Relatório', icon: 'relatorio' as const, component: <div /> }] : []),
  ]

 return <AppShell tabs={tabs} nome={meta?.nome ?? 'Menuv'} badge="colaborador" role="Colaborador" />
