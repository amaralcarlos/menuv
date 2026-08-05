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
  const [mesAno,     setMesAno]     = useState(mesAtual())
  const [detalhe,    setDetalhe]    = useState<any>(null)
  const [loading,    setLoading]    = useState(false)
  const [modoCustom, setModoCustom] = useState(false)
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim,    setDataFim]    = useState('')

  async function buscarCustom() {
    if (!dataInicio || !dataFim) return
    setLoading(true)
    const ini = dataInicio.split('-').reverse().join('/')
    const fim = dataFim.split('-').reverse().join('/')
    const res = await call<any>(`/api/relatorio/empresa?empresaId=${empresaId}&mesAno=${mesAtual()}&inicio=${dataInicio}&fim=${dataFim}`)
    if (res.success) setDetalhe(res.data)
    setLoading(false)
  }

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
      <div className="mb-4 flex flex-col gap-2">
        <div className="flex gap-2">
          <button onClick={() => setModoCustom(false)}
            className={`flex-1 py-2 rounded-[8px] font-[var(--mono)] text-[10px] border cursor-pointer transition-all
              ${!modoCustom ? 'bg-[rgba(0,232,122,.1)] border-[rgba(0,232,122,.3)] text-[#00e87a]' : 'bg-[#0d1525] border-[#1c2e48] text-[#3d5875]'}`}>
            Por mês
          </button>
          <button onClick={() => setModoCustom(true)}
            className={`flex-1 py-2 rounded-[8px] font-[var(--mono)] text-[10px] border cursor-pointer transition-all
              ${modoCustom ? 'bg-[rgba(0,232,122,.1)] border-[rgba(0,232,122,.3)] text-[#00e87a]' : 'bg-[#0d1525] border-[#1c2e48] text-[#3d5875]'}`}>
            Personalizado
          </button>
        </div>

        {!modoCustom ? (
          <select value={mesAno} onChange={e => { setMesAno(e.target.value); buscar(e.target.value) }}
            className="w-full bg-[#0d1525] border border-[#1c2e48] rounded-[8px] px-3 py-2 font-[var(--mono)] text-sm text-[#ddeaf8] outline-none cursor-pointer">
            {ultimos12Meses().map(m => <option key={m} value={m}>{nomeMes(m)}</option>)}
          </select>
        ) : (
          <div className="flex gap-2">
            <div className="flex flex-col gap-1 flex-1">
              <label className="font-[var(--mono)] text-[9px] text-[#3d5875] uppercase">De</label>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                className="w-full bg-[#0d1525] border border-[#1c2e48] rounded-[8px] px-3 py-2 font-[var(--mono)] text-sm text-[#ddeaf8] outline-none" />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="font-[var(--mono)] text-[9px] text-[#3d5875] uppercase">Até</label>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                className="w-full bg-[#0d1525] border border-[#1c2e48] rounded-[8px] px-3 py-2 font-[var(--mono)] text-sm text-[#ddeaf8] outline-none" />
            </div>
            <button onClick={buscarCustom}
              className="mt-4 px-3 py-2 rounded-[8px] bg-[rgba(0,232,122,.1)] border border-[rgba(0,232,122,.3)] font-[var(--mono)] text-[10px] text-[#00e87a] cursor-pointer hover:bg-[rgba(0,232,122,.15)]">
              Buscar
            </button>
          </div>
        )}
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

          {refeicoes > 0 && (
            <div className="bg-[#0d1525] border border-[#1c2e48] rounded-[11px] p-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="font-[var(--mono)] text-xs text-[#ff4d6a] font-bold">💳 Seu desconto no período</span>
                <span className="font-[var(--mono)] text-lg text-[#ff4d6a] font-black">{BRL(valorColab)}</span>
              </div>
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
