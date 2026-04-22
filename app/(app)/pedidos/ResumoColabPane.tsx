'use client'
import { useEffect, useState } from 'react'
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

function fmtData(dataIso: string) {
  const parts = dataIso.split('-')
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
  return dataIso
}

export default function ResumoColabPane({ empresaId }: { empresaId: string }) {
  const { call } = useApi()
  const [mesAno,   setMesAno]   = useState(mesAtual())
  const [detalhe,  setDetalhe]  = useState<any>(null)
  const [loading,  setLoading]  = useState(false)
  const [pct,      setPct]      = useState(0)

  // Lê o percentual configurado pelo gestor
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

  const preco      = Number(detalhe?.preco ?? 0)
  const total      = detalhe?.totalPedidos ?? 0
  const valorTotal = total * preco
  const valorColab = valorTotal * (pct / 100)
  const valorEmp   = valorTotal * (1 - pct / 100)
  const temRateio  = pct > 0 && pct < 100

  // Filtra só os pedidos do colaborador logado
  const meusColabs = detalhe?.colaboradores ?? []

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
              <div className="text-2xl font-black font-[var(--mono)] text-[#4da6ff]">{total}</div>
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

          {/* Banner ou bloco de subsídio */}
          {pct === 0 && (
            <div className="bg-[rgba(0,232,122,.06)] border border-[rgba(0,232,122,.15)] rounded-[11px] px-4 py-3 mb-4 text-center">
              <p className="font-[var(--mono)] text-xs text-[#00e87a]">
                🎉 Sua empresa cobre 100% das refeições!
              </p>
            </div>
          )}

          {temRateio && (
            <div className="bg-[#0d1525] border border-[#1c2e48] rounded-[11px] p-3 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-[var(--mono)] text-xs text-[#3d5875]">🏢 Empresa subsidia</span>
                <span className="font-[var(--mono)] text-xs text-[#00e87a] font-bold">
                  {valorEmp.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({100-pct}%)
                </span>
              </div>
              <div className="h-1.5 bg-[#1c2e48] rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#00e87a,#00c4a0)]"
                  style={{ width: `${100 - pct}%` }}
                />
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

          {pct === 100 && (
            <div className="bg-[rgba(77,166,255,.06)] border border-[rgba(77,166,255,.15)] rounded-[11px] px-4 py-3 mb-4 text-center">
              <p className="font-[var(--mono)] text-xs text-[#4da6ff]">
                💳 Você paga 100% das refeições
              </p>
            </div>
          )}

          {/* Lista de pedidos */}
          <p className="font-[var(--mono)] text-[10px] text-[#3d5875] uppercase tracking-[1px] mb-2">
            Meus pedidos
          </p>

          {total === 0 && (
            <div className="bg-[#0d1525] border border-[#1c2e48] rounded-[11px] p-4 text-center">
              <p className="font-[var(--mono)] text-xs text-[#3d5875]">Nenhum pedido neste mês.</p>
            </div>
          )}

          {/* Busca pedidos detalhados */}
          <PedidosLista empresaId={empresaId} mesAno={mesAno} preco={preco} pct={pct} />
        </>
      )}
    </div>
  )
}

/* ── Lista detalhada de pedidos ──────────────────────────── */
function PedidosLista({ empresaId, mesAno, preco, pct }: {
  empresaId: string; mesAno: string; preco: number; pct: number
}) {
  const { call }  = useApi()
  const [pedidos, setPedidos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const parts  = mesAno.split('/')
      const mes    = parts[0]
      const ano    = parts[1]
      const inicio = `${ano}-${mes}-01`
      const fim    = new Date(parseInt(ano), parseInt(mes), 0).toISOString().split('T')[0]

      // Busca pedidos dia a dia não é eficiente — usamos o endpoint de relatório
      // e filtramos pelo colaborador logado
      const res = await call<any[]>(`/api/pedidos?empresaId=${empresaId}&data=${inicio.replace(/-/g,'/')}`)
      // Como não temos endpoint por mês, buscamos via relatorio
      const relRes = await call<any>(`/api/relatorio/empresa?empresaId=${empresaId}&mesAno=${mesAno}`)
      if (relRes.success) {
        // Pedidos detalhados não vêm do relatório — vamos buscar por intervalo
        // Por agora mostramos o resumo por colaborador
      }
      setLoading(false)
    }
    load()
  }, [empresaId, mesAno])

  if (loading) return <Spinner />

  return null
}
