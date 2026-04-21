type ItemSel = { nome: string; ajuste: 'normal' | 'extra' | 'reduzido' }

function OrderForm({ dia, colabId, empId, restId, onSaved }: {
  dia: any; colabId: string; empId: string; restId: string; onSaved: () => void
}) {
  const { call } = useApi()
  const toast    = useToast()
  const existingPedido = dia.pedido

  const allItems = [
    ...(dia.pratos     ?? []).map((p: any) => ({ nome: p.nome, tipo: 'prato'     })),
    ...(dia.guarnicoes ?? []).map((g: any) => ({ nome: g.nome, tipo: 'guarnicao' })),
    ...(dia.outros     ?? []).map((o: any) => ({ nome: o.nome, tipo: 'outro'     })),
  ]

  function parseExisting(): ItemSel[] {
    if (!existingPedido?.itens) return []
    return existingPedido.itens.map((s: string) => {
      if (s.endsWith(' [extra]'))    return { nome: s.replace(' [extra]', ''),    ajuste: 'extra'    }
      if (s.endsWith(' [reduzido]')) return { nome: s.replace(' [reduzido]', ''), ajuste: 'reduzido' }
      return { nome: s, ajuste: 'normal' }
    })
  }

  const [selected, setSelected] = useState<ItemSel[]>(parseExisting())
  const [obs,      setObs]      = useState<string>(existingPedido?.obs ?? '')
  const [saving,   setSaving]   = useState(false)
  const [empConfig, setEmpConfig] = useState<any>(null)

  useEffect(() => {
    setSelected(parseExisting())
    setObs(existingPedido?.obs ?? '')
  }, [dia.data])

  useEffect(() => {
    call<any[]>(`/api/empresas?restauranteId=${restId}`).then(r => {
      if (r.success) setEmpConfig(r.data.find((e: any) => e.id === empId))
    })
  }, [empId])

  const parts   = dia.data.split('/')
  const date    = new Date(+parts[2], +parts[1] - 1, +parts[0])
  const dow     = DIAS_PT[date.getDay()]
  const hoje    = new Date()
  const isToday = date.toDateString() === hoje.toDateString()

  let bloqueado = false
  let motivoBloqueio = ''
  if (isToday && empConfig?.horario_limite) {
    const [h, m] = empConfig.horario_limite.split(':').map(Number)
    const cutoff = new Date(); cutoff.setHours(h, m, 0, 0)
    if (hoje >= cutoff) { bloqueado = true; motivoBloqueio = `Pedidos encerrados às ${empConfig.horario_limite}` }
  }

  function isSelected(nome: string) {
    return selected.some(s => s.nome === nome)
  }

  function getAjuste(nome: string): 'normal' | 'extra' | 'reduzido' {
    return selected.find(s => s.nome === nome)?.ajuste ?? 'normal'
  }

  function toggleItem(nome: string) {
    setSelected(s => s.some(i => i.nome === nome)
      ? s.filter(i => i.nome !== nome)
      : [...s, { nome, ajuste: 'normal' }]
    )
  }

  function toggleAjuste(nome: string, ajuste: 'extra' | 'reduzido') {
    setSelected(s => s.map(i => i.nome === nome
      ? { ...i, ajuste: i.ajuste === ajuste ? 'normal' : ajuste }
      : i
    ))
  }

  async function salvar() {
    if (selected.length === 0) { toast('Selecione ao menos um item.', 'error'); return }
    if (!colabId) { toast('Erro: faça logout e login novamente.', 'error'); return }
    setSaving(true)

    const itens = selected.map(s =>
      s.ajuste === 'normal' ? s.nome : `${s.nome} [${s.ajuste}]`
    )

    const res = await call('/api/pedidos', {
      method: 'POST',
      body: JSON.stringify({
        colaboradorId: colabId,
        empresaId:     empId,
        data:          `${parts[2]}-${parts[1]}-${parts[0]}`,
        itens,
        obs,
      }),
    })
    setSaving(false)
    if (res.success) { toast('Pedido salvo!'); onSaved() }
    else toast(res.error ?? 'Erro ao salvar pedido.', 'error')
  }

  const tipoBadge: Record<string, string> = {
    prato:     'bg-[rgba(0,232,122,.08)] text-[#00e87a]',
    guarnicao: 'bg-[rgba(77,166,255,.1)] text-[#4da6ff]',
    outro:     'bg-[rgba(122,150,184,.08)] text-[#7a96b8]',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-[#ddeaf8]">
          {dow}, {String(date.getDate()).padStart(2,'0')} {MESES_PT[date.getMonth()]}
        </p>
        {existingPedido && <Badge color="green">Pedido feito</Badge>}
      </div>

      {bloqueado && (
        <div className="bg-[rgba(255,179,64,.07)] border border-[rgba(255,179,64,.2)] rounded-[11px] px-3 py-2 mb-3">
          <p className="font-[var(--mono)] text-xs text-[#ffb340]">⏰ {motivoBloqueio}</p>
        </div>
      )}

      {allItems.length === 0 && (
        <p className="font-[var(--mono)] text-xs text-[#3d5875] py-4 text-center">
          Sem cardápio para este dia.
        </p>
      )}

      <div className="flex flex-col gap-2 mb-4">
        {allItems.map((item, idx) => {
          const sel    = isSelected(item.nome)
          const ajuste = getAjuste(item.nome)
          return (
            <div key={`${item.nome}-${idx}`}
              className={`rounded-[11px] border transition-all
                ${sel
                  ? 'border-[rgba(0,232,122,.4)] bg-[rgba(0,232,122,.06)]'
                  : 'border-[#1c2e48] bg-[#0d1525]'}`}>

              {/* Linha principal */}
              <button
                onClick={() => !bloqueado && toggleItem(item.nome)}
                disabled={bloqueado}
                className="w-full flex items-center gap-2.5 p-3 text-left cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center flex-shrink-0 transition-all
                  ${sel ? 'bg-[#00e87a] border-[#00e87a]' : 'border-[#253d5e]'}`}>
                  {sel && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l3 3 5-6" stroke="#003320" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className="flex-1 text-sm font-medium text-[#ddeaf8]">{item.nome}</span>
                <span className={`font-[var(--mono)] text-[9px] tracking-[.5px] px-1.5 py-0.5 rounded-full ${tipoBadge[item.tipo]}`}>
                  {item.tipo === 'prato' ? 'prato' : item.tipo === 'guarnicao' ? 'guarnicao' : 'outro'}
                </span>
              </button>

              {/* Extra / Reduzido — só aparece quando seleccionado */}
              {sel && !bloqueado && (
                <div className="flex gap-2 px-3 pb-3">
                  {(['extra', 'reduzido'] as const).map(a => (
                    <button
                      key={a}
                      onClick={() => toggleAjuste(item.nome, a)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border font-[var(--mono)] text-[10px] uppercase tracking-[.5px] transition-all cursor-pointer
                        ${ajuste === a
                          ? 'bg-[rgba(0,232,122,.12)] border-[rgba(0,232,122,.4)] text-[#00e87a]'
                          : 'bg-transparent border-[#253d5e] text-[#3d5875] hover:border-[#3d5875]'
                        }`}>
                      <div className={`w-3 h-3 rounded-[3px] border flex items-center justify-center flex-shrink-0
                        ${ajuste === a ? 'bg-[#00e87a] border-[#00e87a]' : 'border-[#3d5875]'}`}>
                        {ajuste === a && (
                          <svg width="7" height="6" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4l3 3 5-6" stroke="#003320" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      {a === 'extra' ? 'Extra' : 'Reduzido'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!bloqueado && allItems.length > 0 && (
        <Btn onClick={salvar} loading={saving}>
          {existingPedido ? 'Atualizar pedido' : 'Confirmar pedido'}
        </Btn>
      )}
    </div>
  )
}
