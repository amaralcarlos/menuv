'use client'
import { useEffect, useState } from 'react'
import { useApi } from '@/lib/use-api'
import { useToast } from '@/components/ui'
import { Card, SectionLabel, Badge, Btn, Spinner, Modal } from '@/components/ui'

const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'] as const
type Dia = typeof DIAS_SEMANA[number]
type Secao = 'prato' | 'guarnicao' | 'outros'

const SECAO_META: Record<Secao, { label: string; color: string }> = {
  prato:     { label: 'Prato',     color: 'text-[#00e87a]' },
  guarnicao: { label: 'Guarnição', color: 'text-[#4da6ff]' },
  outros:    { label: 'Outros',    color: 'text-[#7a96b8]'  },
}

/* ── Calendar picker ─────────────────────────────────────── */
function CalendarPicker({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void
}) {
  const today = new Date()
  const [mes, setMes] = useState(today.getMonth())
  const [ano, setAno] = useState(today.getFullYear())

  const primeiroDia = new Date(ano, mes, 1).getDay()
  const diasNoMes   = new Date(ano, mes + 1, 0).getDate()
  const offset      = primeiroDia === 0 ? 6 : primeiroDia - 1

  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

  function select(dia: number) {
    const d = `${String(dia).padStart(2,'0')}/${String(mes+1).padStart(2,'0')}/${ano}`
    onChange(d)
  }

  function parseSelected() {
    if (!value) return null
    const parts = value.split('/')
    if (parts.length !== 3) return null
    return new Date(+parts[2], +parts[1]-1, +parts[0])
  }

  const sel = parseSelected()

  function prevMes() {
    if (mes === 0) { setMes(11); setAno(a => a-1) }
    else setMes(m => m-1)
  }
  function nextMes() {
    if (mes === 11) { setMes(0); setAno(a => a+1) }
    else setMes(m => m+1)
  }

  return (
    <div>
      <p className="font-[var(--mono)] text-[10px] text-[#3d5875] uppercase tracking-[1px] mb-2">{label}</p>
      <div className="bg-[#080c14] border border-[#1c2e48] rounded-[11px] p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMes} className="text-[#3d5875] hover:text-[#00e87a] transition-colors cursor-pointer bg-none border-none text-lg px-1">‹</button>
          <span className="font-[var(--mono)] text-xs text-[#ddeaf8] font-semibold">
            {meses[mes]} {ano}
          </span>
          <button onClick={nextMes} className="text-[#3d5875] hover:text-[#00e87a] transition-colors cursor-pointer bg-none border-none text-lg px-1">›</button>
        </div>

        {/* Dias da semana */}
        <div className="grid grid-cols-7 mb-1">
          {['S','T','Q','Q','S','S','D'].map((d, i) => (
            <div key={i} className="text-center font-[var(--mono)] text-[9px] text-[#3d5875] py-0.5">{d}</div>
          ))}
        </div>

        {/* Dias */}
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: diasNoMes }).map((_, i) => {
            const dia   = i + 1
            const isSelected = sel?.getDate() === dia && sel?.getMonth() === mes && sel?.getFullYear() === ano
            const isPast = new Date(ano, mes, dia) < new Date(today.getFullYear(), today.getMonth(), today.getDate())
            return (
              <button
                key={dia}
                onClick={() => !isPast && select(dia)}
                disabled={isPast}
                className={`text-center py-1 rounded-[6px] font-[var(--mono)] text-xs transition-all cursor-pointer border-none
                  ${isSelected
                    ? 'bg-[#00e87a] text-[#003320] font-bold'
                    : isPast
                      ? 'text-[#1c2e48] cursor-not-allowed'
                      : 'text-[#7a96b8] hover:bg-[rgba(0,232,122,.1)] hover:text-[#00e87a]'
                  }`}>
                {dia}
              </button>
            )
          })}
        </div>

        {value && (
          <p className="font-[var(--mono)] text-[10px] text-[#00e87a] text-center mt-2">
            ✓ {value}
          </p>
        )}
      </div>
    </div>
  )
}

