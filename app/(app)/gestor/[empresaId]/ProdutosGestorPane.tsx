'use client'
import { useEffect, useState } from 'react'
import { useApi } from '@/lib/use-api'
import { useToast, Spinner } from '@/components/ui'

const BRL = (v: number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function ProdutosGestorPane({ empresaId }: { empresaId: string }) {
  const { call } = useApi()
  const toast    = useToast()

  const [produtos,    setProdutos]    = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  const [subsidios,   setSubsidios]   = useState<Record<string, string>>({})
  const [salvando,    setSalvando]    = useState<string | null>(null)

  async function load() {
    const r = await call<any>(`/api/empresas/${empresaId}/produtos`)
    if (r.success) {
      const ativos = r.data.filter((ep: any) => ep.ativo)
      setProdutos(ativos)
      const map: Record<string, string> = {}
      ativos.forEach((ep: any) => {
        map[ep.produto.id] = String(ep.subsidio ?? 0)
      })
      setSubsidios(map)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [empresaId])

  async function salvar(ep: any) {
    const prodId = ep.produto.id
    setSalvando(prodId)
    const r = await call(`/api/empresas/${empresaId}/produtos`, {
      method: 'PATCH',
      body: JSON.stringify({
        empresa_produto_id: ep.id,
        subsidio: parseFloat(subsidios[prodId]) || 0,
      }),
    })
    setSalvando(null)
    if (r.success) toast('Subsídio salvo.')
    else toast((r as any).error ?? 'Erro ao salvar.', 'error')
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>

  if (produtos.length === 0) return (
    <div className="px-4 pt-8 text-center">
      <p className="font-[var(--mono)] text-xs text-[#3d5875]">
        Nenhum produto liberado para esta empresa.
      </p>
    </div>
  )

  return (
    <div className="px-4 pt-4 pb-24 flex flex-col gap-3">
      <p className="font-[var(--mono)] text-[10px] text-[#3d5875] uppercase tracking-[1px]">
        Defina o subsídio da empresa por produto
      </p>

      {produtos.map((ep: any) => {
        const prodId  = ep.produto.id
        const preco   = Number(ep.preco ?? 0)
        const sub     = parseFloat(subsidios[prodId]) || 0
        const desconto = Math.max(0, preco - sub)

        return (
          <div key={ep.id}
            className="bg-[#0d1525] border border-[#1c2e48] rounded-[12px] p-3 flex flex-col gap-2.5">

            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-[#ddeaf8] font-medium">{ep.produto.nome}</p>
                {ep.produto.descricao && (
                  <p className="font-[var(--mono)] text-[10px] text-[#3d5875] mt-0.5">
                    {ep.produto.descricao}
                  </p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-[var(--mono)] text-xs text-[#7a96b8]">Preço</p>
                <p className="font-[var(--mono)] text-sm font-bold text-[#ddeaf8]">{BRL(preco)}</p>
              </div>
            </div>

            {/* Campo subsídio */}
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-1 flex-1">
                <label className="font-[var(--mono)] text-[9px] text-[#3d5875] uppercase tracking-[1px]">
                  Subsídio da empresa (R$)
                </label>
                <input
                  type="number" step="0.01" min="0" max={preco}
                  value={subsidios[prodId] ?? '0'}
                  onChange={e => setSubsidios(s => ({ ...s, [prodId]: e.target.value }))}
                  className="w-full bg-[#080c14] border border-[#253d5e] rounded-[8px] px-3 py-2 font-[var(--mono)] text-sm text-[#ddeaf8] outline-none focus:border-[rgba(0,232,122,.4)]"
                />
              </div>
              <button
                onClick={() => salvar(ep)}
                disabled={salvando === prodId}
                className="font-[var(--mono)] text-[10px] text-[#00e87a] border border-[rgba(0,232,122,.3)] rounded-[8px] px-3 py-2 cursor-pointer hover:bg-[rgba(0,232,122,.08)] bg-transparent disabled:opacity-50 mt-4 flex-shrink-0">
                {salvando === prodId ? '...' : 'Salvar'}
              </button>
            </div>

            {/* Preview desconto colaborador */}
            {preco > 0 && (
              <div className="flex items-center justify-between bg-[#080c14] rounded-[8px] px-3 py-2">
                <span className="font-[var(--mono)] text-[10px] text-[#3d5875]">
                  💳 Desconto do colaborador
                </span>
                <span className={`font-[var(--mono)] text-sm font-bold ${desconto === 0 ? 'text-[#00e87a]' : 'text-[#ff4d6a]'}`}>
                  {desconto === 0 ? '✓ Gratuito' : BRL(desconto)}
                </span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
