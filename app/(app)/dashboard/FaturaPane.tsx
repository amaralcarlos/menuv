'use client'
import { useEffect, useState } from 'react'
import { useApi } from '@/lib/use-api'
import { Spinner, Badge } from '@/components/ui'

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const STATUS_LABEL: Record<string, string> = {
  trial:     'Trial',
  conversao: 'Aguardando conversão',
  ativo:     'Ativo',
  bloqueado: 'Bloqueado',
  gratuito:  'Gratuito',
}
const STATUS_COR: Record<string, any> = {
  trial:     'yellow',
  conversao: 'yellow',
  ativo:     'green',
  bloqueado: 'red',
  gratuito:  'green',
}

interface Fatura {
  mensalidadeBase:        number
  numEmpresasAtivas:      number
  numEmpresasTrial:       number
  numEmpresasConversao:   number
  numEmpresasBloqueadas:  number
  cashbackPorEmpresa:     number
  cashbackTotal:          number
  totalAPagar:            number
  comissionamentoAtivo:   boolean
}

interface EmpresaItem {
  id: string
  nome: string
  status_plano: string
  diasRestantesTrial:     number
  diasRestantesConversao: number
  diasDecorridos:         number
}

export default function FaturaPane({ restId }: { restId: string }) {
  const { call }   = useApi()
  const [loading,   setLoading]   = useState(true)
  const [fatura,    setFatura]    = useState<Fatura | null>(null)
  const [empresas,  setEmpresas]  = useState<EmpresaItem[]>([])

  useEffect(() => {
    call<any>(`/api/restaurante/fatura`).then(r => {
      if (r.success) {
        setFatura(r.data.fatura)
        setEmpresas(r.data.empresas ?? [])
      }
      setLoading(false)
    })
  }, [restId])

  if (loading) return <Spinner />
  if (!fatura) return (
    <p className="font-[var(--mono)] text-xs text-[#3d5875] text-center py-8">
      Não foi possível carregar a fatura.
    </p>
  )

  const cashbackEmpresas = Math.min(fatura.numEmpresasAtivas, 10)
  const podeGanharMais   = fatura.comissionamentoAtivo && fatura.numEmpresasAtivas < 10

  return (
    <div className="px-4 pt-4 pb-24 flex flex-col gap-4">

      {/* ── Resumo da fatura ── */}
      <div className="rounded-[14px] border border-[rgba(0,232,122,.25)] bg-[rgba(0,232,122,.04)] p-4 flex flex-col gap-3">
        <p className="font-[var(--mono)] text-[10px] tracking-[2px] text-[#3d5875] uppercase">
          Fatura do mês
        </p>

        {/* Mensalidade base */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#7a96b8]">Mensalidade base</span>
          <span className="font-[var(--mono)] text-sm text-[#ddeaf8]">
            {BRL(fatura.mensalidadeBase)}
          </span>
        </div>

        {/* Cashback */}
        {fatura.comissionamentoAtivo ? (
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#7a96b8]">
              Cashback
              <span className="font-[var(--mono)] text-[10px] text-[#3d5875] ml-1">
                ({cashbackEmpresas} emp × {BRL(fatura.cashbackPorEmpresa)})
              </span>
            </span>
            <span className="font-[var(--mono)] text-sm text-[#00e87a]">
              −{BRL(fatura.cashbackTotal)}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#7a96b8]">Cashback</span>
            <span className="font-[var(--mono)] text-[10px] text-[#3d5875]">Desativado</span>
          </div>
        )}

        {/* Divisor */}
        <div className="border-t border-[rgba(0,232,122,.15)]" />

        {/* Total */}
        <div className="flex items-center justify-between">
          <span className="font-semibold text-[#ddeaf8]">Total a pagar</span>
          <span className="font-[var(--mono)] text-xl font-black text-[#00e87a]"
            style={{ textShadow: '0 0 16px rgba(0,232,122,.3)' }}>
            {BRL(fatura.totalAPagar)}
          </span>
        </div>

        {/* Dica de cashback */}
        {podeGanharMais && (
          <div className="rounded-[8px] bg-[rgba(0,232,122,.06)] border border-[rgba(0,232,122,.12)] px-3 py-2">
            <p className="font-[var(--mono)] text-[10px] text-[#00e87a] leading-relaxed">
              💡 Você pode trazer mais {10 - fatura.numEmpresasAtivas} empresa
              {10 - fatura.numEmpresasAtivas > 1 ? 's' : ''} e economizar
              {' '}{BRL((10 - fatura.numEmpresasAtivas) * fatura.cashbackPorEmpresa)}/mês
            </p>
          </div>
        )}

        {fatura.comissionamentoAtivo && fatura.numEmpresasAtivas >= 10 && (
          <div className="rounded-[8px] bg-[rgba(0,232,122,.06)] border border-[rgba(0,232,122,.12)] px-3 py-2">
            <p className="font-[var(--mono)] text-[10px] text-[#00e87a]">
              🎉 Cashback máximo atingido! Você paga apenas {BRL(49.90)}/mês.
            </p>
          </div>
        )}
      </div>

      {/* ── Resumo de empresas ── */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Ativas',     value: fatura.numEmpresasAtivas,      color: 'text-[#00e87a]' },
          { label: 'Em trial',   value: fatura.numEmpresasTrial,       color: 'text-[#ffb340]' },
          { label: 'Conversão',  value: fatura.numEmpresasConversao,   color: 'text-[#ffb340]' },
          { label: 'Bloqueadas', value: fatura.numEmpresasBloqueadas,  color: 'text-[#ff4d6a]' },
        ].map(s => (
          <div key={s.label}
            className="bg-[#0d1525] border border-[#1c2e48] rounded-[11px] p-3 text-center">
            <div className={`text-2xl font-black font-[var(--mono)] ${s.color}`}>{s.value}</div>
            <div className="font-[var(--mono)] text-[10px] tracking-[1px] text-[#3d5875] uppercase mt-0.5">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Lista de empresas ── */}
      {empresas.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-[var(--mono)] text-[10px] tracking-[2px] text-[#3d5875] uppercase">
            Suas empresas
          </p>
          {empresas.map(e => (
            <div key={e.id}
              className="bg-[#0d1525] border border-[#1c2e48] rounded-[11px] px-3 py-2.5 flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-[#ddeaf8] font-medium">{e.nome}</p>
                {e.status_plano === 'trial' && e.diasRestantesTrial > 0 && (
                  <p className="font-[var(--mono)] text-[10px] text-[#ffb340] mt-0.5">
                    {e.diasRestantesTrial} dia{e.diasRestantesTrial !== 1 ? 's' : ''} de trial
                  </p>
                )}
                {e.status_plano === 'conversao' && (
                  <p className="font-[var(--mono)] text-[10px] text-[#ffb340] mt-0.5">
                    {e.diasRestantesConversao} dia{e.diasRestantesConversao !== 1 ? 's' : ''} para converter
                  </p>
                )}
              </div>
              <Badge color={STATUS_COR[e.status_plano] ?? 'gray'}>
                {STATUS_LABEL[e.status_plano] ?? e.status_plano}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* ── Nota sobre integração Asaas ── */}
      <div className="rounded-[10px] border border-[#1c2e48] bg-[#080c14] px-3 py-2.5">
        <p className="font-[var(--mono)] text-[10px] text-[#3d5875] leading-relaxed">
          💳 Em breve: pagamento automático via Asaas.
          Por enquanto, entre em contato com o suporte para efetuar o pagamento.
        </p>
      </div>

    </div>
  )
}