/* ── Item list ───────────────────────────────────────────── */
function ItemList({ items, onAdd, onRemove }: {
  items: string[]
  onAdd: (v: string) => void
  onRemove: (i: number) => void
}) {
  const [adding, setAdding] = useState(false)
  const [val, setVal] = useState('')

  function confirm() {
    if (val.trim()) { onAdd(val.trim()); setVal('') }
    setAdding(false)
  }

  return (
    <div className="flex flex-col gap-1 mb-1">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 bg-[#0d1525] border border-[#1c2e48] rounded-[7px] px-2.5 py-1.5">
          <span className="flex-1 text-sm text-[#ddeaf8] font-medium">{item}</span>
          <button onClick={() => onRemove(i)}
            className="text-[#3d5875] hover:text-[#ff4d6a] transition-colors text-base leading-none bg-none border-none cursor-pointer">×</button>
        </div>
      ))}
      {adding ? (
        <div className="flex gap-1.5">
          <input
            autoFocus
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') setAdding(false) }}
            className="flex-1 bg-[#080c14] border border-[rgba(0,232,122,.4)] rounded-[7px] px-2.5 py-1.5 text-sm font-[var(--mono)] text-[#ddeaf8] outline-none"
            placeholder="Nome do item..."
          />
          <button onClick={confirm}
            className="bg-[#00e87a] rounded-[7px] px-2.5 text-xs font-bold text-[#003320] cursor-pointer border-none">OK</button>
          <button onClick={() => setAdding(false)}
            className="text-[#3d5875] text-xl leading-none bg-none border-none cursor-pointer px-1">×</button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-2 w-full bg-none border border-dashed border-[#1c2e48] rounded-[7px] px-2.5 py-1.5 text-xs font-[var(--mono)] text-[#3d5875] hover:border-[#00e87a] hover:text-[#00e87a] transition-colors cursor-pointer">
          <span className="text-[#00e87a] font-bold text-base leading-none">+</span> adicionar item
        </button>
      )}
    </div>
  )
}

/* ── Editor ──────────────────────────────────────────────── */
function CardapioEditor({ grade, onSave, onCancel, restId }: {
  grade: any; onSave: () => void; onCancel: () => void; restId: string
}) {
  const { call } = useApi()
  const toast = useToast()
  const [dias, setDias] = useState<Record<string, Record<Secao, string[]>>>(grade?.dias ?? {})
  const [activeDay, setActiveDay] = useState<Dia>('Seg')
  const [saving, setSaving] = useState(false)

  function setItems(dia: Dia, secao: Secao, items: string[]) {
    setDias(d => ({ ...d, [dia]: { ...(d[dia] ?? {}), [secao]: items } }))
  }

  function getItems(dia: Dia, secao: Secao): string[] {
    return (dias[dia] as any)?.[secao] ?? []
  }

  async function save() {
    setSaving(true)
    const res = await call('/api/grades', {
      method: 'POST',
      body: JSON.stringify({ id: grade?.id, nome: 'Cardápio Semanal', dias, restauranteId: restId }),
    })
    setSaving(false)
    if (res.success) { toast('Cardápio salvo!'); onSave() }
    else toast(res.error, 'error')
  }

  const diaCompleto = (d: Dia) => {
    const dd = dias[d]
    return dd && (dd.prato?.length > 0 || dd.guarnicao?.length > 0)
  }

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onCancel}
          className="text-[#3d5875] hover:text-[#ddeaf8] transition-colors bg-none border-none cursor-pointer text-lg">←</button>
        <h2 className="text-base font-bold text-[#ddeaf8]">Editar cardápio semanal</h2>
      </div>

      {/* Selector de dia */}
      <div className="grid grid-cols-5 gap-1.5 mb-4">
        {DIAS_SEMANA.map(d => (
          <button key={d} onClick={() => setActiveDay(d)}
            className={`relative py-2 px-1 rounded-[11px] text-center cursor-pointer transition-all border font-[var(--mono)] text-xs
              ${activeDay === d
                ? 'border-[#00e87a] bg-[rgba(0,232,122,.06)] text-[#00e87a]'
                : 'border-[#1c2e48] bg-[#0d1525] text-[#3d5875] hover:border-[rgba(0,232,122,.3)]'}
              ${diaCompleto(d) ? 'after:content-["✓"] after:absolute after:top-[-5px] after:right-[-5px] after:bg-[#00e87a] after:text-black after:text-[9px] after:font-bold after:w-3.5 after:h-3.5 after:rounded-full after:flex after:items-center after:justify-center after:leading-none' : ''}`}>
            {d}
          </button>
        ))}
      </div>

      {(['prato', 'guarnicao', 'outros'] as Secao[]).map(secao => (
        <div key={secao} className="mb-4">
          <SectionLabel>
            <span className={SECAO_META[secao].color}>{SECAO_META[secao].label}</span>
          </SectionLabel>
          <ItemList
            items={getItems(activeDay, secao)}
            onAdd={v => setItems(activeDay, secao, [...getItems(activeDay, secao), v])}
            onRemove={i => setItems(activeDay, secao, getItems(activeDay, secao).filter((_, j) => j !== i))}
          />
        </div>
      ))}

      <Btn onClick={save} loading={saving}>Salvar cardápio</Btn>
    </div>
  )
}

