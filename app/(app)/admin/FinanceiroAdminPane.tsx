'use client'
import { useEffect, useState } from 'react'
import { useApi } from '@/lib/use-api'
import { Spinner, SectionLabel } from '@/components/ui'

const BRL  = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const DATA  = (s: string) => new Date(s + 'T12:00:00').toLocaleDateString('pt-BR')

const TIPO_LABEL: Record<string, string> = {
  pix_mensal:    'Pix Mensal',
  pix_anual:     'Pix Anual',
  cartao_mensal: 'Cartão',
}

interface Resumo {
  receitaMes:         number
  receitaTotal:       number
  numVencendoEmBreve: number
  numVencidos:        number
  numPendentes:       number
  numPagosMes:        number
}

interface PagItem {
  id:            string
  nomeRest:      string
  valor:         number
  tipo:          string
  vencimento:    string
  diasRestantes?: number
  diasAtraso?:   number
  status:        string
}

export default function FinanceiroAdminPane() {
  const { call }   = useApi()
  const [loading,  setLoading]  = useState(true)
  const [resumo,   setResumo]   = useState<Resumo | null>(null)
  const [vencendo, setVencendo] = useState<PagItem[]>([])
  const [vencidos, setVencidos] = useState<PagItem[]>([])
  const [pendentes,setPendentes]= useState<PagItem[]>([])
  const [pagosMes, setPagosMes] = useState<PagItem[]>([])

  useEffect(() => {
    call<any>('/api/admin/financeiro').then(r => {
      if (r.success) {
        setResumo(r.data.resumo)
        setVencendo(r.data.vencendoEmBreve ?? [])
        setVencidos(r.data.vencidos ?? [])
        setPendentes(r.data.pendentes ?? [])
        setPagosMes(r.data.pagosMes ?? [])
      }
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>
  if (!resumo) return <p className="font-[var(--mono)] text-xs text-[#3d5875] text-center py-8">Erro ao carregar.</p>

  return (
    <div className="px-4 pt-4 pb-24 flex flex-col gap-4">

      {/* ── Resumo ── */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Receita do mês',  value: BRL(resumo.receitaMes),   color: 'text-[#00e87a]', small: true },
          { label: 'Receita total',   value: BRL(resumo.receitaTotal),  color: 'text-[#4da6ff]', small: true },
          { label: 'Pagos no mês',    value: resumo.numPagosMes,        color: 'text-[#00e87a]' },
          { label: 'Pendentes',       value: resumo.numPendentes,       color: 'text-[#7a96b8]' },
          { label: 'Vence em 5 dias', value: resumo.numVencendoEmBreve, color: 'text-[#ffb340]' },
          { label: 'Vencidos',        value: resumo.numVencidos,        color: 'text-[#ff4d6a]' },
        ].map(s => (
          <div key={s.label} className="bg-[#0d1525] border border-[#1c2e48] rounded-[11px] p-3 text-center">
            <div className={`font-black font-[var(--mono)] ${s.color} ${s.small ? 'text-lg' : 'text-2xl'}`}>
              {s.value}
            </div>
            <div className="font-[var(--mono)] text-[9px] tracking-[1px] text-[#3d5875] uppercase mt-0.5">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Vencendo em breve ── */}
      {vencendo.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionLabel>⚠️ Vence em até 5 dias</SectionLabel>
          {vencendo.map(p => (
            <PagCard key={p.id} p={p} corBadge="yellow"
              sub={p.diasRestantes === 0 ? 'Vence hoje!' : `${p.diasRestantes} dia${p.diasRestantes !== 1 ? 's' : ''} restantes`} />
          ))}
        </div>
      )}

      {/* ── Vencidos ── */}
      {vencidos.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionLabel>🔴 Vencidos</SectionLabel>
          {vencidos.map(p => (
            <PagCard key={p.id} p={p} corBadge="red"
              sub={`${p.diasAtraso} dia${p.diasAtraso !== 1 ? 's' : ''} em atraso`} />
          ))}
        </div>
      )}

      {/* ── Pagos no mês ── */}
      {pagosMes.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionLabel>✅ Pagos no mês</SectionLabel>
          {pagosMes.map(p => (
            <PagCard key={p.id} p={p} corBadge="green" sub={`Pago em ${DATA(p.vencimento)}`} />
          ))}
        </div>
      )}

      {/* ── Pendentes ── */}
      {pendentes.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionLabel>🕐 Pendentes</SectionLabel>
          {pendentes.map(p => (
            <PagCard key={p.id} p={p} corBadge="gray"
              sub={`Vence em ${DATA(p.vencimento)} · ${p.diasRestantes} dias`} />
          ))}
        </div>
      )}

      {vencendo.length === 0 && vencidos.length === 0 && pagosMes.length === 0 && pendentes.length === 0 && (
        <p className="font-[var(--mono)] text-xs text-[#3d5875] text-center py-8">
          Nenhum pagamento registrado ainda.
        </p>
      )}
    </div>
  )
}

const COR_MAP: Record<string, string> = {
  green:  'text-[#00e87a] border-[rgba(0,232,122,.2)] bg-[rgba(0,232,122,.06)]',
  yellow: 'text-[#ffb340] border-[rgba(255,179,64,.2)] bg-[rgba(255,179,64,.06)]',
  red:    'text-[#ff4d6a] border-[rgba(255,77,106,.2)] bg-[rgba(255,77,106,.06)]',
  gray:   'text-[#7a96b8] border-[#1c2e48] bg-transparent',
}

function PagCard({ p, sub, corBadge }: { p: PagItem; sub: string; corBadge: string }) {
  return (
    <div className="bg-[#0d1525] border border-[#1c2e48] rounded-[11px] px-3 py-2.5 flex items-center justify-between gap-2">
      <div>
        <p className="text-sm text-[#ddeaf8] font-medium">{p.nomeRest}</p>
        <p className="font-[var(--mono)] text-[10px] text-[#3d5875] mt-0.5">
          {TIPO_LABEL[p.tipo] ?? p.tipo} · {sub}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="font-[var(--mono)] text-sm font-bold text-[#ddeaf8]">{BRL(Number(p.valor))}</span>
        <span className={`font-[var(--mono)] text-[9px] border rounded-full px-2 py-0.5 ${COR_MAP[corBadge]}`}>
          {corBadge === 'green' ? 'Pago' : corBadge === 'yellow' ? 'Atenção' : corBadge === 'red' ? 'Vencido' : 'Pendente'}
        </span>
      </div>
    </div>
  )
}
