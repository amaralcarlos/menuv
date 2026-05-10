'use client'
import { useEffect, useState } from 'react'
import { useApi } from '@/lib/use-api'
import { Spinner, Badge } from '@/components/ui'
import { FAIXAS_RESTAURANTE, PLANO_LANCAMENTO } from '@/lib/status-empresa'

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
  totalEmpresas:         number
  numEmpresasAtivas:     number
  numEmpresasTrial:      number
  numEmpresasConversao:  number
  numEmpresasBloqueadas: number
  planoLancamento:       boolean
  faixaLabel:            string
  totalAPagar:           number
  proximaFaixaLabel:     string | null
  proximaFaixaValor:     number | null
  empresasParaProxima:   number | null
}

interface EmpresaItem {
  id: string
  nome: string
  status_plano: string
  diasRestantesTrial:     number
  diasRestantesConversao: number
}

export default function FaturaPane({ restId }: { restId: string }) {
  const { call }  = useApi()
  const [loading,  setLoading]  = useState(true)
  const [fatura,   setFatura]   = useState<Fatura | null>(null)
  const [empresas, setEmpresas] = useState<EmpresaItem[]>([])

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

  return (
    <div className="px-4 pt-4 pb-24 flex flex-col gap-4">

      {/* ── Total a pagar ── */}
      <div className="rounded-[14px] border border-[rgba(0,232,122,.25)] bg-[rgba(0,232,122,.04)] p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="font-[var(--mono)] text-[10px] tracking-[2px] text-[#3d5875] uppercase">
            Fatura do mês
          </p>
          {fatura.planoLancamento && (
            <span className="font-[var(--mono)] text-[10px] text-[#ffb340] border border-[rgba(255,179,64,.3)] bg-[rgba(255,179,64,.08)] rounded-full px-2 py-0.5">
              🚀 Lançamento
            </span>
          )}
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-[#7a96b8]">{fatura.faixaLabel}</p>
            <p className="font-[var(--mono)] text-[10px] text-[#3d5875] mt-0.5">
              {fatura.totalEmpresas} empresa{fatura.totalEmpresas !== 1 ? 's' : ''} cadastrada{fatura.totalEmpresas !== 1 ? 's' : ''}
            </p>
          </div>
          <span className="font-[var(--mono)] text-2xl font-black text-[#00e87a]"
            style={{ textShadow: '0 0 16px rgba(0,232,122,.3)' }}>
            {BRL(fatura.totalAPagar)}
          </span>
        </div>

        {/* Plano lançamento — aviso de limite */}
        {fatura.planoLancamento && (
          <div className="rounded-[8px] bg-[rgba(255,179,64,.06)] border border-[rgba(255,179,64,.2)] px-3 py-2">
            <p className="font-[var(--mono)] text-[10px] text-[#ffb340] leading-relaxed">
              🚀 Plano de lançamento · até {PLANO_LANCAMENTO.limiteEmpresas} empresas por {BRL(PLANO_LANCAMENTO.valor)}/mês
            </p>
          </div>
        )}

        {/* Próxima faixa — só para plano normal */}
        {!fatura.planoLancamento && fatura.proximaFaixaLabel && (
          <div className="rounded-[8px] bg-[rgba(0,232,122,.06)] border border-[rgba(0,232,122,.12)] px-3 py-2">
            <p className="font-[var(--mono)] text-[10px] text-[#00e87a] leading-relaxed">
              ⬆️ Próxima faixa: {fatura.proximaFaixaLabel} → {BRL(fatura.proximaFaixaValor!)}
              {fatura.empresasParaProxima !== null && (
                <span className="text-[#3d5875]">
                  {' '}(faltam {fatura.empresasParaProxima} empresa{fatura.empresasParaProxima !== 1 ? 's' : ''})
                </span>
              )}
            </p>
          </div>
        )}

        {!fatura.planoLancamento && !fatura.proximaFaixaLabel && (
          <div className="rounded-[8px] bg-[rgba(0,232,122,.06)] border border-[rgba(0,232,122,.12)] px-3 py-2">
            <p className="font-[var(--mono)] text-[10px] text-[#00e87a]">
              🏆 Você está no plano máximo.
            </p>
          </div>
        )}
      </div>

      {/* ── Tabela de faixas ── */}
      <div className="flex flex-col gap-1.5">
        <p className="font-[var(--mono)] text-[10px] tracking-[2px] text-[#3d5875] uppercase">
          Tabela de preços
        </p>
        {FAIXAS_RESTAURANTE.map((f, i) => {
          const ativa = fatura.faixaLabel === f.label
          return (
            <div key={i}
              className={`flex items-center justify-between px-3 py-2 rounded-[10px] border transition-all
                ${ativa
                  ? 'border-[rgba(0,232,122,.4)] bg-[rgba(0,232,122,.06)]'
                  : 'border-[#1c2e48] bg-[#0d1525]'
                }`}>
              <div className="flex items-center gap-2">
                {ativa && <span className="w-1.5 h-1.5 rounded-full bg-[#00e87a] flex-shrink-0" />}
                <span className={`font-[var(--mono)] text-[11px] ${ativa ? 'text-[#ddeaf8]' : 'text-[#3d5875]'}`}>
                  {f.label}
                </span>
              </div>
              <span className={`font-[var(--mono)] text-[11px] font-bold ${ativa ? 'text-[#00e87a]' : 'text-[#3d5875]'}`}>
                {BRL(f.valor)}/mês
              </span>
            </div>
          )
        })}
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

      {/* Nota Asaas */}
      <div className="rounded-[10px] border border-[#1c2e48] bg-[#080c14] px-3 py-2.5">
        <p className="font-[var(--mono)] text-[10px] text-[#3d5875] leading-relaxed">
          💳 Em breve: pagamento automático via Asaas.
          Por enquanto, entre em contato com o suporte para efetuar o pagamento.
        </p>
      </div>

    </div>
  )
}