/* ── Main ────────────────────────────────────────────────── */
export default function GradesPane({ restId }: { restId: string }) {
  const { call } = useApi()
  const toast = useToast()
  const [grades, setGrades]         = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [editing, setEditing]       = useState<any>(null)
  const [publishModal, setPublishModal] = useState<any>(null)
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim]       = useState('')
  const [acting, setActing]         = useState('')

  async function load() {
    const res = await call<any[]>(`/api/grades?restauranteId=${restId}`)
    if (res.success) setGrades(res.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [restId])

  async function publicar() {
    if (!publishModal) return
    if (!dataInicio || !dataFim) { toast('Selecione as datas de início e fim.', 'error'); return }
    setActing('pub')
    const res = await call(`/api/grades/${publishModal.id}/publicar`, {
      method: 'PATCH',
      body: JSON.stringify({ dataInicio, dataFim }),
    })
    setActing('')
    if (res.success) { toast('Cardápio publicado!'); setPublishModal(null); load() }
    else toast(res.error, 'error')
  }

  async function despublicar(id: string) {
    setActing(id)
    const res = await call(`/api/grades/${id}/despublicar`, { method: 'PATCH', body: '{}' })
    setActing('')
    if (res.success) { toast('Cardápio despublicado.'); load() }
    else toast(res.error, 'error')
  }

  async function remover(id: string) {
    if (!confirm('Remover este cardápio?')) return
    setActing(id)
    await call(`/api/grades/${id}`, { method: 'DELETE' })
    setActing('')
    toast('Cardápio removido.')
    load()
  }

  if (editing !== undefined && editing !== null) {
    return <CardapioEditor
      grade={editing === 'new' ? null : editing}
      restId={restId}
      onSave={() => { setEditing(null); load() }}
      onCancel={() => setEditing(null)}
    />
  }

  if (loading) return <Spinner />

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <SectionLabel>Cardápio semanal</SectionLabel>
        <Btn size="sm" className="w-auto" onClick={() => setEditing('new')}>+ Novo</Btn>
      </div>

      {grades.length === 0 && (
        <Card>
          <p className="text-center font-[var(--mono)] text-xs text-[#3d5875] py-4">
            Nenhum cardápio. Crie um para começar.
          </p>
        </Card>
      )}

      {grades.map(g => (
        <Card key={g.id} highlight={g.status === 'publicada'}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="font-bold text-sm text-[#ddeaf8]">Cardápio Semanal</p>
              {g.data_inicio && (
                <p className="font-[var(--mono)] text-[10px] text-[#3d5875] mt-0.5">
                  {g.data_inicio} → {g.data_fim ?? '—'}
                </p>
              )}
            </div>
            <Badge color={g.status === 'publicada' ? 'green' : 'gray'}>
              {g.status === 'publicada' ? 'Publicado' : 'Rascunho'}
            </Badge>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Btn size="sm" variant="secondary" className="w-auto" onClick={() => setEditing(g)}>Editar</Btn>
            {g.status === 'publicada'
              ? <Btn size="sm" variant="secondary" className="w-auto" loading={acting === g.id} onClick={() => despublicar(g.id)}>Despublicar</Btn>
              : <Btn size="sm" className="w-auto" onClick={() => { setPublishModal(g); setDataInicio(''); setDataFim('') }}>Publicar</Btn>
            }
            <Btn size="sm" variant="danger" className="w-auto" loading={acting === g.id} onClick={() => remover(g.id)}>Remover</Btn>
          </div>
        </Card>
      ))}

      <Modal open={!!publishModal} onClose={() => setPublishModal(null)} title="Publicar cardápio">
        <div className="flex flex-col gap-4">
          <p className="font-[var(--mono)] text-xs text-[#3d5875]">
            Selecione o período em que o cardápio ficará visível para os colaboradores.
          </p>
          <CalendarPicker label="Data de início" value={dataInicio} onChange={setDataInicio} />
          <CalendarPicker label="Data de fim" value={dataFim} onChange={setDataFim} />
          <Btn loading={acting === 'pub'} onClick={publicar}>Publicar cardápio</Btn>
        </div>
      </Modal>
    </div>
  )
}
