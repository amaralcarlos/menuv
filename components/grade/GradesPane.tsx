'use client'
import { useEffect, useState } from 'react'
import { useApi } from '@/lib/use-api'
import { useToast } from '@/components/ui'
import { Card, SectionLabel, Badge, Btn, Spinner, Modal, Input } from '@/components/ui'

const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'] as const
type Dia = typeof DIAS_SEMANA[number]
type Secao = 'prato' | 'guarnicao' | 'outros'

const SECAO_META: Record<Secao, { label: string; color: string }> = {
  prato:     { label: 'Prato',      color: 'text-[#00e87a]' },
  guarnicao: { label: 'Guarnição',  color: 'text-[#4da6ff]' },
  outros:    { label: 'Outros',     color: 'text-[#7a96b8]' },
}

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

function GradeEditor({ grade, onSave, onCancel, restId }: {
  grade: any; onSave: () => void; onCancel: () => void; restId: string
}) {
  const { call } = useApi()
  const toast = useToast()
  const [nome, setNome] = useState(grade?.nome ?? '')
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
    if (!nome.trim()) { toast('Nome da grade é obrigatório.', 'error'); return }
    setSaving(true)
    const res = await call('/api/grades', {
      method: 'POST',
      body: JSON.stringify({ id: grade?.id, nome, dias, restauranteId: restId }),
    })
    setSaving(false)
    if (res.success) { toast('Grade salva!'); onSave() }
    else toast(res.error, 'error')
  }

  const diaCompleto = (d: Dia) => {
    const dd = dias[d]
    return dd && (dd.prato?.length > 0 || dd.guarnicao?.length > 0)
  }

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onCancel} className="text-[#3d5875] hover:text-[#ddeaf8] transition-colors bg-none border-none cursor-pointer text-lg">←</button>
        <h2 className="text-base font-bold text-[#ddeaf8]">{grade?.id ? 'Editar grade' : 'Nova grade'}</h2>
      </div>

      <div className="mb-4">
        <Input label="Nome da grade" value={nome} onChange={e => setNome(e.target.value)} placeholder="Semana Padrão" />
      </div>

      {/* Day selector */}
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

      {/* Section editors */}
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

      <Btn onClick={save} loading={saving}>Salvar grade</Btn>
    </div>
  )
}

export default function GradesPane({ restId }: { restId: string }) {
  const { call } = useApi()
  const toast = useToast()
  const [grades, setGrades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any>(null)
  const [publishModal, setPublishModal] = useState<any>(null)
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [acting, setActing] = useState('')

  async function load() {
    const res = await call<any[]>(`/api/grades?restauranteId=${restId}`)
    if (res.success) setGrades(res.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [restId])

  async function publicar() {
    if (!publishModal) return
    setActing('pub')
    const res = await call(`/api/grades/${publishModal.id}/publicar`, {
      method: 'PATCH',
      body: JSON.stringify({ dataInicio, dataFim }),
    })
    setActing('')
    if (res.success) { toast('Grade publicada!'); setPublishModal(null); load() }
    else toast(res.error, 'error')
  }

  async function despublicar(id: string) {
    setActing(id)
    const res = await call(`/api/grades/${id}/despublicar`, { method: 'PATCH', body: '{}' })
    setActing('')
    if (res.success) { toast('Grade despublicada.'); load() }
    else toast(res.error, 'error')
  }

  async function remover(id: string) {
    if (!confirm('Remover esta grade?')) return
    setActing(id)
    await call(`/api/grades/${id}`, { method: 'DELETE' })
    setActing('')
    toast('Grade removida.')
    load()
  }

  if (editing !== undefined && editing !== null) {
    return <GradeEditor grade={editing === 'new' ? null : editing} restId={restId}
      onSave={() => { setEditing(null); load() }} onCancel={() => setEditing(null)} />
  }

  if (loading) return <Spinner />

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <SectionLabel>Grades de cardápio</SectionLabel>
        <Btn size="sm" className="w-auto" onClick={() => setEditing('new')}>+ Nova</Btn>
      </div>

      {grades.length === 0 && (
        <Card>
          <p className="text-center font-[var(--mono)] text-xs text-[#3d5875] py-4">
            Nenhuma grade. Crie uma para começar.
          </p>
        </Card>
      )}

      {grades.map(g => (
        <Card key={g.id} highlight={g.status === 'publicada'}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="font-bold text-sm text-[#ddeaf8]">{g.nome}</p>
              {g.data_inicio && (
                <p className="font-[var(--mono)] text-[10px] text-[#3d5875] mt-0.5">
                  {g.data_inicio} → {g.data_fim ?? '—'}
                </p>
              )}
            </div>
            <Badge color={g.status === 'publicada' ? 'green' : 'gray'}>
              {g.status === 'publicada' ? 'Publicada' : 'Rascunho'}
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

      <Modal open={!!publishModal} onClose={() => setPublishModal(null)} title={`Publicar: ${publishModal?.nome}`}>
        <div className="flex flex-col gap-4">
          <p className="font-[var(--mono)] text-xs text-[#3d5875]">Defina o período em que o cardápio ficará visível.</p>
          <Input label="Data início (DD/MM/AAAA)" value={dataInicio} onChange={e => setDataInicio(e.target.value)} placeholder="01/07/2025" />
          <Input label="Data fim (DD/MM/AAAA)" value={dataFim} onChange={e => setDataFim(e.target.value)} placeholder="05/07/2025" />
          <Btn loading={acting === 'pub'} onClick={publicar}>Publicar grade</Btn>
        </div>
      </Modal>
    </div>
  )
}
