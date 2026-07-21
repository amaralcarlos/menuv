'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useApi } from '@/lib/use-api'
import { Spinner } from '@/components/ui'

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

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

  async function buscar(mes: string) {
    setLoading(true)
    const res = await call<any>(`/api/relatorio/empresa?empresaId=${empresaId}&mesAno=${mes}`)
    if (res.success) setDetalhe(res.data)
    setLoading(false)
  }

  useEffect(() => { buscar(mesAno) }, [empresaId])

  const meuNome = meta?.nome ?? ''
  const eu = detalhe?.colaboradores?.find((c: any) => c.nome === meuNome)

  const refeicoes    = eu?.total      ?? 0
  const valorBruto   = eu?.valorBruto  ?? 0
  const valorSub     = eu?.valorSubsidio ?? 0
  const valorColab   = eu?.valorColab  ?? 0
  const temSubsidio  = valorSub > 0

  return (
    <div className="px-4 pt-4 pb-24">

      {/* Período */}
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
              <div className="text-2xl font-black font-[var(--mono)] text-[#4da6ff]">{refeicoes}</div>
              <div className="font-[var(--mono)] text-[9px] text-[#3d5875] uppercase mt-0.5">🍽️ Refeições</div>
              <div className="font-[var(--mono)] text-[9px] text-[#3d5875] mt-0.5">{nomeMes(mesAno)}</div>
            </div>

            <div className="bg-[#0d1525] border border-[#1c2e48] rounded-[11px] p-3 text-center">
              <div className="text-xl font-black font-[var(--mono)] text-[#ff4d6a]">
                {BRL(valorColab)}
              </div>
              <div className="font-[var(--mono)] text-[9px] text-[#3d5875] uppercase mt-0.5">💳 A descontar</div>
              <div className="font-[var(--mono)] text-[9px] text-[#3d5875] mt-0.5">do seu salário</div>
            </div>
          </div>

          {/* Breakdown subsídio */}
          {refeicoes > 0 && (
            <div className="bg-[#0d1525] border border-[#1c2e48] rounded-[11px] p-3 mb-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-[var(--mono)] text-xs text-[#7a96b8]">Valor total</span>
                <span className="font-[var(--mono)] text-xs text-[#ddeaf8] font-bold">{BRL(valorBruto)}</span>
              </div>
              {temSubsidio && (
                <div className="flex items-center justify-between">
                  <span className="font-[var(--mono)] text-xs text-[#00e87a]">🏢 Subsídio empresa</span>
                  <span className="font-[var(--mono)] text-xs text-[#00e87a] font-bold">− {BRL(valorSub)}</span>
                </div>
              )}
              <div className="h-px bg-[#1c2e48]" />
              <div className="flex items-center justify-between">
                <span className="font-[var(--mono)] text-xs text-[#ff4d6a] font-bold">Seu desconto</span>
                <span className="font-[var(--mono)] text-sm text-[#ff4d6a] font-black">{BRL(valorColab)}</span>
              </div>

              {/* Barra subsídio */}
              {temSubsidio && valorBruto > 0 && (
                <div className="mt-1">
                  <div className="h-1.5 bg-[#1c2e48] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[linear-gradient(90deg,#00e87a,#00c4a0)]"
                      style={{ width: `${Math.min(100, (valorSub / valorBruto) * 100).toFixed(0)}%` }} />
                  </div>
                  <p className="font-[var(--mono)] text-[9px] text-[#3d5875] mt-1 text-right">
                    {((valorSub / valorBruto) * 100).toFixed(0)}% subsidiado pela empresa
                  </p>
                </div>
              )}
            </div>
          )}

          {refeicoes === 0 && (
            <div className="bg-[#0d1525] border border-[#1c2e48] rounded-[11px] p-4 text-center">
              <p className="font-[var(--mono)] text-xs text-[#3d5875]">
                Nenhuma refeição em {nomeMes(mesAno)}.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
