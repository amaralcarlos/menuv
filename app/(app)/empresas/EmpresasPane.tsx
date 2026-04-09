'use client'
import { useEffect, useState } from 'react'
import { useApi } from '@/lib/use-api'
import { useToast } from '@/components/ui'
import { Card, SectionLabel, Badge, Btn, Modal, Input, Spinner } from '@/components/ui'

interface Empresa { id: string; nome: string; horario_limite: string; preco_por_refeicao: number; ativa: boolean }

function EmpresaForm({ empresa, restId, onSave, onCancel }: {
  empresa?: Empresa | null; restId: string; onSave: () => void; onCancel: () => void
}) {
  const { call } = useApi()
  const toast = useToast()
  const [nome,  setNome]  = useState(empresa?.nome ?? '')
  const [hl,    setHl]    = useState(empresa?.horario_limite ?? '09:30')
  const [preco, setPreco] = useState(String(empresa?.preco_por_refeicao ?? '15.00'))
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!nome.trim()) { toast('Nome é obrigatório.', 'error'); return }
    setSaving(true)
    const isEdit = !!empresa?.id
    const res = await call(isEdit ? `/api/empresas/${empresa!.id}` : '/api/empresas', {
      method: isEdit ? 'PUT' : 'POST',
      body: JSON.stringify({ nome, horarioLimite: hl, preco: parseFloat(preco) || 15, restauranteId: restId }),
    })
    setSaving(false)
    if (res.success) { toast(isEdit ? 'Empresa atualizada.' : 'Empresa criada.'); onSave() }
    else toast(res.error, 'error')
  }

  return (
    <div className="flex flex-col gap-4">
      <Input label="Nome da empresa" value={nome} onChange={e => setNome(e.target.value)} placeholder="Empresa Ltda." />
      <Input label="Horário limite (HH:MM)" value={hl}    onChange={e => setHl(e.target.value)}    placeholder="09:30" />
      <Input label="Preço por refeição (R$)" value={preco} onChange={e => setPreco(e.target.value)} placeholder="15.00" type="number" step="0.01" />
      <div className="flex gap-2">
        <Btn variant="secondary" onClick={onCancel}>Cancelar</Btn>
        <Btn loading={saving} onClick={save}>Salvar</Btn>
      </div>
    </div>
  )
}

export default function EmpresasPane({ restId }: { restId: string }) {
  const { call } = useApi()
  const toast = useToast()
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Empresa | 'new' | null>(null)

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
      <div className="flex items-center justify-between mb-4">
        <SectionLabel>Empresas</SectionLabel>
        <Btn size="sm" className="w-auto" onClick={() => setModal('new')}>+ Nova</Btn>
      </div>

      {empresas.length === 0 && (
        <Card><p className="text-center font-[var(--mono)] text-xs text-[#3d5875] py-4">Nenhuma empresa cadastrada.</p></Card>
      )}

      {empresas.map(e => (
        <Card key={e.id}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="font-bold text-sm text-[#ddeaf8]">{e.nome}</p>
              <p className="font-[var(--mono)] text-[10px] text-[#3d5875] mt-0.5">
                Limite: {e.horario_limite} · R$ {Number(e.preco_por_refeicao).toFixed(2)}/refeição
              </p>
              <p className="font-[var(--mono)] text-[9px] text-[#1c2e48] mt-0.5 break-all">ID: {e.id}</p>
            </div>
            <Badge color="green">Ativa</Badge>
          </div>
          <div className="flex gap-2">
            <Btn size="sm" variant="secondary" className="w-auto" onClick={() => setModal(e)}>Editar</Btn>
            <Btn size="sm" variant="danger" className="w-auto" onClick={() => desativar(e.id)}>Remover</Btn>
          </div>
        </Card>
      ))}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'new' ? 'Nova empresa' : `Editar: ${(modal as Empresa)?.nome}`}
      >
        <EmpresaForm
          empresa={modal === 'new' ? null : modal as Empresa}
          restId={restId}
          onSave={() => { setModal(null); load() }}
          onCancel={() => setModal(null)}
        />
      </Modal>
    </div>
  )
}
