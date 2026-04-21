'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useApi } from '@/lib/use-api'
import { useToast } from '@/components/ui'
import { AppShell } from '@/components/layout/AppShell'
import { Card, SectionLabel, Badge, Btn, Modal, Input, Spinner } from '@/components/ui'

/* ── Início ──────────────────────────────────────────────── */
function InicioPane({ empresaId }: { empresaId: string }) {
  const { call } = useApi()
  const [stats, setStats] = useState({ colabs: 0, pedidosHoje: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const hoje = new Date()
    const dataStr = `${String(hoje.getDate()).padStart(2,'0')}/${String(hoje.getMonth()+1).padStart(2,'0')}/${hoje.getFullYear()}`
    Promise.all([
      call<any[]>(`/api/colaboradores?empresaId=${empresaId}`),
      call<any[]>(`/api/pedidos?empresaId=${empresaId}&data=${dataStr}`),
    ]).then(([colabsRes, pedidosRes]) => {
      setStats({
        colabs:      colabsRes.success ? colabsRes.data.length : 0,
        pedidosHoje: pedidosRes.success ? pedidosRes.data.length : 0,
      })
      setLoading(false)
    })
  }, [empresaId])

  if (loading) return <Spinner />

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {[
          { label: 'Colaboradores', value: stats.colabs,      color: 'text-[#00e87a]' },
          { label: 'Pedidos hoje',  value: stats.pedidosHoje, color: 'text-[#4da6ff]' },
        ].map(s => (
          <div key={s.label} className="bg-[#0d1525] border border-[#1c2e48] rounded-[11px] p-3 text-center">
            <div className={`text-2xl font-black font-[var(--mono)] ${s.color}`}>{s.value}</div>
            <div className="font-[var(--mono)] text-[10px] tracking-[1px] text-[#3d5875] uppercase mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Colaboradores ───────────────────────────────────────── */
function ColabsPane({ empresaId }: { empresaId: string }) {
  const { call } = useApi()
  const toast = useToast()
  const [colabs, setColabs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<any>(null)
  const [form, setForm] = useState({ nome: '', email: '', senha: '', isGestor: false })
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const link = typeof window !== 'undefined'
    ? `${window.location.origin}/cadastro?tipo=colaborador&emp=${empresaId}`
    : ''

  function copiarLink() {
    navigator.clipboard.writeText(link)
    setCopied(true)
    toast('Link copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  async function load() {
    const r = await call<any[]>(`/api/colaboradores?empresaId=${empresaId}`)
    if (r.success) setColabs(r.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [empresaId])

  async function salvar() {
    if (!form.nome || !form.email) { toast('Preencha nome e e-mail.', 'error'); return }
    setSaving(true)
    const isEdit = modal?.id
    const res = await call(
      isEdit ? `/api/colaboradores/${modal.id}` : '/api/colaboradores',
      {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(isEdit
          ? { nome: form.nome, isGestor: form.isGestor }
          : { nome: form.nome, email: form.email, senha: form.senha, empresaId, isGestor: form.isGestor }
        ),
      }
    )
    setSaving(false)
    if (res.success) { toast(isEdit ? 'Colaborador atualizado.' : 'Colaborador criado.'); setModal(null); load() }
    else toast(res.error, 'error')
  }

  async function inativar(id: string) {
    if (!confirm('Inativar este colaborador?')) return
    const res = await call(`/api/colaboradores/${id}`, { method: 'DELETE' })
    if (res.success) { toast('Colaborador inativado.'); load() }
    else toast(res.error, 'error')
  }

  if (loading) return <Spinner />

  return (
    <div className="px-4 pt-4 pb-24">

      {/* Link de convite no topo */}
      <Card>
        <p className="font-[var(--mono)] text-[10px] text-[#3d5875] uppercase tracking-[1px] mb-1">
          Link de convite
        </p>
        <p className="font-[var(--mono)] text-[10px] text-[#3d5875] mb-3">
          Partilhe com colaboradores para que criem a sua conta.
        </p>
        <div className="flex gap-2 items-center">
          <div className="flex-1 bg-[#080c14] border border-[#1c2e48] rounded-[7px] px-2.5 py-2 font-[var(--mono)] text-xs text-[#7a96b8] truncate">
            {link}
          </div>
          <button
            onClick={copiarLink}
            className={`flex-shrink-0 rounded-[7px] px-3 py-2 font-[var(--mono)] text-xs cursor-pointer transition-all border
              ${copied
                ? 'bg-[rgba(0,232,122,.15)] border-[rgba(0,232,122,.4)] text-[#00e87a]'
                : 'bg-[rgba(0,232,122,.08)] border-[rgba(0,232,122,.2)] text-[#00e87a] hover:bg-[rgba(0,232,122,.15)]'
              }`}>
            {copied ? '✓ Copiado' : 'Copiar'}
          </button>
        </div>
      </Card>

      <div className="flex items-center justify-between mb-2 mt-4">
        <SectionLabel>Colaboradores</SectionLabel>
        <Btn size="sm" className="w-auto"
          onClick={() => { setModal({}); setForm({ nome: '', email: '', senha: '', isGestor: false }) }}>
          + Novo
        </Btn>
      </div>

      {colabs.length === 0 && (
        <Card><p className="text-center font-[var(--mono)] text-xs text-[#3d5875] py-4">Nenhum colaborador ainda.</p></Card>
      )}

      {colabs.map(c => (
        <Card key={c.id}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-bold text-sm text-[#ddeaf8]">{c.nome}</p>
              <p className="font-[var(--mono)] text-[10px] text-[#3d5875] mt-0.5">{c.email}</p>
            </div>
            <Badge color={c.is_gestor ? 'blue' : 'gray'}>
              {c.is_gestor ? 'Gestor' : 'Colaborador'}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Btn size="sm" variant="secondary" className="w-auto"
              onClick={() => { setModal(c); setForm({ nome: c.nome, email: c.email, senha: '', isGestor: c.is_gestor }) }}>
              Editar
            </Btn>
            <Btn size="sm" variant="danger" className="w-auto" onClick={() => inativar(c.id)}>
              Inativar
            </Btn>
          </div>
        </Card>
      ))}

      <Modal open={!!modal} onClose={() => setModal(null)}
        title={modal?.id ? `Editar: ${modal.nome}` : 'Novo colaborador'}>
        <div className="flex flex-col gap-4">
          <Input label="Nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="João Silva" />
          {!modal?.id && (
            <>
              <Input label="E-mail" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="joao@empresa.com" />
              <Input label="Senha" type="password" value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} placeholder="Mínimo 4 caracteres" />
            </>
          )}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setForm(f => ({ ...f, isGestor: !f.isGestor }))}>
            <div className={`w-5 h-5 rounded-[4px] border flex items-center justify-center flex-shrink-0 transition-all
              ${form.isGestor ? 'bg-[#00e87a] border-[#00e87a]' : 'border-[#253d5e]'}`}>
              {form.isGestor && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#003320" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
            <span className="font-[var(--mono)] text-xs text-[#7a96b8]">É gestor de empresa</span>
          </div>
          <Btn loading={saving} onClick={salvar}>Salvar</Btn>
        </div>
      </Modal>
    </div>
  )
}

/* ── Relatório ───────────────────────────────────────────── */
function RelatorioPane({ empresaId }: { empresaId: string }) {
  const { call } = useApi()
  const [dados, setDados] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const hoje = new Date()
  const [mesAno, setMesAno] = useState(`${String(hoje.getMonth()+1).padStart(2,'0')}/${hoje.getFullYear()}`)

  async function buscar() {
    setLoading(true)
    const r = await call<any>(`/api/relatorio/empresa?empresaId=${empresaId}&mesAno=${mesAno}`)
    if (r.success) setDados(r.data)
    setLoading(false)
  }

  useEffect(() => { buscar() }, [])

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex gap-2 mb-4 items-end">
        <div className="flex-1">
          <Input label="Mês/Ano (MM/AAAA)" value={mesAno} onChange={e => setMesAno(e.target.value)} placeholder="04/2025" />
        </div>
        <Btn size="sm" className="w-auto" onClick={buscar} loading={loading}>Buscar</Btn>
      </div>

      {dados && (
        <>
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <div className="bg-[#0d1525] border border-[#1c2e48] rounded-[11px] p-3 text-center">
              <div className="text-2xl font-black font-[var(--mono)] text-[#4da6ff]">{dados.totalPedidos}</div>
              <div className="font-[var(--mono)] text-[10px] tracking-[1px] text-[#3d5875] uppercase mt-0.5">Pedidos</div>
            </div>
            <div className="bg-[#0d1525] border border-[#1c2e48] rounded-[11px] p-3 text-center">
              <div className="text-2xl font-black font-[var(--mono)] text-[#00e87a]">
                {Number(dados.valorTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <div className="font-[var(--mono)] text-[10px] tracking-[1px] text-[#3d5875] uppercase mt-0.5">Total</div>
            </div>
          </div>

          <SectionLabel>Por colaborador</SectionLabel>
          {(dados.colaboradores ?? []).map((c: any) => (
            <Card key={c.nome}>
              <div className="flex justify-between">
                <span className="text-sm text-[#ddeaf8]">{c.nome}</span>
                <div className="text-right">
                  <div className="font-[var(--mono)] text-sm font-bold text-[#00e87a]">{c.total}x</div>
                  <div className="font-[var(--mono)] text-[10px] text-[#3d5875]">
                    {Number(c.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </>
      )}
    </div>
  )
}

/* ── Main ────────────────────────────────────────────────── */
export default function GestorEmpresaPage() {
  const params = useParams()
  const { meta } = useAuth()
  const empresaId = params.empresaId as string

  const tabs = [
    { id: 'inicio',        label: 'Início',       icon: 'home'      as const, component: <InicioPane empresaId={empresaId} /> },
    { id: 'colaboradores', label: 'Colaboradores', icon: 'colabs'    as const, component: <ColabsPane empresaId={empresaId} /> },
    { id: 'relatorio',     label: 'Relatório',     icon: 'relatorio' as const, component: <RelatorioPane empresaId={empresaId} /> },
  ]

  return <AppShell tabs={tabs} nome={meta?.nome ?? 'Menuv'} badge="gestor" role="Gestor" />
  )
}
