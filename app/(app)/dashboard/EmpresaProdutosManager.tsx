'use client'
import { useEffect, useState } from 'react'
import { useApi } from '@/lib/use-api'
import { Btn, Spinner, useToast } from '@/components/ui'

const BRL = (v: number) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$ 0,00'

const TIPO_LABEL: Record<string, string> = {
  marmita: '🍱 Marmita',
  buffet:  '🍽️ Buffet',
  avulso:  '📦 Avulso',
}

interface EmpresaProduto {
  id: string
  ativo: boolean
  preco: number | null
  produto: {
    id: string
    nome: string
    descricao: string
    preco_base: number
    tipo: string
  }
}

interface ProdutoDisponivel {
  id: string
  nome: string
  preco_base: number
  tipo: string
}

export default function EmpresaProdutosManager({
  empresaId, restId
}: { empresaId: string; restId: string }) {
  const { call } = useApi()
  const toast    = useToast()

  const [empProdutos,   setEmpProdutos]   = useState<EmpresaProduto[]>([])
  const [todosProdutos, setTodosProdutos] = useState<ProdutoDisponivel[]>([])
  const [loading,       setLoading]       = useState(true)
  const [salvando,      setSalvando]      = useState<string | null>(null)
  const [precos,        setPrecos]        = useState<Record<string, string>>({})

  function load() {
    Promise.all([
      call<any>(`/api/empresas/${empresaId}/produtos`),
      call<any>(`/api/produtos?restauranteId=${restId}`),
    ]).then(([epRes, pRes]) => {
      if (epRes.success) {
        setEmpProdutos(epRes.data)
        const precoMap: Record<string, string> = {}
        epRes.data.forEach((ep: EmpresaProduto) => {
          precoMap[ep.produto.id] = String(ep.preco ?? ep.produto.preco_base ?? 0)
        })
        setPrecos(precoMap)
      }
      if (pRes.success) setTodosProdutos(pRes.data.filter((p: any) => p.ativo))
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [empresaId])

  const habilitados  = new Set(empProdutos.filter(ep => ep.ativo).map(ep => ep.produto.id))
  const epMap        = Object.fromEntries(empProdutos.map(ep => [ep.produto.id, ep]))

  async function toggleProduto(produto: ProdutoDisponivel) {
    const ep = epMap[produto.id]
    setSalvando(produto.id)

    if (!ep) {
      // Habilita pela primeira vez
      const r = await call(`/api/empresas/${empresaId}/produtos`, {
        method: 'POST',
        body: JSON.stringify({
          produto_id: produto.id,
          preco: parseFloat(precos[produto.id] || String(produto.preco_base)) || 0,
        }),
      })
      if (r.success) { toast(`${produto.nome} habilitado.`); load() }
      else toast(r.error, 'error')
    } else {
      // Alterna ativo/inativo
      const r = await call(`/api/empresas/${empresaId}/produtos`, {
        method: 'PATCH',
        body: JSON.stringify({ empresa_produto_id: ep.id, ativo: !ep.ativo }),
      })
      if (r.success) { toast(ep.ativo ? `${produto.nome} desabilitado.` : `${produto.nome} habilitado.`); load() }
      else toast(r.error, 'error')
    }
    setSalvando(null)
  }

  async function salvarPreco(produto: ProdutoDisponivel) {
    const ep = epMap[produto.id]
    if (!ep) return
    setSalvando(produto.id)
    const r = await call(`/api/empresas/${empresaId}/produtos`, {
      method: 'PATCH',
      body: JSON.stringify({ empresa_produto_id: ep.id, preco: parseFloat(precos[produto.id]) || 0 }),
    })
    setSalvando(null)
    if (r.success) toast('Preço atualizado.')
    else toast(r.error, 'error')
  }

  if (loading) return <Spinner />

  return (
    <div className="flex flex-col gap-2 mt-3 border-t border-[#1c2e48] pt-3">
      <p className="font-[var(--mono)] text-[9px] tracking-[1.5px] text-[#3d5875] uppercase">
        Produtos liberados para esta empresa
      </p>

      {todosProdutos.map(p => {
        const ativo = habilitados.has(p.id)
        const ep    = epMap[p.id]

        return (
          <div key={p.id}
            className={`rounded-[10px] border px-3 py-2.5 flex flex-col gap-2 transition-all
              ${ativo ? 'border-[rgba(0,232,122,.25)] bg-[rgba(0,232,122,.04)]' : 'border-[#1c2e48] bg-[#080c14]'}`}>

            <div className="flex items-center justify-between gap-2">
              <div>
                <p className={`text-sm font-medium ${ativo ? 'text-[#ddeaf8]' : 'text-[#3d5875]'}`}>{p.nome}</p>
                <p className="font-[var(--mono)] text-[10px] text-[#3d5875]">{TIPO_LABEL[p.tipo] ?? p.tipo}</p>
              </div>
              <Btn
                size="sm"
                variant={ativo ? 'danger' : 'secondary'}
                className="w-auto flex-shrink-0"
                loading={salvando === p.id}
                onClick={() => toggleProduto(p)}>
                {ativo ? 'Desabilitar' : 'Habilitar'}
              </Btn>
            </div>

            {/* Preço por empresa */}
            {ativo && ep && (
              <div className="flex items-center gap-2">
                <label className="font-[var(--mono)] text-[9px] text-[#3d5875] uppercase whitespace-nowrap">
                  Preço para esta empresa (R$)
                </label>
                <input
                  type="number" step="0.01" min="0"
                  value={precos[p.id] ?? ''}
                  onChange={e => setPrecos(prev => ({ ...prev, [p.id]: e.target.value }))}
                  className="flex-1 bg-[#080c14] border border-[#253d5e] rounded-[8px] px-2 py-1 font-[var(--mono)] text-xs text-[#ddeaf8] outline-none"
                />
                <button
                  onClick={() => salvarPreco(p)}
                  className="font-[var(--mono)] text-[9px] text-[#00e87a] border border-[rgba(0,232,122,.3)] rounded-[6px] px-2 py-1 cursor-pointer hover:bg-[rgba(0,232,122,.08)] bg-transparent">
                  Salvar
                </button>
              </div>
            )}
          </div>
        )
      })}

      {todosProdutos.length === 0 && (
        <p className="font-[var(--mono)] text-[10px] text-[#3d5875] text-center py-2">
          Nenhum produto cadastrado. Crie produtos na aba Produtos.
        </p>
      )}
    </div>
  )
}
