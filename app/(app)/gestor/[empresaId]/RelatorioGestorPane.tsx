'use client'
import { useEffect, useState } from 'react'
import { useApi } from '@/lib/use-api'
import { useToast } from '@/components/ui'
import { Card, Btn, Spinner, Modal } from '@/components/ui'

function nomeMes(mesAno: string) {
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  const parts = mesAno.split('/')
  return `${meses[parseInt(parts[0]) - 1]} ${parts[1]}`
}

function mesAtual() {
  const n = new Date()
  return `${String(n.getMonth() + 1).padStart(2, '0')}/${n.getFullYear()}`
}

function ultimos12Meses() {
  const meses = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    meses.push(`${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`)
  }
  return meses
}

function abrirPdf(detalhe: any, mesAno: string, pct: number) {
  const hoje        = new Date().toLocaleDateString('pt-BR')
  const temRateio   = pct > 0
  const empresaPaga = Math.round((1 - pct / 100) * 100)
  const colabPaga   = pct

  const linhasTabela = [...detalhe.colaboradores]
    .filter((c: any) => c.total > 0)
    .sort((a: any, b: any) => b.total - a.total)
    .map((c: any, i: number) => {
      const total   = Number(c.valor).toFixed(2)
      const empPaga = (c.valor * (1 - pct / 100)).toFixed(2)
      const colPaga = (c.valor * (pct / 100)).toFixed(2)
      return temRateio
        ? `<tr><td>${i+1}</td><td>${c.nome}</td><td>${c.total}</td><td>R$ ${total}</td><td style="color:#1a56db">R$ ${empPaga}</td><td style="color:#e02424;font-weight:bold">R$ ${colPaga}</td></tr>`
        : `<tr><td>${i+1}</td><td>${c.nome}</td><td>${c.total}</td><td>R$ ${total}</td></tr>`
    }).join('')

  const headerTabela = temRateio
    ? `<tr><th>#</th><th>Colaborador</th><th>Ref.</th><th>Total</th><th>Empresa paga</th><th>Colaborador paga</th></tr>`
    : `<tr><th>#</th><th>Colaborador</th><th>Ref.</th><th>Total</th></tr>`

  const cardsHtml = temRateio ? `
    <div class="boxes">
      <div class="box"><div class="box-val">${detalhe.totalPedidos}</div><div class="box-lbl">🍽️ Refeições</div></div>
      <div class="box"><div class="box-val" style="color:#1a56db">R$ ${(detalhe.valorTotal * (1 - pct/100)).toFixed(2)}</div><div class="box-lbl">🏢 Empresa paga (${empresaPaga}%)</div></div>
      <div class="box"><div class="box-val" style="color:#e02424">R$ ${(detalhe.valorTotal * (pct/100)).toFixed(2)}</div><div class="box-lbl">👤 Colaboradores (${colabPaga}%)</div></div>
    </div>
    <div class="banner">💼 Empresa subsidia ${empresaPaga}% · Colaboradores pagam ${colabPaga}% · Preço por refeição: R$ ${Number(detalhe.preco).toFixed(2)}</div>
  ` : `
    <div class="boxes">
      <div class="box"><div class="box-val">${detalhe.totalPedidos}</div><div class="box-lbl">🍽️ Refeições</div></div>
      <div class="box"><div class="box-val" style="color:#00994d">R$ ${Number(detalhe.valorTotal).toFixed(2)}</div><div class="box-lbl">💰 Faturamento<br><small>R$ ${Number(detalhe.preco).toFixed(2)}/ref · empresa paga 100%</small></div></div>
    </div>
  `

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
  <title>Relatório ${detalhe.empresaNome} ${mesAno}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .sub { color: #666; font-size: 13px; margin-bottom: 24px; }
    .boxes { display: flex; gap: 16px; margin-bottom: 16px; }
    .box { flex: 1; border: 1px solid #ddd; border-radius: 8px; padding: 16px; text-align: center; }
    .box-val { font-size: 22px; font-weight: bold; color: #00994d; }
    .box-lbl { font-size: 11px; color: #666; text-transform: uppercase; margin-top: 4px; }
    .banner { background: #f0f4ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 10px 16px; font-size: 12px; color: #3730a3; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #f5f5f5; text-align: left; padding: 8px 12px; font-size: 12px; color: #444; border-bottom: 2px solid #ddd; }
    td { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #eee; }
    .footer { margin-top: 32px; font-size: 11px; color: #999; text-align: center; }
    .btn-print { background: #00994d; color: white; border: none; padding: 10px 24px; border-radius: 6px; cursor: pointer; font-size: 14px; margin-bottom: 24px; }
    @media print { .btn-print { display: none; } }
  </style></head><body>
  <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
  <h1>Relatório de Refeições — ${detalhe.empresaNome}</h1>
  <div class="sub">${nomeMes(mesAno)}</div>
  ${cardsHtml}
  <p style="font-size:12px;color:#666;margin-bottom:4px">Cobrança por colaborador</p>
  <table><thead>${headerTabela}</thead><tbody>${linhasTabela}</tbody></table>
  <div class="footer">Gerado em ${hoje} · Menuv — Gestão inteligente de refeições</div>
  </body></html>`

  const w = window.open('', '_blank')
  w?.document.write(html)
  w?.document.close()
}

export default function RelatorioGestorPane({ empresaId }: { empresaId: string }) {
  const { call } = useApi()
  const toast    = useToast()

  const [mesAno,       setMesAno]       = useState(mesAtual())
  const [detalhe,      setDetalhe]      = useState<any>(null)
  const [loading,      setLoading]      = useState(false)
  const [pctInput,     setPctInput]     = useState('0')
  const [pct,          setPct]          = useState(0)
  const [emailModal,   setEmailModal]   = useState(false)
  const [emailDest,    setEmailDest]    = useState('')
  const [emailAssunto, setEmailAssunto] = useState('')
  const [emailMsg,     setEmailMsg]     = useState('')
  const [sending,      setSending]      = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(`alm_pct_${empresaId}`)
    if (saved) { setPctInput(saved); setPct(parseInt(saved)) }
  }, [empresaId])

  async function buscar(mes: string) {
    setLoading(true)
    const res = await call<any>(`/api/relatorio/empresa?empresaId=${empresaId}&mesAno=${mes}`)
    setLoading(false)
    if (res.success) {
      setDetalhe(res.data)
      setEmailDest(res.data.empresaEmail ?? '')
      setEmailAssunto(`Relatório de Refeições · ${res.data.empresaNome} · ${mes}`)
    } else toast(res.error, 'error')
  }

  useEffect(() => { buscar(mesAno) }, [empresaId])

  function aplicarPct() {
    const v = Math.min(100, Math.max(0, parseInt(pctInput) || 0))
    setPct(v)
    setPctInput(String(v))
    localStorage.setItem(`alm_pct_${empresaId}`, String(v))
  }

  async function enviarEmail() {
    if (!emailDest) { toast('Informe o e-mail.', 'error'); return }
    if (!detalhe) return
    setSending(true)

    const linhas = [...detalhe.colaboradores]
      .filter((c: any) => c.total > 0)
      .sort((a: any, b: any) => b.total - a.total)
      .map((c: any, i: number) => `${i+1}. ${c.nome} — ${c.total} ref. — R$ ${Number(c.valor).toFixed(2)}`)
      .join('\n')

    const relatorio = `=== RELATÓRIO DE REFEIÇÕES ===\n${detalhe.empresaNome} · ${nomeMes(mesAno)}\n\nTOTAL DE REFEIÇÕES: ${detalhe.totalPedidos}\nVALOR TOTAL: R$ ${Number(detalhe.valorTotal).toFixed(2)}\n(R$ ${Number(detalhe.preco).toFixed(2)} por refeição)\n\n--- POR COLABORADOR ---\n${linhas}`
    const corpo = emailMsg ? `${emailMsg}\n\n${relatorio}` : relatorio

    const res = await call('/api/relatorio/email', {
      method: 'POST',
      body: JSON.stringify({ para: emailDest, assunto: emailAssunto, corpo }),
    })
    setSending(false)
    if (res.success) { toast('E-mail enviado!'); setEmailModal(false) }
    else toast(res.error, 'error')
  }

  const colabs    = detalhe ? [...detalhe.colaboradores].sort((a: any, b: any) => b.total - a.total) : []
  const temRateio = pct > 0

  const infoText = pct === 0
    ? '💼 Empresa absorve 100% do custo — colaboradores não pagam nada'
    : pct === 100
      ? '👤 Colaboradores pagam 100% — empresa não subsidia'
      : `🤝 Empresa subsidia ${100 - pct}% · Colaborador paga ${pct}% do valor por refeição`

  return (
    <div className="px-4 pt-4 pb-24">

      {/* Controles */}
      <Card>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="font-[var(--mono)] text-[10px] text-[#3d5875] uppercase tracking-[1px] mb-1">Período</p>
            <select
              value={mesAno}
              onChange={e => { setMesAno(e.target.value); buscar(e.target.value) }}
              className="w-full bg-[#080c14] border border-[#1c2e48] rounded-[8px] px-2.5 py-2 font-[var(--mono)] text-xs text-[#ddeaf8] outline-none cursor-pointer">
              {ultimos12Meses().map(m => (
                <option key={m} value={m}>{nomeMes(m)}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="font-[var(--mono)] text-[10px] text-[#3d5875] uppercase tracking-[1px] mb-1">% do colaborador</p>
            <div className="flex gap-1.5">
              <div className="flex-1 flex items-center bg-[#080c14] border border-[#1c2e48] rounded-[8px] px-2.5">
                <input
                  type="number" min="0" max="100"
                  value={pctInput}
                  onChange={e => setPctInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && aplicarPct()}
                  className="flex-1 bg-transparent font-[var(--mono)] text-xs text-[#ddeaf8] outline-none w-full py-2"
                />
                <span className="font-[var(--mono)] text-xs text-[#3d5875]">%</span>
              </div>
              <button onClick={aplicarPct}
                className="bg-[rgba(0,232,122,.1)] border border-[rgba(0,232,122,.3)] rounded-[8px] px-2.5 font-[var(--mono)] text-[10px] text-[#00e87a] cursor-pointer whitespace-nowrap hover:bg-[rgba(0,232,122,.15)] transition-colors">
                Aplicar
              </button>
            </div>
          </div>
        </div>
        <p className="font-[var(--mono)] text-[10px] text-[#7a96b8]">{infoText}</p>
      </Card>

      {loading && <div className="mt-4"><Spinner /></div>}

      {!loading && detalhe && (
        <>
          {/* Cards */}
          <div className={`grid gap-2.5 mt-4 mb-4 ${temRateio ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <div className="bg-[#0d1525] border border-[#1c2e48] rounded-[11px] p-3 text-center">
              <div className="text-xl font-black font-[var(--mono)] text-[#4da6ff]">{detalhe.totalPedidos}</div>
              <div className="font-[var(--mono)] text-[9px] text-[#3d5875] uppercase mt-0.5">🍽️ Refeições</div>
              <div className="font-[var(--mono)] text-[9px] text-[#3d5875] mt-0.5">{nomeMes(mesAno)}</div>
            </div>

            {temRateio ? (
              <>
                <div className="bg-[#0d1525] border border-[#1c2e48] rounded-[11px] p-3 text-center">
                  <div className="text-lg font-black font-[var(--mono)] text-[#00e87a]">
                    {(detalhe.valorTotal * (1 - pct/100)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <div className="font-[var(--mono)] text-[9px] text-[#3d5875] uppercase mt-0.5">🏢 Empresa</div>
                  <div className="font-[var(--mono)] text-[9px] text-[#3d5875] mt-0.5">{100-pct}% do total</div>
                </div>
                <div className="bg-[#0d1525] border border-[#1c2e48] rounded-[11px] p-3 text-center">
                  <div className="text-lg font-black font-[var(--mono)] text-[#4da6ff]">
                    {(detalhe.valorTotal * (pct/100)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <div className="font-[var(--mono)] text-[9px] text-[#3d5875] uppercase mt-0.5">👤 Colabs</div>
                  <div className="font-[var(--mono)] text-[9px] text-[#3d5875] mt-0.5">{pct}% do total</div>
                </div>
              </>
            ) : (
              <div className="bg-[#0d1525] border border-[#1c2e48] rounded-[11px] p-3 text-center">
                <div className="text-lg font-black font-[var(--mono)] text-[#00e87a]">
                  {Number(detalhe.valorTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
                <div className="font-[var(--mono)] text-[9px] text-[#3d5875] uppercase mt-0.5">💰 Faturamento</div>
                <div className="font-[var(--mono)] text-[9px] text-[#3d5875] mt-0.5">R$ {Number(detalhe.preco).toFixed(2)}/ref</div>
              </div>
            )}
          </div>

          {/* Tabela */}
          <p className="font-[var(--mono)] text-[10px] text-[#3d5875] uppercase tracking-[1px] mb-2">
            Cobrança por colaborador
          </p>
          <div className="overflow-x-auto mb-4">
            <table className="w-full" style={{ minWidth: temRateio ? 380 : 280 }}>
              <thead>
                <tr className="border-b border-[#1c2e48]">
                  <th className="font-[var(--mono)] text-[9px] text-[#3d5875] text-left pb-2 pr-2">#</th>
                  <th className="font-[var(--mono)] text-[9px] text-[#3d5875] text-left pb-2 pr-2">Colaborador</th>
                  <th className="font-[var(--mono)] text-[9px] text-[#3d5875] text-right pb-2 pr-2">Ref.</th>
                  <th className="font-[var(--mono)] text-[9px] text-[#3d5875] text-right pb-2 pr-2">Total</th>
                  {temRateio && (
                    <th className="font-[var(--mono)] text-[9px] text-[#4da6ff] text-right pb-2">A cobrar ({pct}%)</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {colabs.map((c: any, i: number) => (
                  <tr key={c.nome} className="border-b border-[#1c2e48] last:border-none">
                    <td className="py-2 pr-2">
                      <span className="font-[var(--mono)] text-[10px] text-[#3d5875]">{i+1}</span>
                    </td>
                    <td className="py-2 pr-2 text-sm text-[#ddeaf8]">{c.nome}</td>
                    <td className="py-2 pr-2 text-right font-[var(--mono)] text-xs text-[#00e87a] font-bold">
                      {c.total > 0 ? c.total : '—'}
                    </td>
                    <td className="py-2 pr-2 text-right font-[var(--mono)] text-xs text-[#7a96b8]">
                      {c.total > 0 ? Number(c.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                    </td>
                    {temRateio && (
                      <td className="py-2 text-right font-[var(--mono)] text-xs text-[#4da6ff] font-bold">
                        {c.total > 0 ? (c.valor * pct / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Botões */}
          <div className="flex gap-2">
            <Btn variant="secondary" className="flex-1" onClick={() => abrirPdf(detalhe, mesAno, pct)}>
              📄 PDF
            </Btn>
            <Btn variant="secondary" className="flex-1" onClick={() => setEmailModal(true)}>
              📧 E-mail
            </Btn>
          </div>
        </>
      )}

      {/* Modal e-mail */}
      <Modal open={emailModal} onClose={() => setEmailModal(false)} title="Enviar relatório por e-mail">
        <div className="flex flex-col gap-3">
          <div>
            <p className="font-[var(--mono)] text-[10px] text-[#3d5875] uppercase tracking-[1px] mb-1">Destinatário</p>
            <input type="email" value={emailDest} onChange={e => setEmailDest(e.target.value)}
              className="w-full bg-[#080c14] border border-[#1c2e48] rounded-[8px] px-3 py-2 font-[var(--mono)] text-sm text-[#ddeaf8] outline-none" />
          </div>
          <div>
            <p className="font-[var(--mono)] text-[10px] text-[#3d5875] uppercase tracking-[1px] mb-1">Assunto</p>
            <input type="text" value={emailAssunto} onChange={e => setEmailAssunto(e.target.value)}
              className="w-full bg-[#080c14] border border-[#1c2e48] rounded-[8px] px-3 py-2 font-[var(--mono)] text-sm text-[#ddeaf8] outline-none" />
          </div>
          <div>
            <p className="font-[var(--mono)] text-[10px] text-[#3d5875] uppercase tracking-[1px] mb-1">Mensagem (opcional)</p>
            <textarea value={emailMsg} onChange={e => setEmailMsg(e.target.value)}
              rows={3} placeholder="Segue o relatório do mês..."
              className="w-full bg-[#080c14] border border-[#1c2e48] rounded-[8px] px-3 py-2 font-[var(--mono)] text-sm text-[#ddeaf8] outline-none resize-none" />
          </div>
          <Btn loading={sending} onClick={enviarEmail}>Enviar</Btn>
        </div>
      </Modal>
    </div>
  )
}
