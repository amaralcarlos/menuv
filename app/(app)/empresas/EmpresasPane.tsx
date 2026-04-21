'use client'
import { useEffect, useState } from 'react'
import { useApi } from '@/lib/use-api'
import { useToast } from '@/components/ui'
import { Card, SectionLabel, Badge, Btn, Modal, Input, Spinner } from '@/components/ui'

interface Empresa {
  id: string
  nome: string
  horario_limite: string
  preco_por_refeicao: number
  ativa: boolean
  formato: 'marmita' | 'buffet'
}

/* ── Link de convite ─────────────────────────────────────── */
function LinkConvite({ restId }: { restId: string }) {
  const toast = useToast()
  const [copied, setCopied] = useState(false)

  const link = typeof window !== 'undefined'
    ? `${window.location.origin}/cadastro?tipo=gestor&ref=${restId}`
    : ''

  function copiar() {
    navigator.clipboard.writeText(link)
    setCopied(true)
    toast('Link copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <p className="font-[var(--mono)] text-[10px] text-[#3d5875] uppercase tracking-[1px] mb-1">
        Link de convite para gestores
      </p>
      <p className="font-[var(--mono)] text-[10px] text-[#3d5875] mb-3">
        Partilhe com gestores para que criem conta e cadastrem a empresa.
      </p>
      <div className="flex gap-2 items-center">
        <div className="flex-1 bg-[#080c14] border border-[#1c2e48] rounded-[7px] px-2.5 py-2 font-[var(--mono)] text-xs text-[#7a96b8] truncate">
          {link}
        </div>
        <button
          onClick={copiar}
          className={`flex-shrink-0 rounded-[7px] px-3 py-2 font-[var(--mono)] text-xs cursor-pointer transition-all border
            ${copied
              ? 'bg-[rgba(0,232,122,.15)] border-[rgba(0,232,122,.4)] text-[#00e87a]'
              : 'bg-[rgba(0,232,122,.08)] border-[rgba(0,232,122,.2)] text-[#00e87a] hover:bg-[rgba(0,232,122,.15)]'
            }`}>
          {copied ? '✓ Copiado' : 'Copiar'}
        </button>
      </div>
    </Card>
  )
}

/* ── Empresa Form ────────────────────────────────────────── */
function EmpresaForm({ empresa, restId, onSave, onCancel }: {
  empresa?: Empresa | null; restId: string; onSave: () => void; onCancel: () => void
}) {
  const { call } = useApi()
  const toast = useToast()
  const [nome,    setNome]    = useState(empresa?.nome ?? '')
  const [hl,      setHl]      = useState(empresa?.horario_limite ?? '09:30')
  const [preco,   setPreco]   = useState(String(empresa?.preco_por_refeicao ?? '15.00'))
  const [formato, setFormato] = useState<'marmita' | 'buffet'>(empresa?.formato ?? 'marmita')
  const [saving,  setSaving]  = useState(false)

  async function save() {
    if (!nome.trim()) { toast('Nome é obrigatório.', 'error'); return }
    setSaving(true)
    const isEdit = !!empresa?.id
    const res = await call(isEdit ? `/api/empresas/${empresa!.id}` : '/api/empresas', {
      method: isEdit ? 'PUT' : 'POST',
      body: JSON.stringify({ nome, horarioLimite: hl, preco: parseFloat(preco) || 15, restauranteId: restId, formato }),
    })
    setSaving(false)
    if (res.success) { toast(isEdit ? 'Empresa atualizada.' : 'Empresa criada.'); onSave() }
    else toast(res.error, 'error')
  }

  return (
    <div className="flex flex-col gap-4">
      <Input label="Nome da empresa" value={nome} onChange={e => setNome(e.target.value)} placeholder="Empresa Ltda." />
      <Input label="Horário limite (HH:MM)" value={hl} onChange={e => setHl(e.target.value)} placeholder="09:30" />
      <Input label="Preço por refeição (R$)" value={preco} onChange={e => setPreco(e.target.value)} placeholder="15.00" type="number" step="0.01" />

      {/* Formato de entrega */}
      <div>
        <p className="font-[var(--mono)] text-[10px] text-[#3d5875] uppercase tracking-[1px] mb-2">
          Formato de entrega
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(['marmita', 'buffet'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFormato(f)}
              className={`py-2.5 rounded-[8px] font-[var(--mono)] text-xs uppercase tracking-[1px] border transition-all
                ${formato === f
                  ? 'bg-[rgba(0,232,122,.1)] border-[rgba(0,232,122,.4)] text-[#00e87a]'
                  : 'bg-transparent border-[#253d5e] text-[#3d5875] hover:border-[#3d5875]'
                }`}>
              {f === 'marmita' ? '🍱 Marmita' : '🍽️ Buffet'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Btn variant="secondary" onClick={onCancel}>Cancelar</Btn>
        <Btn loading={saving} onClick={save}>Salvar</Btn>
      </div>
    </div>
  )
}

/* ── Main ────────────────────────────────────────────────── */
export default function EmpresasPane({ restId }: { restId: string }) {
  const { call } = useApi()
  const toast = useToast()
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState<Empresa | null>(null)

  async function load() {
    const res = await call<Empresa[]>(`/api/empresas?restauranteId=${restId}`)
    if (res.success) setEmpresas(res.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [restId])

  async function desativar(id: string) {
    if (!confirm('Desativar esta empresa?')) return
    const res = await call(`/api/empresas/${id}`, { method: 'DELETE' })
    if (res.success) { toast('Empresa desativada.'); load() }
    else toast(res.error, 'error')
  }

  if (loading) return <Spinner />

  return (
    <div className="px-4 pt-4 pb-24">
      <LinkConvite restId={restId} />

      <SectionLabel>Empresas cadastradas</SectionLabel>

      {empresas.length === 0 && (
        <Card>
          <p className="text-center font-[var(--mono)] text-xs text-[#3d5875] py-4">
            Nenhuma empresa cadastrada. Partilhe o link acima com os gestores.
          </p>
        </Card>
      )}

      {empresas.map(e => (
        <Card key={e.id}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="font-bold text-sm text-[#ddeaf8]">{e.nome}</p>
              <p className="font-[var(--mono)] text-[10px] text-[#3d5875] mt-0.5">
                Limite: {e.horario_limite} · R$ {Number(e.preco_por_refeicao).toFixed(2)}/refeição
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge color="green">Ativa</Badge>
              <Badge color={e.formato === 'buffet' ? 'blue' : 'gray'}>
                {e.formato === 'buffet' ? '🍽️ Buffet' : '🍱 Marmita'}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Btn size="sm" variant="secondary" className="w-auto" onClick={() => setModal(e)}>Editar</Btn>
            <Btn size="sm" variant="danger" className="w-auto" onClick={() => desativar(e.id)}>Desativar</Btn>
          </div>
        </Card>
      ))}

      <Modal open={!!modal} onClose={() => setModal(null)} title={`Editar: ${modal?.nome}`}>
        <EmpresaForm
          empresa={modal}
          restId={restId}
          onSave={() => { setModal(null); load() }}
          onCancel={() => setModal(null)}
        />
      </Modal>
    </div>
  )
}
