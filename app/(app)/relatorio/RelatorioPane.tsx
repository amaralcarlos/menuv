'use client'
import { useEffect, useRef, useState } from 'react'
import { useApi } from '@/lib/use-api'
import { useToast } from '@/components/ui'
import { Card, SectionLabel, Btn, Spinner, Modal, Input } from '@/components/ui'

function mesAtual() {
  const n = new Date()
  return `${String(n.getMonth() + 1).padStart(2, '0')}/${n.getFullYear()}`
}

function nomeMes(mesAno: string) {
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  const parts = mesAno.split('/')
  return `${meses[parseInt(parts[0]) - 1]} ${parts[1]}`
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

/* ── PDF consolidado ─────────────────────────────────────── */
function abrirPdfMes(mesAno: string, empresas: any[], totais: { total: number; valor: number; ativas: number }) {
  const hoje = new Date().toLocaleDateString('pt-BR')
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
  <title>Relatório ${mesAno}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    .sub { color: #666; font-size: 13px; margin-bottom: 24px; }
    .boxes { display: flex; gap: 16px; margin-bottom: 24px; }
    .box { flex: 1; border: 1px solid #ddd; border-radius: 8px; padding: 16px; text-align: center; }
    .box-val { font-size: 24px; font-weight: bold; color: #00994d; }
    .box-lbl { font-size: 11px; color: #666; text-transform: uppercase; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f5f5f5; text-align: left; padding: 8px 12px; font-size: 12px; color: #444; border-bottom: 2px solid #ddd; }
    td { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #eee; }
    tr:last-child td { border-bottom: none; }
    .footer { margin-top: 32px; font-size: 11px; color: #999; text-align: center; }
    .btn-print { background: #00994d; color: white; border: none; padding: 10px 24px; border-radius: 6px; cursor: pointer; font-size: 14px; margin-bottom: 24px; }
    @media print { .btn-print { display: none; } }
  </style></head><body>
  <button class="btn-print" onclick="window.print()">🖨️ Imprimir / PDF</button>
  <h1>Relatório Mensal de Refeições</h1>
  <div class="sub">${nomeMes(mesAno)} · Gerado por Menuv</div>
  <div class="boxes">
    <div class="box"><div class="box-val">${totais.ativas}</div><div class="box-lbl">🏢 Empresas ativas</div></div>
    <div class="box"><div class="box-val">${totais.total}</div><div class="box-lbl">🍽️ Refeições</div></div>
    <div class="box"><div class="box-val">R$ ${totais.valor.toFixed(2)}</div><div class="box-lbl">💰 Faturamento</div></div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Empresa</th><th>Refeições</th><th>Total (R$)</th><th>Preço/ref</th></tr></thead>
    <tbody>
      ${empresas.filter(e => e.totalPedidos > 0).sort((a,b) => b.totalPedidos - a.totalPedidos).map((e, i) => `
        <tr><td>${i+1}</td><td>${e.empresaNome}</td><td>${e.totalPedidos}</td><td>R$ ${Number(e.valorTotal).toFixed(2)}</td><td>R$ ${Number(e.precoRefeicao).toFixed(2)}</td></tr>
      `).join('')}
    </tbody>
  </table>
  <div class="footer">Menuv — Gestão inteligente de refeições · ${hoje}</div>
  </body></html>`
  const w = window.open('', '_blank')
  w?.document.write(html)
  w?.document.close()
}

function abrirPdfEmpresa(empresa: any, detalhe: any, mesAno: string) {
  const hoje = new Date().toLocaleDateString('pt-BR')
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
  <title>Relatório ${empresa.empresaNome} ${mesAno}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .sub { color: #666; font-size: 13px; margin-bottom: 24px; }
    .boxes { display: flex; gap: 16px; margin-bottom: 24px; }
    .box { flex: 1; border: 1px solid #ddd; border-radius: 8px; padding: 16px; text-align: center; }
    .box-val { font-size: 24px; font-weight: bold; color: #00994d; }
    .box-lbl { font-size: 11px; color: #666; text-transform: uppercase; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f5f5f5; text-align: left; padding: 8px 12px; font-size: 12px; color: #444; border-bottom: 2px solid #ddd; }
    td { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #eee; }
    .footer { margin-top: 32px; font-size: 11px; color: #999; text-align: center; }
    .btn-print { background: #00994d; color: white; border: none; padding: 10px 24px; border-radius: 6px; cursor: pointer; font-size: 14px; margin-bottom: 24px; }
    @media print { .btn-print { display: none; } }
  </style></head><body>
  <button class="btn-print" onclick="window.print()">🖨️ Imprimir / PDF</button>
  <h1>${empresa.empresaNome}</h1>
  <div class="sub">Relatório de ${nomeMes(mesAno)} · Gerado por Menuv</div>
  <div class="boxes">
    <div class="box"><div class="box-val">${detalhe.totalPedidos}</div><div class="box-lbl">🍽️ Refeições</div></div>
    <div class="box"><div class="box-val">R$ ${Number(detalhe.valorTotal).toFixed(2)}</div><div class="box-lbl">💰 Faturamento</div></div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Colaborador</th><th>Ref.</th><th>Total</th></tr></thead>
    <tbody>
      ${[...detalhe.colaboradores].sort((a,b) => b.total - a.total).map((c, i) => `
        <tr><td>${i+1}</td><td>${c.nome}</td><td>${c.total > 0 ? c.total : '—'}</td><td>${c.total > 0 ? 'R$ ' + Number(c.valor).toFixed(2) : '—'}</td></tr>
      `).join('')}
    </tbody>
  </table>
  <div class="footer">Menuv — Gestão inteligente de refeições · ${hoje}</div>
  </body></html>`
  const w = window.open('', '_blank')
  w?.document.write(html)
  w?.document.close()
}

/* ── Detalhe empresa ─────────────────────────────────────── */
function DetalheEmpresa({ empresa, mesAno, onVoltar }: { empresa: any; mesAno: string; onVoltar: () => void }) {
  const { call } = useApi()
  const toast    = useToast()
  const [detalhe,  setDetalhe]  = useState<any>(null)
  const [loading,  setLoading]  = useState(true)
  const [emailModal, setEmailModal] = useState(false)
  const [emailDest,  setEmailDest]  = useState('')
  const [sending,    setSending]    = useState(false)

  useEffect(() => {
    call<any>(`/api/relatorio/empresa?empresaId=${empresa.empresaId}&mesAno=${mesAno}`)
      .then(r => { if (r.success) setDetalhe(r.data); setLoading(false) })
  }, [empresa.empresaId, mesAno])

  async function enviarEmail() {
    if (!emailDest) { toast('Informe o e-mail.', 'error'); return }
    setSending(true)
    const corpo = `Relatório de ${nomeMes(mesAno)}\n\n${empresa.empresaNome}\nRefeições: ${detalhe?.totalPedidos}\nTotal: R$ ${Number(detalhe?.valorTotal).toFixed(2)}\n\nPor colaborador:\n${
      [...(detalhe?.colaboradores ?? [])].sort((a,b) => b.total - a.total)
        .map((c: any) => `${c.nome}: ${c.total > 0 ? c.total + ' ref. — R$ ' + Number(c.valor).toFixed(2) : '—'}`)
        .join('\n')
    }`
    const res = await call('/api/relatorio/email', {
      method: 'POST',
      body: JSON.stringify({ para: emailDest, assunto: `Relatório ${empresa.empresaNome} — ${mesAno}`, corpo }),
    })
    setSending(false)
    if (res.success) { toast('E-mail enviado!'); setEmailModal(false) }
    else toast(res.error, 'error')
  }

  return (
    <div className="mt-4">
      <Card>
        <button onClick={onVoltar}
          className="font-[var(--mono)] text-xs text-[#3d5875] hover:text-[#ddeaf8] transition-colors cursor-pointer bg-none border-none mb-3">
          ‹ Voltar
        </button>

        <p className="font-bold text-base text-[#ddeaf8] mb-4">{empresa.empresaNome}</p>

        {loading && <Spinner />}

        {!loading && detalhe && (
          <>
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <div className="bg-[#080c14] border border-[#1c2e48] rounded-[11px] p-3 text-center">
                <div className="text-2xl font-black font-[var(--mono)] text-[#4da6ff]">{detalhe.totalPedidos}</div>
                <div className="font-[var(--mono)] text-[10px] text-[#3d5875] uppercase mt-0.5">🍽️ Refeições</div>
              </div>
              <div className="bg-[#080c14] border border-[#1c2e48] rounded-[11px] p-3 text-center">
                <div className="text-xl font-black font-[var(--mono)] text-[#00e87a]">
                  {Number(detalhe.valorTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
                <div className="font-[var(--mono)] text-[10px] text-[#3d5875] mt-0.5">
                  R$ {Number(empresa.precoRefeicao).toFixed(2)}/ref
                </div>
              </div>
            </div>

            <p className="font-[var(--mono)] text-[10px] text-[#3d5875] uppercase tracking-[1px] mb-2">
              Cobrança por colaborador
            </p>

            <div className="flex flex-col gap-1 mb-4">
              {[...detalhe.colaboradores].sort((a,b) => b.total - a.total).map((c: any, i: number) => (
                <div key={c.nome} className="flex items-center gap-2 py-1.5 border-b border-[#1c2e48] last:border-none">
                  <span className="font-[var(--mono)] text-[10px] text-[#3d5875] w-5 text-center">{i+1}</span>
                  <span className="flex-1 text-sm text-[#ddeaf8]">{c.nome}</span>
                  <span className="font-[var(--mono)] text-xs text-[#00e87a] font-bold">
                    {c.total > 0 ? `${c.total} ref.` : '—'}
                  </span>
                  <span className="font-[var(--mono)] text-xs text-[#3d5875] w-20 text-right">
                    {c.total > 0 ? Number(c.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Btn size="sm" variant="secondary" className="w-auto"
                onClick={() => abrirPdfEmpresa(empresa, detalhe, mesAno)}>
                📄 PDF
              </Btn>
              <Btn size="sm" variant="secondary" className="w-auto"
                onClick={() => setEmailModal(true)}>
                📧 E-mail
              </Btn>
            </div>
          </>
        )}
      </Card>

      <Modal open={emailModal} onClose={() => setEmailModal(false)} title="Enviar relatório por e-mail">
        <div className="flex flex-col gap-4">
          <Input label="E-mail de destino" type="email" value={emailDest}
            onChange={e => setEmailDest(e.target.value)} placeholder="financeiro@empresa.com" />
          <Btn loading={sending} onClick={enviarEmail}>Enviar</Btn>
        </div>
      </Modal>
    </div>
  )
}

/* ── Main ────────────────────────────────────────────────── */
export default function RelatorioPane({ restId }: { restId: string }) {
  const { call } = useApi()
  const toast    = useToast()
  const detalheRef = useRef<HTMLDivElement>(null)

  const [mesAno,   setMesAno]   = useState(mesAtual())
  const [dados,    setDados]    = useState<any>(null)
  const [loading,  setLoading]  = useState(false)
  const [selected, setSelected] = useState<any>(null)

  async function buscar(mes: string) {
    setLoading(true)
    setSelected(null)
    const res = await call<any>(`/api/relatorio/mensal?mesAno=${mes}&restauranteId=${restId}`)
    setLoading(false)
    if (res.success) setDados(res.data)
    else toast(res.error, 'error')
  }

  useEffect(() => { buscar(mesAno) }, [])

  function selecionarEmpresa(e: any) {
    setSelected(e)
    setTimeout(() => detalheRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  const empresas  = dados?.resultado ?? []
  const total     = empresas.reduce((s: number, e: any) => s + e.totalPedidos, 0)
  const valor     = empresas.reduce((s: number, e: any) => s + e.valorTotal,   0)
  const ativas    = empresas.filter((e: any) => e.totalPedidos > 0).length
  const totais    = { total, valor, ativas }

  return (
    <div className="px-4 pt-4 pb-24">

      {/* Dropdown mês */}
      <div className="mb-4">
        <p className="font-[var(--mono)] text-[10px] text-[#3d5875] uppercase tracking-[1px] mb-1">Período</p>
        <select
          value={mesAno}
          onChange={e => { setMesAno(e.target.value); buscar(e.target.value) }}
          className="w-full bg-[#0d1525] border border-[#1c2e48] rounded-[8px] px-3 py-2 font-[var(--mono)] text-sm text-[#ddeaf8] outline-none cursor-pointer">
          {ultimos12Meses().map(m => (
            <option key={m} value={m}>{nomeMes(m)}</option>
          ))}
        </select>
      </div>

      {loading && <Spinner />}

      {!loading && dados && (
        <>
          {/* 3 stat cards */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: '🏢 Empresas', value: ativas,  color: 'text-[#7a96b8]' },
              { label: '🍽️ Refeições', value: total,  color: 'text-[#4da6ff]' },
              { label: '💰 Faturamento', value: valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), color: 'text-[#00e87a]' },
            ].map(s => (
              <div key={s.label} className="bg-[#0d1525] border border-[#1c2e48] rounded-[11px] p-2.5 text-center">
                <div className={`text-lg font-black font-[var(--mono)] ${s.color}`}>{s.value}</div>
                <div className="font-[var(--mono)] text-[9px] tracking-[.5px] text-[#3d5875] uppercase mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Botão exportar */}
          <div className="flex justify-end mb-3">
            <Btn size="sm" variant="secondary" className="w-auto"
              onClick={() => abrirPdfMes(mesAno, empresas, totais)}>
              📄 Exportar mês
            </Btn>
          </div>

          <p className="font-[var(--mono)] text-[10px] text-[#3d5875] mb-3">
            Por empresa · clique para detalhar
          </p>

          {empresas.length === 0 && (
            <Card>
              <p className="text-center font-[var(--mono)] text-xs text-[#3d5875] py-4">
                Sem pedidos neste período.
              </p>
            </Card>
          )}

          {empresas.map((e: any) => {
            const pct      = total > 0 ? Math.round((e.totalPedidos / total) * 100) : 0
            const temPedido = e.totalPedidos > 0
            return (
              <button
                key={e.empresaId}
                onClick={() => temPedido && selecionarEmpresa(e)}
                className={`w-full text-left mb-2.5 block transition-opacity ${!temPedido ? 'opacity-45 cursor-default' : 'cursor-pointer'}`}>
                <Card highlight={selected?.empresaId === e.empresaId}>
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-bold text-sm text-[#ddeaf8]">{e.empresaNome}</p>
                    <div className="text-right">
                      <div className="font-[var(--mono)] text-base font-bold text-[#00e87a]">
                        {e.totalPedidos} ref.
                      </div>
                      <div className="font-[var(--mono)] text-[10px] text-[#3d5875]">
                        {Number(e.valorTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                    </div>
                  </div>

                  {/* Barra de participação */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-1 bg-[#1c2e48] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#00e87a,#00c4a0)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="font-[var(--mono)] text-[10px] text-[#3d5875] w-8 text-right">{pct}%</span>
                  </div>

                  <p className="font-[var(--mono)] text-[10px] text-[#3d5875]">
                    R$ {Number(e.precoRefeicao).toFixed(2)}/ref
                    {temPedido && <span className="text-[#00e87a] ml-2">· ver detalhes ›</span>}
                  </p>
                </Card>
              </button>
            )
          })}

          {/* Detalhe */}
          <div ref={detalheRef}>
            {selected && (
              <DetalheEmpresa
                empresa={selected}
                mesAno={mesAno}
                onVoltar={() => setSelected(null)}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}
