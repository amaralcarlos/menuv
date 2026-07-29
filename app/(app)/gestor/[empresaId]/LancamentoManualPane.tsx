'use client'
import { useEffect, useState } from 'react'
import { useApi } from '@/lib/use-api'
import { useToast, Btn, Spinner } from '@/components/ui'

const BRL = (v: number) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function ontem() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

export default function LancamentoManualPane({ empresaId }: { empresaId: string }) {
  const { call } = useApi()
  const toast    = useToast()

  const [colabs,     setColabs]     = useState<any[]>([])
  const [produtos,   setProdutos]   = useState<any[]>([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)

  const [colabId,      setColabId]      = useState('')
  const [produtoId,    setProdutoId]    = useState('')
  const [justificativa, setJustificativa] = useState('')
  const [qtd,          setQtd]          = useState(1)

  // Histórico de lançamentos manuais do dia
  const [lancamentos, setLancamentos] = useState<any[]>([])

  async function load() {
    const [colabsRes, prodRes] = await Promise.all([
      call<any[]>(`/api/colaboradores?empresaId=${empresaId}`),
      call<any[]>(`/api/empresas/${empresaId}/produtos`),
    ])
    if (colabsRes.success) setColabs(colabsRes.data)
    if (prodRes.success)   setProdutos(prodRes.data.filter((ep: any) => ep.ativo))
    setLoading(false)
    buscarLancamentos()
  }

  async function buscarLancamentos() {
    const hoje = new Date().toISOString().split('T')[0]
    const r = await call<any[]>(`/api/pedidos?empresaId=${empresaId}&dataInicio=${hoje}&dataFim=${hoje}`)
    if (r.success) {
      setLancamentos(r.data.filter((p: any) => p.origem === 'manual'))
    }
  }

  useEffect(() => { load() }, [empresaId])

  async function salvar() {
    if (!colabId)      { toast('Selecione o colaborador.', 'error'); return }
    if (!produtoId)    { toast('Selecione o produto.', 'error'); return }
    if (!justificativa.trim()) { toast('Justificativa é obrigatória.', 'error'); return }

    setSaving(true)
    const prod = produtos.find((ep: any) => ep.produto.id === produtoId)
    const nome = prod?.produto.nome ?? 'Produto'
    const itens = qtd > 1 ? [`${qtd}x ${nome}`] : [nome]

    const r = await call('/api/pedidos', {
      method: 'POST',
      body: JSON.stringify({
        colaboradorId:  colabId,
        empresaId,
        data:           `${String(new Date().getDate()).padStart(2,'0')}/${String(new Date().getMonth()+1).padStart(2,'0')}/${new Date().getFullYear()}`,
        itens,
        obs:            justificativa,
        produto_id:     produtoId,
        origem:         'manual',
        justificativa,
      }),
    })
    setSaving(false)

    if (r.success) {
      toast('Lançamento registrado!')
      setColabId(''); setProdutoId('')
      setJustificativa(''); setQtd(1)
      buscarLancamentos()
    } else {
      toast((r as any).error ?? 'Erro ao registrar.', 'error')
    }
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>

  const colabNome = (id: string) => colabs.find(c => c.id === id)?.nome ?? ''
  return (
    <div className="px-4 pt-4 pb-24 flex flex-col gap-4">

      {/* Formulário */}
      <div className="bg-[#0d1525] border border-[#1c2e48] rounded-[12px] p-4 flex flex-col gap-3">
        <p className="font-[var(--mono)] text-[10px] tracking-[2px] text-[#3d5875] uppercase">
          Novo lançamento retroativo
        </p>

        {/* Colaborador */}
        <div className="flex flex-col gap-1.5">
          <label className="font-[var(--mono)] text-[9px] text-[#3d5875] uppercase tracking-[1px]">Colaborador</label>
          <select value={colabId} onChange={e => setColabId(e.target.value)}
            className="w-full bg-[#080c14] border border-[#253d5e] rounded-[10px] px-3 py-2.5 font-[var(--mono)] text-sm text-[#ddeaf8] outline-none">
            <option value="">Selecione...</option>
            {colabs.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>

        {/* Produto */}
        <div className="flex flex-col gap-1.5">
          <label className="font-[var(--mono)] text-[9px] text-[#3d5875] uppercase tracking-[1px]">Produto</label>
          <select value={produtoId} onChange={e => setProdutoId(e.target.value)}
            className="w-full bg-[#080c14] border border-[#253d5e] rounded-[10px] px-3 py-2.5 font-[var(--mono)] text-sm text-[#ddeaf8] outline-none">
            <option value="">Selecione...</option>
            {produtos.map(ep => (
              <option key={ep.produto.id} value={ep.produto.id}>
                {ep.produto.nome}{ep.preco ? ` — ${BRL(ep.preco)}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Quantidade */}
        <div className="flex flex-col gap-1.5">
            <label className="font-[var(--mono)] text-[9px] text-[#3d5875] uppercase tracking-[1px]">Qtd</label>
            <div className="flex items-center gap-2 bg-[#080c14] border border-[#253d5e] rounded-[10px] px-3 py-2">
              <button onClick={() => setQtd(q => Math.max(1, q-1))}
                className="text-[#ddeaf8] bg-transparent border-none cursor-pointer w-5 text-center">−</button>
              <span className="font-[var(--mono)] text-sm font-bold text-[#00e87a] w-5 text-center">{qtd}</span>
              <button onClick={() => setQtd(q => Math.min(20, q+1))}
                className="text-[#ddeaf8] bg-transparent border-none cursor-pointer w-5 text-center">+</button>
            </div>
          </div>

        {/* Justificativa */}
        <div className="flex flex-col gap-1.5">
          <label className="font-[var(--mono)] text-[9px] text-[#3d5875] uppercase tracking-[1px]">
            Justificativa <span className="text-[#ff4d6a]">*</span>
          </label>
          <textarea value={justificativa} onChange={e => setJustificativa(e.target.value)}
            placeholder="Ex: Colaborador não conseguiu acessar o sistema no dia..."
            rows={3}
            className="w-full bg-[#080c14] border border-[#253d5e] rounded-[10px] px-3 py-2.5 font-[var(--mono)] text-sm text-[#ddeaf8] outline-none placeholder:text-[#3d5875] resize-none focus:border-[rgba(0,232,122,.4)]" />
        </div>

        <Btn loading={saving} onClick={salvar}>
          ⚡ Registrar lançamento
        </Btn>
      </div>

      {/* Lançamentos manuais de hoje */}
      {lancamentos.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-[var(--mono)] text-[9px] tracking-[2px] text-[#3d5875] uppercase">
            Lançamentos manuais de hoje
          </p>
          {lancamentos.map((p: any) => (
            <div key={p.id} className="bg-[#0d1525] border border-[rgba(255,179,64,.2)] rounded-[10px] px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-[#ddeaf8] font-medium">{p.colaboradorNome}</p>
                <span className="font-[var(--mono)] text-[9px] text-[#ffb340] border border-[rgba(255,179,64,.3)] rounded-full px-1.5 py-0.5">
                  ⚡ Manual
                </span>
              </div>
              <p className="font-[var(--mono)] text-[10px] text-[#7a96b8] mt-0.5">
                {(p.pedido_itens?.map((i: any) => i.item) ?? p.itens ?? []).join(', ')}
              </p>
              {p.justificativa && (
                <p className="font-[var(--mono)] text-[9px] text-[#3d5875] mt-0.5">
                  Justificativa: {p.justificativa}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
