'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useApi } from '@/lib/use-api'
import { useToast } from '@/components/ui'
import { AppShell } from '@/components/layout/AppShell'
import { Card, SectionLabel, Badge, Btn, Modal, Input, Spinner } from '@/components/ui'
import RelatorioGestorPane from './RelatorioGestorPane'
import ProdutosGestorPane from './ProdutosGestorPane'
import PedidoGestorPane from './PedidoGestorPane'
import PedidosContent from '@/app/(app)/pedidos/PedidosContent'

/* ── Início ──────────────────────────────────────────────── */
function InicioPane({ empresaId }: { empresaId: string }) {
  const { call } = useApi()
  const toast    = useToast()
  const [colabs,        setColabs]        = useState<any[]>([])
  const [pedidosSemana, setPedidosSemana] = useState<Record<string, any[]>>({})
  const [empresa,       setEmpresa]       = useState<any>(null)
  const [loading,       setLoading]       = useState(true)
  const [diaSel,        setDiaSel]        = useState('')
  const [extLoading,    setExtLoading]    = useState(false)
  const [extensaoAte,   setExtensaoAte]   = useState<Date | null>(null)
  const [agora,         setAgora]         = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 10_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => { load() }, [empresaId])

  async function load() {
    const hoje = new Date()
    // Calcula seg-sex da semana atual
    const diaSemana = hoje.getDay() === 0 ? 6 : hoje.getDay() - 1 // 0=seg
    const seg = new Date(hoje); seg.setDate(hoje.getDate() - diaSemana)
    const sex = new Date(seg);  sex.setDate(seg.getDate() + 4)
    const fmt = (d: Date) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
    const fmtISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

    // Seleciona hoje por padrão
    const hojeStr = fmt(hoje)
    setDiaSel(hojeStr)

    try {
      const [colabsRes, pedidosRes, empRes] = await Promise.all([
        call<any[]>(`/api/colaboradores?empresaId=${empresaId}`),
        call<any[]>(`/api/pedidos?empresaId=${empresaId}&dataInicio=${fmt(seg)}&dataFim=${fmt(sex)}`),
        call<any>(`/api/empresas/${empresaId}`),
      ])
      setColabs(colabsRes.success ? colabsRes.data : [])
      if (pedidosRes.success) {
        // Agrupa por data
        const map: Record<string, any[]> = {}
        pedidosRes.data.forEach((p: any) => {
          const raw = p.data_pedido ?? p.data ?? ''
          const parts = raw.split('-')
          const key = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : raw
          if (!map[key]) map[key] = []
          map[key].push(p)
        })
        setPedidosSemana(map)
      }
      if (empRes.success) {
        const emp = empRes.data?.[0] ?? empRes.data
        setEmpresa(emp)
        if (emp?.extensao_ate) setExtensaoAte(new Date(emp.extensao_ate))
      }
    } catch(e) {
      console.error('InicioPane load error:', e)
    } finally {
      setLoading(false)
    }
  }

  async function liberarExtensao() {
    setExtLoading(true)
    const r = await call<any>(`/api/empresas/${empresaId}/extensao`, { method: 'POST' })
    setExtLoading(false)
    if (r.success) {
      setExtensaoAte(new Date(r.data.extensao_ate))
      toast('Pedidos liberados por mais 5 minutos!')
    } else {
      toast(r.error ?? 'Erro ao liberar extensão.', 'error')
    }
  }

  // Lógica de horário
  const horarioLimite = empresa?.horario_limite ?? '09:30'
  const [hlH, hlM] = horarioLimite.split(':').map(Number)
  const limite = new Date(agora); limite.setHours(hlH, hlM, 0, 0)
  const limite5min = new Date(limite.getTime() + 5 * 60_000)  // +5min para liberar
  const limite10min = new Date(limite.getTime() + 10 * 60_000) // +10min bloqueio total

  const passou        = agora > limite
  const apos5min      = agora > limite5min
  const extensaoAtiva = extensaoAte !== null && agora < extensaoAte
  const definitBloq   = agora > limite10min || (extensaoAte !== null && agora > extensaoAte)
  // Gestor pode liberar somente depois dos 5min de espera, e se extensão ainda não foi usada
  const podeLiberarExt = apos5min && extensaoAte === null

  if (loading) return <Spinner />

  return (
    <div className="px-4 pt-4 pb-24">

      {/* Banner de horário */}
      {passou && (
        <div className={`rounded-[11px] border px-4 py-3 mb-4 flex flex-col gap-2
          ${definitBloq
            ? 'border-[rgba(255,77,106,.3)] bg-[rgba(255,77,106,.06)]'
            : extensaoAtiva
              ? 'border-[rgba(255,179,64,.3)] bg-[rgba(255,179,64,.06)]'
              : 'border-[#1c2e48] bg-[#0d1525]'
          }`}>
          <div className="flex items-center justify-between gap-2">
            <p className={`font-[var(--mono)] text-[11px] font-bold
              ${definitBloq ? 'text-[#ff4d6a]' : extensaoAtiva ? 'text-[#ffb340]' : 'text-[#7a96b8]'}`}>
              {definitBloq
                ? '🔴 Pedidos encerrados definitivamente'
                : extensaoAtiva
                  ? `⏳ Extensão ativa até ${extensaoAte?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                  : `⏸️ Pedidos encerrados às ${horarioLimite}`}
            </p>
            {podeLiberarExt && (
              <Btn size="sm" className="w-auto flex-shrink-0" loading={extLoading}
                onClick={liberarExtensao}>
                +5 min
              </Btn>
            )}
          </div>
          {!apos5min && !extensaoAtiva && !definitBloq && (
            <p className="font-[var(--mono)] text-[10px] text-[#3d5875]">
              Você poderá liberar +5 min às {limite5min.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      )}

      {/* Card colaboradores */}
      <div className="bg-[#0d1525] border border-[#1c2e48] rounded-[11px] p-3 text-center mb-4">
        <div className="text-2xl font-black font-[var(--mono)] text-[#00e87a]">{colabs.length}</div>
        <div className="font-[var(--mono)] text-[10px] tracking-[1px] text-[#3d5875] uppercase mt-0.5">Colaboradores</div>
      </div>

      {/* Pedidos da semana */}
      <p className="font-[var(--mono)] text-[10px] text-[#3d5875] uppercase tracking-[1px] mb-2">Pedidos da semana</p>

      {/* Seletor de dias */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
        {(() => {
          const hoje = new Date()
          const diaSemana = hoje.getDay() === 0 ? 6 : hoje.getDay() - 1
          const seg = new Date(hoje); seg.setDate(hoje.getDate() - diaSemana)
          const DIAS = ['Seg','Ter','Qua','Qui','Sex']
          return DIAS.map((nome, i) => {
            const d = new Date(seg); d.setDate(seg.getDate() + i)
            const key = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
            const count = pedidosSemana[key]?.length ?? 0
            const isSelected = diaSel === key
            return (
              <button key={key} onClick={() => setDiaSel(key)}
                className={`flex-shrink-0 rounded-[10px] border px-3 py-2 text-center transition-all cursor-pointer
                  ${isSelected ? 'border-[rgba(0,232,122,.4)] bg-[rgba(0,232,122,.06)]' : 'border-[#1c2e48] bg-[#0d1525]'}`}>
                <p className="font-[var(--mono)] text-[9px] text-[#3d5875] uppercase">{nome}</p>
                <p className={`font-[var(--mono)] text-lg font-black ${isSelected ? 'text-[#00e87a]' : 'text-[#ddeaf8]'}`}>{d.getDate()}</p>
                {count > 0 && <p className="font-[var(--mono)] text-[9px] text-[#4da6ff]">{count} ped.</p>}
              </button>
            )
          })
        })()}
      </div>

      {/* Lista de pedidos do dia selecionado */}
      {(pedidosSemana[diaSel] ?? []).length > 0 ? (
        <div className="flex flex-col gap-2">
          {(pedidosSemana[diaSel] ?? []).map((p: any) => (
            <div key={p.id} className="bg-[#0d1525] border border-[#1c2e48] rounded-[8px] px-3 py-2.5">
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-sm text-[#ddeaf8]">{p.colaboradorNome}</p>
                <Badge color={
                  p.status === 'despachado' || p.status === 'confirmado' ? 'green' :
                  p.status === 'separado' ? 'blue' : 'gray'
                }>
                  {p.status === 'despachado' ? 'Despachado' :
                   p.status === 'confirmado' ? 'Confirmado' :
                   p.status === 'separado'   ? 'Separado'   : 'Em aberto'}
                </Badge>
              </div>
              {p.itens?.length > 0 && (
                <p className="font-[var(--mono)] text-[10px] text-[#7a96b8]">{p.itens.join(', ')}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#0d1525] border border-[#1c2e48] rounded-[11px] p-4 text-center">
          <p className="font-[var(--mono)] text-xs text-[#3d5875]">Nenhum pedido neste dia.</p>
        </div>
      )}
    </div>
  )
}

/* ── Colaboradores ───────────────────────────────────────── */
function ColabsPane({ empresaId }: { empresaId: string }) {
  const { call } = useApi()
  const toast    = useToast()
  const [colabs,  setColabs]  = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState<any>(null)
  const [form,    setForm]    = useState({ nome: '', email: '', senha: '', isGestor: false })
  const [saving,  setSaving]  = useState(false)
  const [copied,  setCopied]  = useState(false)

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

  async function excluir(id: string, nome: string) {
    if (!confirm(`Excluir permanentemente ${nome}? Esta ação não pode ser desfeita.`)) return
    const res = await call(`/api/colaboradores/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ permanent: true }),
    })
    if (res.success) { toast('Colaborador excluído.'); load() }
    else toast(res.error ?? 'Erro ao excluir.', 'error')
  }

  if (loading) return <Spinner />

  return (
    <div className="px-4 pt-4 pb-24">
      <Card>
        <p className="font-[var(--mono)] text-[10px] text-[#3d5875] uppercase tracking-[1px] mb-1">Link de convite</p>
        <p className="font-[var(--mono)] text-[10px] text-[#3d5875] mb-3">
          Partilhe com colaboradores para que criem a sua conta.
        </p>
        <div className="flex gap-2 items-center">
          <div className="flex-1 bg-[#080c14] border border-[#1c2e48] rounded-[7px] px-2.5 py-2 font-[var(--mono)] text-xs text-[#7a96b8] truncate">
            {link}
          </div>
          <button onClick={copiarLink}
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
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-bold text-sm text-[#ddeaf8] truncate">{c.nome}</p>
          <Badge color={c.is_gestor ? 'blue' : 'gray'}>
            {c.is_gestor ? 'Gestor' : 'Colaborador'}
          </Badge>
        </div>
        <p className="font-[var(--mono)] text-[10px] text-[#3d5875] mt-0.5 truncate">{c.email}</p>
      </div>
      <div className="flex gap-1.5 flex-shrink-0">
        <Btn size="sm" variant="secondary" className="w-auto"
          onClick={() => { setModal(c); setForm({ nome: c.nome, email: c.email, senha: '', isGestor: c.is_gestor }) }}>
          Editar
        </Btn>
        <Btn size="sm" variant="danger" className="w-auto" onClick={() => inativar(c.id)}>
          Inativar
        </Btn>
        <Btn size="sm" variant="danger" className="w-auto" onClick={() => excluir(c.id, c.nome)}>
          Excluir
        </Btn>
      </div>
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

/* ── Main ────────────────────────────────────────────────── */
export default function GestorEmpresaPage() {
  const params       = useParams()
  const { meta }     = useAuth()
  const { call }     = useApi()
  const empresaId    = params.empresaId as string
  const isAdmin      = meta?.app_role === 'admin'
  const isRestaurante = meta?.app_role === 'restaurante'
  const [gestorColabId, setGestorColabId] = useState<string | null>(null)

  useEffect(() => {
    // Para admin/restaurante: busca o colaborador gestor da empresa
    if (isAdmin || isRestaurante) {
      call<any[]>(`/api/colaboradores?empresaId=${empresaId}`).then(r => {
        if (r.success) {
          const gestor = r.data.find((c: any) => c.is_gestor)
          if (gestor) setGestorColabId(gestor.id)
        }
      })
    }
  }, [empresaId])

  const tabs = [
    { id: 'inicio',        label: 'Início',        icon: 'home'      as const, component: <InicioPane empresaId={empresaId} /> },
    ...(!isAdmin ? [{ id: 'pedido', label: 'Meu Pedido', icon: 'pedido' as const, component: <PedidosContent /> }] : []),
    { id: 'colaboradores', label: 'Colaboradores', icon: 'colabs'    as const, component: <ColabsPane empresaId={empresaId} /> },
    { id: 'produtos',      label: 'Produtos',      icon: 'grade'     as const, component: <ProdutosGestorPane  empresaId={empresaId} /> },
    { id: 'relatorio',     label: 'Relatório',     icon: 'relatorio' as const, component: <RelatorioGestorPane empresaId={empresaId} /> },
  ]

  return (
    <>
      {isAdmin && (
        <div className="bg-[rgba(255,179,64,.07)] border-b border-[rgba(255,179,64,.2)] px-4 py-2 flex items-center justify-between">
          <p className="font-[var(--mono)] text-[10px] text-[#ffb340]">👁️ Modo admin — a visualizar como gestor</p>
          <button
            onClick={() => window.location.href = '/admin'}
            className="font-[var(--mono)] text-[10px] text-[#ffb340] cursor-pointer border border-[rgba(255,179,64,.3)] rounded-[6px] px-2 py-0.5">
            ← Voltar
          </button>
        </div>
      )}
      <AppShell tabs={tabs} nome={meta?.nome ?? 'Menuv'} badge="gestor" role="Gestor" subInfo={meta?.empresa_nome} />
    </>
  )
}
