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
  const [obs,       setObs]       = useState<string>(existingPedido?.obs ?? '')

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
        obs,
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
          <div className="flex flex-col gap-1.5">
            <label className="font-[var(--mono)] text-[10px] tracking-[1.5px] text-[#3d5875] uppercase">Observação (opcional)</label>
            <textarea
              value={obs}
              onChange={e => setObs(e.target.value)}
              placeholder="Ex: sem cebola, alergia a glúten..."
              rows={2}
              className="w-full bg-[#080c14] border border-[#253d5e] rounded-[11px] px-3 py-2.5 font-[var(--mono)] text-sm text-[#ddeaf8] outline-none focus:border-[rgba(0,232,122,.5)] placeholder:text-[#3d5875] resize-none"
            />
          </div>
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



/* ── Cardápio do dia (fixo no topo) ─────────────────────── */
function CardapioDoDia({ dia }: { dia: any }) {
  const pratos     = dia.pratos     ?? []
  const guarnicoes = dia.guarnicoes ?? []
  const outros     = dia.outros     ?? []

  if (!pratos.length && !guarnicoes.length && !outros.length) return null

  const SECOES = [
    { label: 'Pratos',    items: pratos,     cor: 'text-[#ddeaf8]' },
    { label: 'Guarnição', items: guarnicoes, cor: 'text-[#7a96b8]' },
    { label: 'Outros',    items: outros,     cor: 'text-[#7a96b8]' },
  ]

  return (
    <div className="bg-[#080c14] border border-[#1c2e48] rounded-[12px] p-3 mb-3">
      <p className="font-[var(--mono)] text-[9px] tracking-[2px] text-[#3d5875] uppercase mb-2">
        Cardápio do dia
      </p>
      <div className="flex flex-col gap-2">
        {SECOES.map(s => s.items.length > 0 && (
          <div key={s.label}>
            <p className="font-[var(--mono)] text-[9px] text-[#3d5875] uppercase tracking-[1px] mb-1">{s.label}</p>
            {s.items.map((item: any) => (
              <p key={item.nome} className={`font-[var(--mono)] text-xs ${s.cor}`}>• {item.nome}</p>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── AvulsosCheckbox — avulsos disponíveis para adicionar ── */
function AvulsosCheckbox({ produtosEmpresa, avulsosSel, setAvulsosSel, avulsosObs, setAvulsosObs }: {
  produtosEmpresa: any[]
  avulsosSel:    Set<string>
  setAvulsosSel: (s: Set<string>) => void
  avulsosObs:    Record<string, string>
  setAvulsosObs: (o: Record<string, string>) => void
}) {
  const avulsos = produtosEmpresa.filter(ep => ep.produto.tipo === 'avulso')
  if (!avulsos.length) return null

  function toggle(id: string) {
    const next = new Set(avulsosSel)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setAvulsosSel(next)
  }

  return (
    <div className="border-t border-[#1c2e48] pt-3 mt-1 flex flex-col gap-2">
      <p className="font-[var(--mono)] text-[9px] tracking-[2px] text-[#3d5875] uppercase">
        Itens adicionais
      </p>
      {avulsos.map(ep => {
        const sel = avulsosSel.has(ep.produto.id)
        return (
          <div key={ep.id}
            className={`rounded-[10px] border px-3 py-2 transition-all
              ${sel ? 'border-[rgba(0,232,122,.3)] bg-[rgba(0,232,122,.04)]' : 'border-[#1c2e48] bg-[#0d1525]'}`}>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggle(ep.produto.id)}>
              <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center flex-shrink-0 transition-all
                ${sel ? 'bg-[#00e87a] border-[#00e87a]' : 'border-[#2a4060]'}`}>
                {sel && <span className="text-black text-[10px] font-bold">✓</span>}
              </div>
              <span className="text-sm text-[#ddeaf8]">{ep.produto.nome}</span>
              {ep.produto.descricao && (
                <span className="font-[var(--mono)] text-[10px] text-[#3d5875]">— {ep.produto.descricao}</span>
              )}
            </div>
            {sel && (
              <textarea
                value={avulsosObs[ep.produto.id] ?? ''}
                onChange={e => setAvulsosObs({ ...avulsosObs, [ep.produto.id]: e.target.value })}
                placeholder="Observação (opcional)"
                rows={1}
                className="mt-2 ml-6 w-[calc(100%-1.5rem)] bg-[#080c14] border border-[#253d5e] rounded-[8px] px-2.5 py-1.5 font-[var(--mono)] text-xs text-[#ddeaf8] outline-none placeholder:text-[#3d5875] resize-none"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Avulso form ─────────────────────────────────────────── */
function AvulsoForm({ dia, colabId, empId, produto, onSaved, onCancel }: {
  dia: any; colabId: string; empId: string
  produto: any; onSaved: () => void; onCancel: () => void
}) {
  const { call } = useApi()
  const toast    = useToast()
  const [qtd,     setQtd]     = useState(1)
  const [obs,     setObs]     = useState('')
  const [saving,  setSaving]  = useState(false)

  const parts   = dia.data.split('/')
  const isPast  = isPassado(dia.data)

  async function salvar() {
    setSaving(true)
    const itens = [`${qtd}x ${produto.produto.nome}`]
    const res = await call('/api/pedidos', {
      method: 'POST',
      body: JSON.stringify({
        colaboradorId: colabId,
        empresaId:     empId,
        data:          `${parts[2]}-${parts[1]}-${parts[0]}`,
        itens,
        obs,
        produto_id:    produto.produto.id,
      }),
    })
    setSaving(false)
    if (res.success) { toast('Reserva enviada!'); onSaved() }
    else toast(res.error ?? 'Erro ao reservar.', 'error')
  }

  const preco = (produto.preco ?? produto.produto.preco_base) ?? 0
  const total = preco * qtd

  return (
    <div className="flex flex-col gap-4">
      {isPast && (
        <p className="font-[var(--mono)] text-xs text-[#7a96b8]">📅 Consulta apenas.</p>
      )}

      {!isPast && (
        <>
          {/* Produto info */}
          <div className="bg-[#0d1525] border border-[#1c2e48] rounded-[11px] px-3 py-2.5">
            <p className="text-sm font-medium text-[#ddeaf8]">{produto.produto.nome}</p>
            {produto.produto.descricao && (
              <p className="font-[var(--mono)] text-[10px] text-[#3d5875] mt-0.5">{produto.produto.descricao}</p>
            )}
          </div>

          {/* Quantidade */}
          <div className="flex items-center justify-between bg-[#0d1525] border border-[#1c2e48] rounded-[11px] px-3 py-2.5">
            <span className="font-[var(--mono)] text-[10px] text-[#3d5875] uppercase tracking-[1px]">Quantidade</span>
            <div className="flex items-center gap-3">
              <button onClick={() => setQtd(q => Math.max(1, q - 1))}
                className="w-7 h-7 rounded-full border border-[#253d5e] text-[#ddeaf8] font-bold bg-transparent cursor-pointer hover:border-[#00e87a] hover:text-[#00e87a] transition-colors flex items-center justify-center">
                −
              </button>
              <span className="font-[var(--mono)] text-lg font-black text-[#00e87a] w-5 text-center">{qtd}</span>
              <button onClick={() => setQtd(q => Math.min(20, q + 1))}
                className="w-7 h-7 rounded-full border border-[#253d5e] text-[#ddeaf8] font-bold bg-transparent cursor-pointer hover:border-[#00e87a] hover:text-[#00e87a] transition-colors flex items-center justify-center">
                +
              </button>
            </div>
          </div>

          {/* Total */}
          {preco > 0 && (
            <div className="flex items-center justify-between px-1">
              <span className="font-[var(--mono)] text-[10px] text-[#3d5875]">Total estimado</span>
              <span className="font-[var(--mono)] text-sm font-bold text-[#00e87a]">
                {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          )}

          {/* Observação */}
          <div className="flex flex-col gap-1.5">
            <label className="font-[var(--mono)] text-[10px] tracking-[1.5px] text-[#3d5875] uppercase">
              Observação (opcional)
            </label>
            <textarea value={obs} onChange={e => setObs(e.target.value)}
              placeholder="Alguma observação sobre este pedido..."
              rows={2}
              className="w-full bg-[#080c14] border border-[#253d5e] rounded-[11px] px-3 py-2.5 font-[var(--mono)] text-sm text-[#ddeaf8] outline-none focus:border-[rgba(0,232,122,.5)] placeholder:text-[#3d5875] resize-none" />
          </div>

          <div className="flex gap-2">
            <Btn variant="secondary" onClick={onCancel} className="flex-1">Cancelar</Btn>
            <Btn onClick={salvar} loading={saving} className="flex-1">Confirmar reserva</Btn>
          </div>
        </>
      )}
    </div>
  )
}

/* ── Marmita form (formulário de novo pedido) ───────────── */
function NovoPedidoForm({ dia, colabId, empId, empConfig, produtoId, onSaved, onCancel }: {
  dia: any; colabId: string; empId: string; empConfig: any; produtoId?: string; onSaved: () => void; onCancel: () => void
}) {
  const { call } = useApi()
  const toast    = useToast()

  const allItems = [
    ...(dia.pratos     ?? []).map((p: any) => ({ nome: p.nome, tipo: 'prato'     })),
    ...(dia.guarnicoes ?? []).map((g: any) => ({ nome: g.nome, tipo: 'guarnicao' })),
    ...(dia.outros     ?? []).map((o: any) => ({ nome: o.nome, tipo: 'outro'     })),
  ]

  const [selected, setSelected] = useState<ItemSel[]>([])
  const [obs,      setObs]      = useState('')
  const [saving,   setSaving]   = useState(false)

  const parts = dia.data.split('/')

  function isItemSelected(nome: string) { return selected.some(s => s.nome === nome) }
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
      ? { ...i, ajuste: i.ajuste === ajuste ? 'normal' : ajuste } : i
    ))
  }
  function pedidoCompleto() {
    setSelected(allItems.map(i => ({ nome: i.nome, ajuste: 'normal' as const })))
  }

  async function salvar() {
    if (selected.length === 0) { toast('Selecione ao menos um item.', 'error'); return }
    setSaving(true)
    const todosItens = allItems.map(i => i.nome)
    const isCompleto = todosItens.length > 0 &&
      selected.length === todosItens.length &&
      todosItens.every(nome => selected.some(s => s.nome === nome && s.ajuste === 'normal'))
    const itens = isCompleto
      ? ['Refeição completa']
      : selected.map(s => s.ajuste === 'normal' ? s.nome : `${s.nome} [${s.ajuste}]`)
    const res = await call('/api/pedidos', {
      method: 'POST',
      body: JSON.stringify({ colaboradorId: colabId, empresaId: empId,
        data: `${parts[2]}-${parts[1]}-${parts[0]}`, itens, obs }),
    })
    setSaving(false)
    if (res.success) { toast('Pedido enviado!'); onSaved() }
    else toast(res.error ?? 'Erro ao salvar pedido.', 'error')
  }

  const SECOES = [
    { label: '🍽️ Pratos',     items: dia.pratos     ?? [] },
    { label: '🥗 Guarnição',  items: dia.guarnicoes ?? [] },
    { label: '➕ Outros',     items: dia.outros     ?? [] },
  ]

  return (
    <div className="flex flex-col gap-3 mt-3 border-t border-[#1c2e48] pt-3">
      {/* Botão refeição completa */}
      <button
        onClick={pedidoCompleto}
        className="w-full py-2 rounded-[10px] border border-[rgba(0,232,122,.25)] bg-[rgba(0,232,122,.04)] font-[var(--mono)] text-[11px] text-[#00e87a] cursor-pointer hover:bg-[rgba(0,232,122,.08)] transition-colors">
        ✅ Selecionar refeição completa
      </button>

      {SECOES.map(sec => sec.items.length > 0 && (
        <div key={sec.label}>
          <p className="font-[var(--mono)] text-[10px] text-[#3d5875] uppercase tracking-[1px] mb-1.5">{sec.label}</p>
          <div className="flex flex-col gap-1.5">
            {sec.items.map((item: any) => {
              const sel = isItemSelected(item.nome)
              const aj  = getAjuste(item.nome)
              return (
                <div key={item.nome} className={`rounded-[10px] border px-3 py-2 transition-all
                  ${sel ? 'border-[rgba(0,232,122,.4)] bg-[rgba(0,232,122,.05)]' : 'border-[#1c2e48] bg-[#0d1525]'}`}>
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleItem(item.nome)}>
                    <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center flex-shrink-0 transition-all
                      ${sel ? 'bg-[#00e87a] border-[#00e87a]' : 'border-[#2a4060]'}`}>
                      {sel && <span className="text-black text-[10px] font-bold">✓</span>}
                    </div>
                    <span className="text-sm text-[#ddeaf8]">{item.nome}</span>
                  </div>
                  {sel && (
                    <div className="flex gap-2 mt-2 ml-6">
                      {(['extra','reduzido'] as const).map(a => (
                        <button key={a} onClick={() => toggleAjuste(item.nome, a)}
                          className={`font-[var(--mono)] text-[9px] px-2 py-1 rounded-full border transition-all cursor-pointer
                            ${aj === a ? 'border-[#ffb340] bg-[rgba(255,179,64,.15)] text-[#ffb340]' : 'border-[#1c2e48] text-[#3d5875] bg-transparent'}`}>
                          {a}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Observação */}
      <div className="flex flex-col gap-1.5">
        <label className="font-[var(--mono)] text-[10px] tracking-[1.5px] text-[#3d5875] uppercase">Observação (opcional)</label>
        <textarea value={obs} onChange={e => setObs(e.target.value)}
          placeholder="Ex: sem pimenta, sem cebola..." rows={2}
          className="w-full bg-[#080c14] border border-[#253d5e] rounded-[11px] px-3 py-2.5 font-[var(--mono)] text-sm text-[#ddeaf8] outline-none focus:border-[rgba(0,232,122,.5)] placeholder:text-[#3d5875] resize-none" />
      </div>

      <div className="flex gap-2">
        <Btn variant="secondary" onClick={onCancel} className="flex-1">Cancelar</Btn>
        <Btn onClick={salvar} loading={saving} className="flex-1">Enviar pedido</Btn>
      </div>
    </div>
  )
}

/* ── Pedido item (consulta/edição) ───────────────────────── */
function PedidoItem({ pedido, podeCancelar, podeCancelarFuturo, onSaved }: {
  pedido: any; podeCancelar: boolean; podeCancelarFuturo: boolean; onSaved: () => void
}) {
  const { call } = useApi()
  const toast    = useToast()
  const [expanded,  setExpanded]  = useState(false)
  const [canceling, setCanceling] = useState(false)

  async function cancelar() {
    if (!confirm('Cancelar este pedido?')) return
    setCanceling(true)
    const res = await call(`/api/pedidos/${pedido.id}`, { method: 'DELETE' })
    setCanceling(false)
    if (res.success) { toast('Pedido cancelado.'); onSaved() }
    else toast(res.error ?? 'Erro ao cancelar.', 'error')
  }

  const podeCanc = podeCancelar || podeCancelarFuturo

  return (
    <div className="bg-[#0d1525] border border-[#1c2e48] rounded-[11px] overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full px-3 py-2.5 flex items-center justify-between cursor-pointer bg-transparent border-none text-left">
        <div>
          <p className="text-sm text-[#ddeaf8] font-medium">
            {pedido.itens?.[0] === 'Refeição completa' ? '✅ Refeição completa' : pedido.itens?.join(', ').slice(0, 40) + (pedido.itens?.join(', ').length > 40 ? '...' : '')}
          </p>
          {pedido.obs && <p className="font-[var(--mono)] text-[10px] text-[#3d5875] mt-0.5">Obs: {pedido.obs}</p>}
        </div>
        <span className="text-[#3d5875] text-xs ml-2">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="border-t border-[#1c2e48] px-3 py-3 flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            {pedido.itens?.map((item: string, i: number) => (
              <p key={i} className="font-[var(--mono)] text-xs text-[#7a96b8]">• {item}</p>
            ))}
          </div>
          {pedido.obs && (
            <p className="font-[var(--mono)] text-[10px] text-[#3d5875]">Obs: {pedido.obs}</p>
          )}
          {podeCanc && (
            <Btn variant="danger" onClick={cancelar} loading={canceling}>
              ✕ Cancelar este pedido
            </Btn>
          )}
        </div>
      )}
    </div>
  )
}

/* ── OrderForm (orquestrador) ────────────────────────────── */
function OrderForm({ dia, colabId, empId, restId, onSaved }: {
  dia: any; colabId: string; empId: string; restId: string; onSaved: () => void
}) {
  const empConfig  = dia._empConfig
  const pedidos    = dia.pedidos ?? []
  const [fazendo, setFazendo] = useState(pedidos.length === 0)

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
    if (hoje >= cutoff) {
      if (empConfig?.extensao_ate) {
        if (hoje < new Date(empConfig.extensao_ate)) {
          motivoBloqueio = ''
        } else {
          bloqueado = true; motivoBloqueio = `Pedidos encerrados`
        }
      } else {
        bloqueado = true; motivoBloqueio = `Pedidos encerrados às ${empConfig.horario_limite}`
      }
    }
  }

  const podeCancelar = isToday && !bloqueado
  const podeCancelarFuturo = !isToday && !isPast

  const allItems = [
    ...(dia.pratos     ?? []).map((p: any) => ({ nome: p.nome })),
    ...(dia.guarnicoes ?? []).map((g: any) => ({ nome: g.nome })),
    ...(dia.outros     ?? []).map((o: any) => ({ nome: o.nome })),
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-[#ddeaf8]">
          {dow}, {String(date.getDate()).padStart(2,'0')} {MESES_PT[date.getMonth()]}
        </p>
        <span className={`font-[var(--mono)] text-[10px] px-2 py-1 rounded-full border
          ${pedidos.length > 0 ? 'text-[#00e87a] border-[rgba(0,232,122,.3)]' : 'text-[#3d5875] border-[#1c2e48]'}`}>
          {pedidos.length > 0 ? `${pedidos.length} pedido${pedidos.length > 1 ? 's' : ''}` : 'Sem pedido'}
        </span>
      </div>

      {isPast && (
        <div className="bg-[rgba(122,150,184,.07)] border border-[rgba(122,150,184,.2)] rounded-[11px] px-3 py-2 mb-3">
          <p className="font-[var(--mono)] text-xs text-[#7a96b8]">📅 Consulta apenas — dia anterior.</p>
        </div>
      )}

      {bloqueado && (
        <div className="bg-[rgba(255,179,64,.07)] border border-[rgba(255,179,64,.2)] rounded-[11px] px-3 py-2 mb-3">
          <p className="font-[var(--mono)] text-xs text-[#ffb340]">⏰ {motivoBloqueio}</p>
        </div>
      )}

      {allItems.length === 0 && (
        <p className="font-[var(--mono)] text-xs text-[#3d5875] py-4 text-center">Sem cardápio para este dia.</p>
      )}

      {/* Meus pedidos do dia */}
      {pedidos.length > 0 && (
        <div className="flex flex-col gap-2 mb-3">
          <p className="font-[var(--mono)] text-[10px] text-[#3d5875] uppercase tracking-[1px]">
            Meus pedidos do dia
          </p>
          {pedidos.map((p: any) => (
            <PedidoItem key={p.id} pedido={p}
              podeCancelar={podeCancelar}
              podeCancelarFuturo={podeCancelarFuturo}
              onSaved={onSaved} />
          ))}
        </div>
      )}

      {/* Botão novo pedido ou formulário */}
      {!isPast && !bloqueado && allItems.length > 0 && (
        <>
          {!fazendo ? (
            <Btn onClick={() => setFazendo(true)}>
              + Fazer novo pedido
            </Btn>
          ) : (
            <NovoPedidoForm
              dia={dia} colabId={colabId} empId={empId} empConfig={empConfig}
              produtoId={dia._produtoId}
              onSaved={() => { setFazendo(false); onSaved() }}
              onCancel={() => setFazendo(false)}
            />
          )}
        </>
      )}
    </div>
  )
}

/* ── Main pedidos page ───────────────────────────────────── */

function PedidosContent() {
  const { meta }  = useAuth()
  const { call }  = useApi()
  const [semana,       setSemana]       = useState<any[]>([])
  const [empConfig,      setEmpConfig]      = useState<any>(null)
  const [produtosEmpresa, setProdutosEmpresa] = useState<any[]>([])
  const [produtoAtual,    setProdutoAtual]    = useState<any | null>(null)
  const [avulsosSel,      setAvulsosSel]      = useState<Set<string>>(new Set())
  const [avulsosObs,      setAvulsosObs]      = useState<Record<string, string>>({})
  const [loading,      setLoading]      = useState(true)
  const [selectedDate, setSelectedDate] = useState('')

  const colabId = meta?.colaborador_id ?? ''
  const empId   = meta?.empresa_id     ?? ''

  async function load() {
    if (!empId) { setLoading(false); return }

    // Busca a empresa para obter o restaurante_id (colaborador não tem no metadata)
    const empRes = await call<any>(`/api/empresas/${empId}`)
    if (!empRes.success) { setLoading(false); return }
    const emp = Array.isArray(empRes.data) ? empRes.data[0] : empRes.data
    setEmpConfig(emp)

    // Busca produtos liberados para a empresa
    const prodRes = await call<any>(`/api/empresas/${empId}/produtos`)
    if (prodRes.success) setProdutosEmpresa(prodRes.data.filter((ep: any) => ep.ativo))

    const restId = meta?.restaurante_id ?? emp?.restaurante_id
    if (!restId) { setLoading(false); return }

    const res = await call<any[]>(`/api/cardapio/semana?restauranteId=${restId}`)
    if (res.success && res.data.length > 0) {
      const pedRes = await call<any[]>(`/api/pedidos?empresaId=${empId}&dataInicio=${res.data[0].data}&dataFim=${res.data[res.data.length-1].data}`)
      const pedMap: Record<string, any[]> = {}
      if (pedRes.success) {
        pedRes.data.forEach((p: any) => {
          const raw   = p.data_pedido ?? p.data ?? ''
          const parts = raw.split('-')
          const key   = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : raw
          if (!pedMap[key]) pedMap[key] = []
          pedMap[key].push(p)
        })
      }
      const merged = res.data.map(d => ({ ...d, pedidos: pedMap[d.data] ?? [], pedido: pedMap[d.data]?.[0] ?? null, _empConfig: emp }))
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
      <SectionLabel>Selecione o dia</SectionLabel>
      <DaySelector dias={semana} selected={selectedDate} onSelect={setSelectedDate} />
      {diaSelected && (
        <Card highlight={(diaSelected?.pedidos ?? []).length > 0}>
          <FacaSeuPedido
            key={selectedDate}
            dia={diaSelected}
            colabId={colabId}
            empId={empId}
            restId={meta?.restaurante_id ?? diaSelected?._empConfig?.restaurante_id ?? ''}
            produtosEmpresa={produtosEmpresa}
            onSaved={load}
          />
        </Card>
      )}
    </div>
  )
}


/* ── Faça seu pedido — área unificada ───────────────────── */
function FacaSeuPedido({ dia, colabId, empId, produtosEmpresa, onSaved }: {
  dia: any; colabId: string; empId: string
  produtosEmpresa: any[]; onSaved: () => void
}) {
  const { call } = useApi()
  const toast    = useToast()

  const parts   = (dia.data as string).split('/')
  const dataISO = `${parts[2]}-${parts[1]}-${parts[0]}`
  const isPast  = isPassado(dia.data)
  const pedidos: any[] = dia.pedidos ?? []

  const allCardapio: { nome: string; secao: string }[] = [
    ...(dia.pratos     ?? []).map((p: any) => ({ nome: p.nome, secao: 'prato'     })),
    ...(dia.guarnicoes ?? []).map((g: any) => ({ nome: g.nome, secao: 'guarnicao' })),
    ...(dia.outros     ?? []).map((o: any) => ({ nome: o.nome, secao: 'outro'     })),
  ]

  // sel: produtoId → { qtd, obs }
  const [sel,         setSel]         = useState<Record<string, { qtd: number; obs: string }>>({})
  const [saving,      setSaving]      = useState(false)
  const [fazendo,     setFazendo]     = useState(pedidos.length === 0)
  const [cancelando,  setCancelando]  = useState('')

  // Horário limite (só bloqueia hoje)
  const empConfig = dia._empConfig
  const hoje = new Date()
  const diaDate = new Date(+parts[2], +parts[1] - 1, +parts[0])
  const isHoje  = diaDate.toDateString() === hoje.toDateString()

  let bloqueado = false
  if (isHoje && empConfig?.horario_limite) {
    const [h, m] = (empConfig.horario_limite as string).split(':').map(Number)
    const cutoff = new Date(); cutoff.setHours(h, m, 0, 0)
    if (hoje >= cutoff) {
      if (empConfig?.extensao_ate) {
        if (hoje >= new Date(empConfig.extensao_ate)) bloqueado = true
      } else {
        bloqueado = true
      }
    }
  }
  const podeCancelar = !isPast && !bloqueado

  function toggle(prodId: string) {
    setSel(s => {
      const n = { ...s }
      if (n[prodId]) delete n[prodId]
      else n[prodId] = { qtd: 1, obs: '' }
      return n
    })
  }

  function setQtd(prodId: string, qtd: number) {
    setSel(s => ({ ...s, [prodId]: { ...s[prodId], qtd: Math.max(1, Math.min(20, qtd)) } }))
  }

  function setObs(prodId: string, obs: string) {
    setSel(s => ({ ...s, [prodId]: { ...s[prodId], obs } }))
  }

  async function enviar() {
    const itens = Object.keys(sel)
    if (!itens.length) { toast('Selecione ao menos um produto.', 'error'); return }
    setSaving(true)

    const promises = itens.map(prodId => {
      const { qtd, obs } = sel[prodId]
      const nome = produtosEmpresa.find((ep: any) => ep.produto.id === prodId)?.produto.nome ?? prodId
      return call('/api/pedidos', {
        method: 'POST',
        body: JSON.stringify({
          colaboradorId: colabId,
          empresaId:     empId,
          data:          dataISO,
          itens:         qtd > 1 ? [`${qtd}x ${nome}`] : [nome],
          obs,
          produto_id:    prodId,
        }),
      })
    })

    const results = await Promise.all(promises)
    setSaving(false)

    if (results.every((r: any) => r.success)) {
      toast('Pedido enviado!')
      setSel({}); setFazendo(false); onSaved()
    } else {
      const erros = results.filter((r: any) => !r.success)
      toast(erros[0]?.error ?? 'Erro ao salvar pedido.', 'error')
    }
  }

  async function cancelarPedido(id: string) {
    if (!confirm('Cancelar este pedido?')) return
    setCancelando(id)
    const r = await call(`/api/pedidos/${id}`, { method: 'DELETE' })
    setCancelando('')
    if (r.success) { toast('Pedido cancelado.'); onSaved() }
    else toast((r as any).error ?? 'Erro ao cancelar.', 'error')
  }

  const SECAO_LABEL: Record<string, string> = { prato: 'Pratos', guarnicao: 'Guarnição', outro: 'Outros' }

  return (
    <div className="flex flex-col gap-3">

      {/* Cardápio do dia — fixo, só consulta */}
      {allCardapio.length > 0 && (
        <div className="bg-[#080c14] border border-[#1c2e48] rounded-[11px] p-3">
          <p className="font-[var(--mono)] text-[9px] tracking-[2px] text-[#3d5875] uppercase mb-2">
            Cardápio do dia
          </p>
          {(['prato','guarnicao','outro'] as const).map(sec => {
            const items = allCardapio.filter(i => i.secao === sec)
            if (!items.length) return null
            return (
              <div key={sec} className="mb-1.5">
                <p className="font-[var(--mono)] text-[9px] text-[#3d5875] uppercase">{SECAO_LABEL[sec]}</p>
                {items.map(i => (
                  <p key={i.nome} className="font-[var(--mono)] text-xs text-[#7a96b8]">• {i.nome}</p>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* Pedidos do dia */}
      {pedidos.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-[var(--mono)] text-[9px] tracking-[2px] text-[#3d5875] uppercase">
            Meus pedidos do dia
          </p>
          {pedidos.map((p: any) => (
            <div key={p.id}
              className="bg-[#0d1525] border border-[#1c2e48] rounded-[10px] px-3 py-2.5 flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-[#ddeaf8]">
                  {(p.pedido_itens?.map((i: any) => i.item) ?? p.itens ?? []).join(', ')}
                </p>
                {p.obs && (
                  <p className="font-[var(--mono)] text-[10px] text-[#3d5875]">Obs: {p.obs}</p>
                )}
              </div>
              {podeCancelar && (
                <button onClick={() => cancelarPedido(p.id)} disabled={cancelando === p.id}
                  className="font-[var(--mono)] text-[9px] text-[#ff4d6a] border border-[rgba(255,77,106,.2)] rounded-[5px] px-2 py-1 cursor-pointer bg-transparent hover:bg-[rgba(255,77,106,.08)]">
                  {cancelando === p.id ? '...' : '✕'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {isPast && (
        <p className="font-[var(--mono)] text-xs text-[#7a96b8] text-center py-2">
          📅 Dia anterior — apenas consulta.
        </p>
      )}
      {bloqueado && (
        <p className="font-[var(--mono)] text-xs text-[#ffb340] text-center py-2">
          ⏰ Pedidos encerrados.
        </p>
      )}

      {!isPast && !bloqueado && !fazendo && (
        <Btn onClick={() => setFazendo(true)}>+ Fazer novo pedido</Btn>
      )}

      {/* Formulário unificado */}
      {fazendo && !isPast && !bloqueado && (
        <div className="flex flex-col gap-3 border-t border-[#1c2e48] pt-3">
          <p className="font-semibold text-[#ddeaf8] text-sm">Faça seu pedido</p>

          {produtosEmpresa.length === 0 && (
            <p className="font-[var(--mono)] text-xs text-[#3d5875] text-center py-4">
              Nenhum produto disponível para esta empresa.
            </p>
          )}

          {produtosEmpresa.map((ep: any) => {
            const prodId = ep.produto.id
            const ativo  = !!sel[prodId]
            return (
              <div key={prodId}
                className={`rounded-[11px] border px-3 py-2.5 transition-all
                  ${ativo ? 'border-[rgba(0,232,122,.3)] bg-[rgba(0,232,122,.04)]' : 'border-[#1c2e48] bg-[#0d1525]'}`}>

                {/* Checkbox + nome */}
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggle(prodId)}>
                  <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center flex-shrink-0 transition-all
                    ${ativo ? 'bg-[#00e87a] border-[#00e87a]' : 'border-[#2a4060]'}`}>
                    {ativo && <span className="text-black text-[10px] font-bold">✓</span>}
                  </div>
                  <div>
                    <span className="text-sm text-[#ddeaf8] font-medium">{ep.produto.nome}</span>
                    {ep.produto.descricao && (
                      <span className="font-[var(--mono)] text-[10px] text-[#3d5875] ml-1.5">
                        — {ep.produto.descricao}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quantidade + observação */}
                {ativo && (
                  <div className="ml-6 mt-2 flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-[var(--mono)] text-[9px] text-[#3d5875] uppercase">Qtd</span>
                      <button
                        onClick={() => setQtd(prodId, sel[prodId].qtd - 1)}
                        className="w-6 h-6 rounded-full border border-[#253d5e] text-[#ddeaf8] bg-transparent cursor-pointer hover:border-[#00e87a] hover:text-[#00e87a] flex items-center justify-center text-sm">
                        −
                      </button>
                      <span className="font-[var(--mono)] text-sm font-bold text-[#00e87a] w-4 text-center">
                        {sel[prodId].qtd}
                      </span>
                      <button
                        onClick={() => setQtd(prodId, sel[prodId].qtd + 1)}
                        className="w-6 h-6 rounded-full border border-[#253d5e] text-[#ddeaf8] bg-transparent cursor-pointer hover:border-[#00e87a] hover:text-[#00e87a] flex items-center justify-center text-sm">
                        +
                      </button>
                    </div>
                    <textarea
                      value={sel[prodId].obs}
                      onChange={e => setObs(prodId, e.target.value)}
                      placeholder="Observação (opcional)"
                      rows={1}
                      className="w-full bg-[#080c14] border border-[#253d5e] rounded-[8px] px-2.5 py-1.5 font-[var(--mono)] text-xs text-[#ddeaf8] outline-none placeholder:text-[#3d5875] resize-none" />
                  </div>
                )}
              </div>
            )
          })}

          <div className="flex gap-2">
            <Btn variant="secondary"
              onClick={() => { setFazendo(false); setSel({}) }}
              className="flex-1">
              Cancelar
            </Btn>
            <Btn onClick={enviar} loading={saving} className="flex-1">
              Enviar pedido
            </Btn>
          </div>
        </div>
      )}
    </div>
  )
}


export default PedidosContent
