'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useApi } from '@/lib/use-api'
import { Spinner } from '@/components/ui'

function mesAtual() {
  const n = new Date()
  return `${String(n.getMonth() + 1).padStart(2, '0')}/${n.getFullYear()}`
}

function nomeMes(mesAno: string) {
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  const parts = mesAno.split('/')
  return `${meses[parseInt(parts[0]) - 1]} ${parts[1]}`
}

function ultimos12Meses() {
  const meses = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    meses.push(`${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`)
  }
  return meses
}

export default function ResumoColabPane({ empresaId }: { empresaId: string }) {
  const { meta } = useAuth()
  const { call } = useApi()
  const [mesAno,  setMesAno]  = useState(mesAtual())
  const [detalhe, setDetalhe] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [pct,     setPct]     = useState(0)

  useEffect(() => {
    const saved = localStorage.getItem(`alm_pct_${empresaId}`)
    if (saved) setPct(parseInt(saved) || 0)
  }, [empresaId])

  async function buscar(mes: string) {
    setLoading(true)
    const res = await call<any>(`/api/relatorio/empresa?empresaId=${empresaId}&mesAno=${mes}`)
    if (res.success) setDetalhe(res.data)
    setLoading(false)
  }

  useEffect(() => { buscar(mesAno) }, [empresaId])

  const meuNome    = meta?.nome ?? ''
  const preco      = Number(detalhe?.preco ?? 0)
  const meuTotal   = detalhe?.colaboradores?.find((c: any) => c.nome === meuNome)?.total ?? 0
  const valorTotal = meuTotal * preco
  const valorColab = valorTotal * (pct / 100)
  const valorEmp   = valorTotal * (1 - pct / 100)
  const temRateio  = pct > 0 && pct < 100

  return (
    <div className="px-4 pt-4 pb-24">

      {/* Dropdown mês */}
      <div className="mb-4">
        <p className="font-[var(--mono)] text-[10px] text-[#3d5875] uppercase tracking-[1px] mb-1">Período</p>
        <select
          value={mesAno}
          onChange={e => { setMesAno(e.target.value); buscar(e.target.value) }}
          className="w-full bg-[#0d1525] border border-[#1c2e48] rounded-[8px] px-3 py-2 font-[var(--mono)] text-sm text-[#ddeaf8] outline-none cursor-pointer">
          {ultimos12Meses().map(m => (
            <option key={m} value={m}>{nomeMes(m)}</option>
          ))}
        </select>
      </div>

      {loading && <Spinner />}

      {!loading && detalhe && (
        <>
          {/* Cards */}
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <div className="bg-[#0d1525] border border-[#1c2e48] rounded-[11px] p-3 text-center">
              <div className="text-2xl font-black font-[var(--mono)] text-[#4da6ff]">{meuTotal}</div>
              <div className="font-[var(--mono)] text-[9px] text-[#3d5875] uppercase mt-0.5">🍽️ Refeições</div>
              <div className="font-[var(--mono)] text-[9px] text-[#3d5875] mt-0.5">{nomeMes(mesAno)}</div>
            </div>

            {pct === 0 ? (
              <div className="bg-[#0d1525] border border-[#1c2e48] rounded-[11px] p-3 text-center">
                <div className="text-xl font-black font-[var(--mono)] text-[#00e87a]">
                  {valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
                <div className="font-[var(--mono)] text-[9px] text-[#3d5875] uppercase mt-0.5">🎁 Benefício</div>
                <div className="font-[var(--mono)] text-[9px] text-[#3d5875] mt-0.5">100% pela empresa</div>
              </div>
            ) : (
              <div className="bg-[#0d1525] border border-[#1c2e48] rounded-[11px] p-3 text-center">
                <div className="text-xl font-black font-[var(--mono)] text-[#4da6ff]">
                  {valorColab.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
                <div className="font-[var(--mono)] text-[9px] text-[#3d5875] uppercase mt-0.5">💳 Minha parte</div>
                <div className="font-[var(--mono)] text-[9px] text-[#3d5875] mt-0.5">{pct}% de {valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
              </div>
            )}
          </div>

          {/* Banner 100% empresa */}
          {pct === 0 && meuTotal > 0 && (
            <div className="bg-[rgba(0,232,122,.06)] border border-[rgba(0,232,122,.15)] rounded-[11px] px-4 py-3 mb-4 text-center">
              <p className="font-[var(--mono)] text-xs text-[#00e87a]">
                🎉 Sua empresa cobre 100% das refeições!
              </p>
            </div>
          )}

          {/* Bloco subsídio */}
          {temRateio && meuTotal > 0 && (
            <div className="bg-[#0d1525] border border-[#1c2e48] rounded-[11px] p-3 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-[var(--mono)] text-xs text-[#3d5875]">🏢 Empresa subsidia</span>
                <span className="font-[var(--mono)] text-xs text-[#00e87a] font-bold">
                  {valorEmp.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({100-pct}%)
                </span>
              </div>
              <div className="h-1.5 bg-[#1c2e48] rounded-full overflow-hidden mb-2">
                <div className="h-full rounded-full bg-[linear-gradient(90deg,#00e87a,#00c4a0)]"
                  style={{ width: `${100 - pct}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-[var(--mono)] text-xs text-[#7a96b8]">
                  Você paga: {valorColab.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span className="font-[var(--mono)] text-xs text-[#3d5875]">
                  {(preco * pct / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/refeição
                </span>
              </div>
            </div>
          )}

          {/* 100% colaborador */}
          {pct === 100 && meuTotal > 0 && (
            <div className="bg-[rgba(77,166,255,.06)] border border-[rgba(77,166,255,.15)] rounded-[11px] px-4 py-3 mb-4 text-center">
              <p className="font-[var(--mono)] text-xs text-[#4da6ff]">
                💳 Você paga 100% das refeições — {valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          )}

          {/* Lista colaboradores da empresa */}
          <p className="font-[var(--mono)] text-[10px] text-[#3d5875] uppercase tracking-[1px] mb-2">
            Meu resumo do mês
          </p>

          {meuTotal === 0 ? (
            <div className="bg-[#0d1525] border border-[#1c2e48] rounded-[11px] p-4 text-center">
              <p className="font-[var(--mono)] text-xs text-[#3d5875]">Nenhum pedido em {nomeMes(mesAno)}.</p>
            </div>
          ) : (
            <div className="bg-[#0d1525] border border-[#1c2e48] rounded-[11px] p-3">
              <div className="flex justify-between items-center py-1.5 border-b border-[#1c2e48]">
                <span className="font-[var(--mono)] text-xs text-[#7a96b8]">Total de refeições</span>
                <span className="font-[var(--mono)] text-xs font-bold text-[#00e87a]">{meuTotal} ref.</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-[#1c2e48]">
                <span className="font-[var(--mono)] text-xs text-[#7a96b8]">Valor total</span>
                <span className="font-[var(--mono)] text-xs text-[#ddeaf8]">
                  {valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-[#1c2e48]">
                <span className="font-[var(--mono)] text-xs text-[#7a96b8]">Empresa subsidia</span>
                <span className="font-[var(--mono)] text-xs text-[#00e87a]">
                  {valorEmp.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({100-pct}%)
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="font-[var(--mono)] text-xs text-[#7a96b8]">Minha parte</span>
                <span className={`font-[var(--mono)] text-xs font-bold ${pct > 0 ? 'text-[#4da6ff]' : 'text-[#00e87a]'}`}>
                  {pct === 0 ? 'R$ 0,00 🎉' : valorColab.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
