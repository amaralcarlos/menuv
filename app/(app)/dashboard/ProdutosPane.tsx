'use client'
import { useEffect, useState } from 'react'
import { useApi } from '@/lib/use-api'
import { Btn, Input, Spinner, Badge, Modal, useToast } from '@/components/ui'

const TIPO_LABEL: Record<string, string> = {
  marmita: '🍱 Marmita',
  buffet:  '🍽️ Buffet',
  avulso:  '📦 Avulso',
}
const TIPO_COR: Record<string, any> = {
  marmita: 'green',
  buffet:  'blue',
  avulso:  'yellow',
}

interface Produto {
  id: string
  nome: string
  descricao: string
  tipo: string
  ativo: boolean
}

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function ProdutosPane({ restId }: { restId: string }) {
  const { call } = useApi()
  const toast    = useToast()

  const [produtos,  setProdutos]  = useState<Produto[]>([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(false)
  const [editando,  setEditando]  = useState<Produto | null>(null)
  const [saving,    setSaving]    = useState(false)

  const [form, setForm] = useState({ nome: '', descricao: '', tipo: 'avulso' })

  function load() {
    call<any>(`/api/produtos?restauranteId=${restId}`).then(r => {
      if (r.success) setProdutos(r.data)
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [restId])

  function abrirNovo() {
    setEditando(null)
    setForm({ nome: '', descricao: '', tipo: 'avulso' })
    setModal(true)
  }

  function abrirEditar(p: Produto) {
    setEditando(p)
    setForm({ nome: p.nome, descricao: p.descricao ?? '', tipo: p.tipo })
    setModal(true)
  }

  async function salvar() {
    if (!form.nome.trim()) { toast('Nome é obrigatório.', 'error'); return }
    setSaving(true)

    const body = {
      nome:      form.nome,
      descricao: form.descricao,
      tipo:      form.tipo,
    }

    const r = editando
      ? await call(`/api/produtos/${editando.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      : await call('/api/produtos', { method: 'POST', body: JSON.stringify(body) })

    setSaving(false)
    if (r.success) {
      toast(editando ? 'Produto atualizado.' : 'Produto criado.')
      setModal(false); load()
    } else {
      toast(r.error ?? 'Erro ao salvar.', 'error')
    }
  }

  async function desativar(p: Produto) {
    if (!confirm(`Desativar "${p.nome}"?`)) return
    const r = await call(`/api/produtos/${p.id}`, { method: 'PATCH', body: JSON.stringify({ ativo: false }) })
    if (r.success) { toast('Produto desativado.'); load() }
    else toast(r.error, 'error')
  }

  async function reativar(p: Produto) {
    const r = await call(`/api/produtos/${p.id}`, { method: 'PATCH', body: JSON.stringify({ ativo: true }) })
    if (r.success) { toast('Produto reativado.'); load() }
    else toast(r.error, 'error')
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>

  const ativos    = produtos.filter(p => p.ativo)
  const inativos  = produtos.filter(p => !p.ativo)

  return (
    <div className="px-4 pt-4 pb-24 flex flex-col gap-4">

      <div className="flex items-center justify-between">
        <p className="font-[var(--mono)] text-[10px] tracking-[2px] text-[#3d5875] uppercase">
          {ativos.length} produto{ativos.length !== 1 ? 's' : ''} ativo{ativos.length !== 1 ? 's' : ''}
        </p>
        <Btn size="sm" className="w-auto" onClick={abrirNovo}>+ Novo produto</Btn>
      </div>

      {/* Produtos ativos */}
      {ativos.map(p => (
        <div key={p.id}
          className="bg-[#0d1525] border border-[#1c2e48] rounded-[12px] p-3 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm text-[#ddeaf8] font-medium">{p.nome}</p>
              {p.descricao && <p className="font-[var(--mono)] text-[10px] text-[#3d5875] mt-0.5">{p.descricao}</p>}
            </div>
            <Badge color={TIPO_COR[p.tipo] ?? 'gray'}>{TIPO_LABEL[p.tipo] ?? p.tipo}</Badge>
          </div>
          <div className="flex gap-2">
            <Btn size="sm" variant="secondary" className="w-auto" onClick={() => abrirEditar(p)}>Editar</Btn>
            {p.tipo === 'avulso' && (
              <Btn size="sm" variant="danger" className="w-auto" onClick={() => desativar(p)}>Desativar</Btn>
            )}
          </div>
        </div>
      ))}

      {ativos.length === 0 && (
        <div className="bg-[#0d1525] border border-[#1c2e48] rounded-[12px] p-6 text-center">
          <p className="font-[var(--mono)] text-xs text-[#3d5875]">
            Nenhum produto cadastrado.<br />Marmita e Buffet são criados automaticamente.
          </p>
        </div>
      )}

      {/* Produtos inativos */}
      {inativos.length > 0 && (
        <div className="flex flex-col gap-2 mt-2">
          <p className="font-[var(--mono)] text-[10px] tracking-[2px] text-[#3d5875] uppercase">Inativos</p>
          {inativos.map(p => (
            <div key={p.id}
              className="bg-[#080c14] border border-[#1c2e48] rounded-[12px] px-3 py-2.5 flex items-center justify-between gap-2 opacity-50">
              <div>
                <p className="text-sm text-[#7a96b8]">{p.nome}</p>
                <p className="font-[var(--mono)] text-[10px] text-[#3d5875]">{TIPO_LABEL[p.tipo]}</p>
              </div>
              <Btn size="sm" variant="secondary" className="w-auto" onClick={() => reativar(p)}>Reativar</Btn>
            </div>
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      <Modal open={modal} onClose={() => setModal(false)}
        title={editando ? `Editar: ${editando.nome}` : 'Novo produto'}>
        <div className="flex flex-col gap-4">
          <Input label="Nome" value={form.nome}
            onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
            placeholder="Ex: Suco, Sobremesa, Salada..." />

          <Input label="Descrição (opcional)" value={form.descricao}
            onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
            placeholder="Breve descrição do produto" />

          {!editando && (
            <div className="flex flex-col gap-1.5">
              <label className="font-[var(--mono)] text-[10px] tracking-[1.5px] text-[#3d5875] uppercase">Tipo</label>
              <select value={form.tipo}
                onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                className="w-full bg-[#080c14] border border-[#253d5e] rounded-[11px] px-3 py-2.5 font-[var(--mono)] text-[#ddeaf8] outline-none">
                <option value="avulso">📦 Avulso (reserva com quantidade)</option>
                <option value="marmita">🍱 Marmita (seleciona cardápio)</option>
                <option value="buffet">🍽️ Buffet (reserva simples)</option>
              </select>
            </div>
          )}

          <Btn loading={saving} onClick={salvar}>
            {editando ? 'Salvar alterações' : 'Criar produto'}
          </Btn>
        </div>
      </Modal>
    </div>
  )
}
