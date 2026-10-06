/* ── Colaboradores ───────────────────────────────────────── */
// Adicione no topo do arquivo: import { useCallback, useMemo } from 'react'
// (junto do import existente de useEffect/useRef/useState)

const iconProps = {
  width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
}
const IconPlus = () => (<svg {...iconProps}><path d="M12 5v14M5 12h14" /></svg>)
const IconDots = () => (<svg {...iconProps}><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></svg>)
const IconEdit = () => (<svg {...iconProps}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>)
const IconPause = () => (<svg {...iconProps}><path d="M4 6h10M18 6h2M4 18h2M10 18h10" /><circle cx="16" cy="6" r="2" /><circle cx="8" cy="18" r="2" /></svg>)
const IconTrash = () => (<svg {...iconProps}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>)

function iniciais(nome: string) {
  const p = (nome ?? '').trim().split(/\s+/).filter(Boolean)
  if (p.length === 0) return '?'
  return ((p[0][0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()
}

const FORM_VAZIO = { nome: '', email: '', senha: '', isGestor: false, isAssistente: false }

function ColabsPane({ empresaId }: { empresaId: string }) {
  const { call } = useApi()
  const toast    = useToast()
  const [colabs,     setColabs]     = useState<any[]>([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState<any>(null)
  const [form,       setForm]       = useState(FORM_VAZIO)
  const [saving,     setSaving]     = useState(false)
  const [relModal,   setRelModal]   = useState<any>(null)
  const [busca,      setBusca]      = useState('')
  const [relInicio,  setRelInicio]  = useState('')
  const [relFim,     setRelFim]     = useState('')
  const [relLoading, setRelLoading] = useState(false)
  const [menuAberto, setMenuAberto] = useState<string | null>(null)

  const load = useCallback(async () => {
    const r = await call<any[]>(`/api/colaboradores?empresaId=${empresaId}&incluirInativos=true`)
    if (r.success) setColabs(r.data)
    setLoading(false)
  }, [empresaId])

  useEffect(() => { load() }, [load])

  // Fecha o menu "…" com ESC
  useEffect(() => {
    if (!menuAberto) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuAberto(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuAberto])

  const colabsFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return colabs
    return colabs.filter(c =>
      (c.nome ?? '').toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q)
    )
  }, [colabs, busca])

  function abrirNovo() {
    setForm(FORM_VAZIO)
    setModal({})
  }

  function abrirEditar(c: any) {
    setMenuAberto(null)
    setForm({ nome: c.nome, email: c.email, senha: '', isGestor: c.is_gestor, isAssistente: c.is_assistente ?? false })
    setModal(c)
  }

  async function gerarRelatorioColab() {
    if (!relInicio || !relFim) { toast('Selecione o período.', 'error'); return }
    setRelLoading(true)
    const ini = relInicio.split('-').reverse().join('/')
    const fim = relFim.split('-').reverse().join('/')
    const res = await call<any[]>(`/api/pedidos?empresaId=${empresaId}&colaboradorId=${relModal.id}&dataInicio=${ini}&dataFim=${fim}`)
    setRelLoading(false)
    if (!res.success) { toast('Erro ao buscar pedidos.', 'error'); return }

    const pedidos = res.data
    if (pedidos.length === 0) { toast('Nenhum pedido neste período.', 'error'); return }

    const empRes = await call<any[]>(`/api/empresas/${empresaId}/produtos`)
    const subsidioMap: Record<string, number> = {}
    const precoMap: Record<string, number> = {}
    if (empRes.success) {
      empRes.data.forEach((ep: any) => {
        subsidioMap[ep.produto?.id ?? ''] = Number(ep.subsidio ?? 0)
        precoMap[ep.produto?.id ?? ''] = Number(ep.preco ?? 0)
      })
    }

    const pedsByDay: Record<string, any[]> = {}
    pedidos.forEach((p: any) => {
      if (!pedsByDay[p.data]) pedsByDay[p.data] = []
      pedsByDay[p.data].push(p)
    })

    let totalBruto = 0, totalSub = 0
    const linhas = pedidos.sort((a: any, b: any) => a.data.localeCompare(b.data)).map((p: any) => {
      const dayPeds = pedsByDay[p.data] ?? []
      const idx     = dayPeds.indexOf(p)
      const preco   = precoMap[p.produto_id ?? ''] ?? 0
      const sub     = idx === 0 ? (subsidioMap[p.produto_id ?? ''] ?? 0) : 0
      const colab   = Math.max(0, preco - sub)
      totalBruto += preco; totalSub += sub
      const [y,m,d] = p.data.split('-')
      return `<tr><td style="padding:5px 8px;font-size:11px;color:#555">${d}/${m}/${y}</td><td style="padding:5px 8px;font-size:11px">${(p.itens ?? []).join(', ')}</td><td style="padding:5px 8px;font-size:11px;text-align:right">R$ ${preco.toFixed(2)}</td><td style="padding:5px 8px;font-size:11px;text-align:right;color:#00994d">R$ ${sub.toFixed(2)}</td><td style="padding:5px 8px;font-size:11px;text-align:right;color:#e02424;font-weight:700">R$ ${colab.toFixed(2)}</td></tr>`
    }).join('')

    const totalColab = Math.max(0, totalBruto - totalSub)
    const hoje = new Date().toLocaleDateString('pt-BR')
    const [iy,im,id2] = relInicio.split('-'); const [fy,fm,fd] = relFim.split('-')
    const periodoStr = `${id2}/${im}/${iy} a ${fd}/${fm}/${fy}`

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Débitos — ${relModal.nome}</title>
    <style>body{font-family:Arial,sans-serif;padding:28px;color:#111}h2{font-size:18px;margin-bottom:4px}.sub{font-size:12px;color:#666;margin-bottom:20px}.boxes{display:flex;gap:12px;margin-bottom:20px}.box{flex:1;border:1px solid #ddd;border-radius:8px;padding:12px;text-align:center}.box-val{font-size:20px;font-weight:bold;color:#00994d}.box-lbl{font-size:10px;color:#666;text-transform:uppercase;margin-top:3px}table{width:100%;border-collapse:collapse}thead tr{background:#111}thead th{color:#fff;font-size:9px;text-transform:uppercase;padding:6px 8px;text-align:left}.footer{margin-top:24px;font-size:10px;color:#bbb;text-align:center}.btn{background:#111;color:#fff;border:none;padding:10px 24px;border-radius:6px;cursor:pointer;margin-bottom:20px}@media print{.btn{display:none}}</style>
    </head><body>
    <button class="btn" onclick="window.print()">🖨️ Imprimir / PDF</button>
    <img src="https://app.menuv.com.br/logo-pdf.png" style="height:40px;margin-bottom:12px;display:block" />
    <h2>Relatório de Débitos — ${relModal.nome}</h2>
    <div class="sub">${periodoStr} · Gerado em ${hoje}</div>
    <div class="boxes">
      <div class="box"><div class="box-val">${pedidos.length}</div><div class="box-lbl">🍽️ Refeições</div></div>
      <div class="box"><div class="box-val" style="color:#1a56db">R$ ${totalSub.toFixed(2)}</div><div class="box-lbl">🏢 Subsídio empresa</div></div>
      <div class="box"><div class="box-val" style="color:#e02424">R$ ${totalColab.toFixed(2)}</div><div class="box-lbl">💳 A descontar</div></div>
    </div>
    <table><thead><tr><th>Data</th><th>Pedido</th><th style="text-align:right">Valor</th><th style="text-align:right">Subsídio</th><th style="text-align:right">Desconto</th></tr></thead>
    <tbody>${linhas}</tbody></table>
    <div style="margin-top:16px;background:#fff8e1;border:1px solid #ffe082;border-radius:8px;padding:10px 16px;font-size:12px;color:#7c5c00">
      💳 Total a descontar do colaborador: <strong>R$ ${totalColab.toFixed(2)}</strong>
    </div>
    <div class="footer">Menuv · app.menuv.com.br</div>
    </body></html>`
    const w = window.open('', '_blank')
    w?.document.write(html)
    w?.document.close()
    setRelModal(null)
  }

  async function salvar() {
    if (!form.nome || !form.email) { toast('Preencha nome e e-mail.', 'error'); return }
    setSaving(true)
    const isEdit = modal?.id
    const res = await call(
      isEdit ? `/api/colaboradores/${modal.id}` : '/api/colaboradores',
      {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(isEdit
          ? { nome: form.nome, isGestor: form.isGestor, isAssistente: form.isAssistente }
          : { nome: form.nome, email: form.email, senha: form.senha, empresaId, isGestor: form.isGestor, isAssistente: form.isAssistente }
        ),
      }
    )
    setSaving(false)
    if (res.success) { toast(isEdit ? 'Colaborador atualizado.' : 'Colaborador criado.'); setModal(null); load() }
    else toast(res.error, 'error')
  }

  async function inativar(id: string) {
    setMenuAberto(null)
    if (!confirm('Inativar este colaborador?')) return
    const res = await call(`/api/colaboradores/${id}`, { method: 'DELETE' })
    if (res.success) { toast('Colaborador inativado.'); load() }
    else toast(res.error, 'error')
  }

  async function excluir(id: string, nome: string) {
    setMenuAberto(null)
    if (!confirm(`Excluir permanentemente ${nome}? Esta ação não pode ser desfeita.`)) return
    const res = await call(`/api/colaboradores/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ permanent: true }),
    })
    if (res.success) { toast('Colaborador excluído.'); load() }
    else toast(res.error ?? 'Erro ao excluir.', 'error')
  }

  if (loading) return <Spinner />

  const itemMenu = 'flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm bg-transparent border-none cursor-pointer transition-colors hover:bg-white/5'

  return (
    <div className="px-4 pt-2 pb-24">
      {/* Cabeçalho da seção + botão */}
      <div className="flex items-center justify-between mb-3">
        <SectionLabel>Colaboradores</SectionLabel>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 rounded-full bg-[#7fb6cc] px-4 py-2.5 text-sm font-bold text-[#0a1424] border-none cursor-pointer transition-colors hover:bg-[#93c4d8]">
          <IconPlus /> Novo Colaborador
        </button>
      </div>

      {/* Busca */}
      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Buscar por nome ou e-mail..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="w-full bg-[#0d1525] border border-[#1c2e48] rounded-[10px] px-4 py-3 text-sm text-[#ddeaf8] outline-none focus:border-[rgba(127,182,204,.5)] placeholder:text-[#5d7491]" />
        {busca && (
          <button onClick={() => setBusca('')} aria-label="Limpar busca"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5d7491] hover:text-[#ddeaf8] bg-transparent border-none cursor-pointer">✕</button>
        )}
      </div>

      {colabsFiltrados.length === 0 && (
        <Card>
          <p className="text-center text-sm text-[#5d7491] py-4">
            {busca ? 'Nenhum resultado para a busca.' : 'Nenhum colaborador ainda.'}
          </p>
        </Card>
      )}

      {/* Lista */}
      <div className="flex flex-col gap-3">
        {colabsFiltrados.map(c => {
          const aberto = menuAberto === c.id
          return (
            <div key={c.id}
              className={`relative flex items-center gap-3 rounded-[12px] border border-[#1c2e48] bg-[#0d1525] px-4 py-3.5 ${aberto ? 'z-20' : ''}`}>
              {/* Avatar */}
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#1c2e48] text-sm font-semibold text-[#8fb3c4]">
                {iniciais(c.nome)}
              </div>

              {/* Nome + e-mail */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-[#ddeaf8]">{c.nome}</p>
                <p className="truncate text-sm text-[#7a96b8]">{c.email}</p>
              </div>

              {/* Badge */}
              <Badge color={c.is_gestor ? 'blue' : c.is_assistente ? 'yellow' : 'gray'}>
                {c.is_gestor ? 'Gestor' : c.is_assistente ? 'Assistente' : 'Colaborador'}
              </Badge>

              {/* Menu … */}
              <div className="relative">
                <button
                  onClick={() => setMenuAberto(aberto ? null : c.id)}
                  aria-label="Ações"
                  aria-expanded={aberto}
                  className={`flex h-9 w-9 items-center justify-center rounded-[8px] border-none cursor-pointer text-[#ddeaf8] transition-colors
                    ${aberto ? 'bg-[#2a3b55]' : 'bg-[#1c2e48] hover:bg-[#2a3b55]'}`}>
                  <IconDots />
                </button>

                {aberto && (
                  <>
                    {/* Backdrop invisível: clicar fora fecha o menu */}
                    <div className="fixed inset-0 z-10" onClick={() => setMenuAberto(null)} />
                    <div className="absolute right-0 top-full z-20 mt-1.5 w-40 overflow-hidden rounded-[10px] border border-[#2a3b55] bg-[#111c30] shadow-xl">
                      <button onClick={() => abrirEditar(c)} className={`${itemMenu} text-[#ddeaf8]`}>
                        <IconEdit /> Editar
                      </button>
                      <button onClick={() => inativar(c.id)} className={`${itemMenu} text-[#ddeaf8]`}>
                        <IconPause /> Inativar
                      </button>
                      <button onClick={() => excluir(c.id, c.nome)} className={`${itemMenu} text-[#ff6b81]`}>
                        <IconTrash /> Excluir
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal de relatório (mantido) */}
      {relModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 backdrop-blur-sm bg-black/50" onClick={() => setRelModal(null)}>
          <div className="w-full max-w-sm bg-[#0d1525] border border-[#1c2e48] rounded-[16px] p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-[#ddeaf8]">Relatório — {relModal?.nome}</p>
              <button onClick={() => setRelModal(null)} className="text-[#3d5875] hover:text-[#ddeaf8] bg-transparent border-none cursor-pointer text-xl">×</button>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex gap-3">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="font-[var(--mono)] text-[9px] text-[#3d5875] uppercase">De</label>
                  <input type="date" value={relInicio} onChange={e => setRelInicio(e.target.value)}
                    className="w-full bg-[#080c14] border border-[#1c2e48] rounded-[8px] px-3 py-2 font-[var(--mono)] text-sm text-[#ddeaf8] outline-none" />
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="font-[var(--mono)] text-[9px] text-[#3d5875] uppercase">Até</label>
                  <input type="date" value={relFim} onChange={e => setRelFim(e.target.value)}
                    className="w-full bg-[#080c14] border border-[#1c2e48] rounded-[8px] px-3 py-2 font-[var(--mono)] text-sm text-[#ddeaf8] outline-none" />
                </div>
              </div>
              <Btn loading={relLoading} onClick={gerarRelatorioColab}>📄 Gerar relatório</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Modal criar/editar */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 backdrop-blur-sm bg-black/50" onClick={() => setModal(null)}>
          <div className="w-full max-w-sm bg-[#0d1525] border border-[#1c2e48] rounded-[16px] p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-[#ddeaf8]">{modal?.id ? `Editar: ${modal.nome}` : 'Novo colaborador'}</p>
              <button onClick={() => setModal(null)} className="text-[#3d5875] hover:text-[#ddeaf8] bg-transparent border-none cursor-pointer text-xl">×</button>
            </div>
            <div className="flex flex-col gap-4">
              <Input label="Nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="João Silva" />
              {!modal?.id && (
                <>
                  <Input label="E-mail" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="joao@empresa.com" />
                  <Input label="Senha" type="password" value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} placeholder="Mínimo 4 caracteres" />
                </>
              )}
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setForm(f => ({ ...f, isGestor: !f.isGestor, isAssistente: false }))}>
                <div className={`w-5 h-5 rounded-[4px] border flex items-center justify-center flex-shrink-0 transition-all ${form.isGestor ? 'bg-[#00e87a] border-[#00e87a]' : 'border-[#253d5e]'}`}>
                  {form.isGestor && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#003320" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <span className="font-[var(--mono)] text-xs text-[#7a96b8]">É gestor de empresa</span>
              </div>
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setForm(f => ({ ...f, isAssistente: !f.isAssistente, isGestor: false }))}>
                <div className={`w-5 h-5 rounded-[4px] border flex items-center justify-center flex-shrink-0 transition-all ${form.isAssistente ? 'bg-[#4da6ff] border-[#4da6ff]' : 'border-[#253d5e]'}`}>
                  {form.isAssistente && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#001a33" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <span className="font-[var(--mono)] text-xs text-[#7a96b8]">É assistente (só visualiza pedidos do dia)</span>
              </div>
              <Btn loading={saving} onClick={salvar}>Salvar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
