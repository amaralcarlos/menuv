'use client'
import { useEffect, useState } from 'react'
import { useApi } from '@/lib/use-api'
import { Badge, Spinner } from '@/components/ui'

export default function InicioAssistentePane({ empresaId }: { empresaId: string }) {
  const { call } = useApi()
  const [empresa,        setEmpresa]        = useState<any>(null)
  const [pedidosSemana,  setPedidosSemana]  = useState<Record<string, any[]>>({})
  const [loading,        setLoading]        = useState(true)
  const [diaSel,         setDiaSel]         = useState('')

  useEffect(() => { load() }, [empresaId])

  async function load() {
    const hoje = new Date()
    const diaSemana = hoje.getDay() === 0 ? 6 : hoje.getDay() - 1
    const seg = new Date(hoje); seg.setDate(hoje.getDate() - diaSemana)
    const sex = new Date(seg);  sex.setDate(seg.getDate() + 4)
    const fmt = (d: Date) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`

    setDiaSel(fmt(hoje))

    try {
      const [pedidosRes, empRes] = await Promise.all([
        call<any[]>(`/api/pedidos?empresaId=${empresaId}&dataInicio=${fmt(seg)}&dataFim=${fmt(sex)}`),
        call<any>(`/api/empresas/${empresaId}`),
      ])

      if (pedidosRes.success) {
        const map: Record<string, any[]> = {}
        pedidosRes.data.forEach((p: any) => {
          const raw   = p.data_pedido ?? p.data ?? ''
          const parts = raw.split('-')
          const key   = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : raw
          if (!map[key]) map[key] = []
          map[key].push(p)
        })
        setPedidosSemana(map)
      }

      if (empRes.success) {
        const emp = empRes.data?.[0] ?? empRes.data
        setEmpresa(emp)
      }
    } catch(e) {
      console.error('Assistente load error:', e)
    } finally {
      setLoading(false)
    }
  }

  function gerarRelatorio(dia: string, pedidos: any[]) {
    const hoje = new Date().toLocaleDateString('pt-BR')
    const [dd, mm, yyyy] = dia.split('/')
    const DIAS_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
    const nomeDia = DIAS_PT[new Date(`${yyyy}-${mm}-${dd}`).getDay()]

    const pedidosOrdenados = [...pedidos].sort((a, b) =>
      (a.colaboradorNome ?? '').localeCompare(b.colaboradorNome ?? '', 'pt-BR'))

    const linhas = pedidosOrdenados.map((p: any, i: number) => {
      const itens = (p.pedido_itens?.map((it: any) => it.item) ?? p.itens ?? []).join(', ')
      return `
        <tr>
          <td class="td-num">${i+1}</td>
          <td class="td-nome">${p.colaboradorNome ?? '—'}</td>
          <td class="td-pedido">${itens}</td>
          <td class="td-ass"><div class="ass-line"></div></td>
        </tr>`
    }).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Lista de Assinaturas — ${dd}/${mm}/${yyyy}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 20px 28px; color: #111; }
      .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1.5px solid #eee; }
      .brand { font-size: 16px; font-weight: 900; color: #111; }
      .brand span { color: #00994d; }
      .doc-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
      .doc-sub { font-size: 11px; color: #888; margin-top: 2px; }
      .info-bar { display: flex; gap: 24px; background: #f7f8fa; border-radius: 6px; padding: 7px 14px; margin-bottom: 12px; }
      .info-label { font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: #999; font-weight: 600; }
      .info-value { font-size: 11px; font-weight: 700; color: #111; }
      table { width: 100%; border-collapse: collapse; }
      thead tr { background: #111; }
      thead th { color: #fff; font-size: 9px; font-weight: 700; text-transform: uppercase; padding: 5px 8px; text-align: left; }
      tbody tr:nth-child(even) { background: #fafafa; }
      tbody tr { border-bottom: 1px solid #eee; }
      td { padding: 4px 8px; vertical-align: middle; }
      .td-num { width: 24px; font-size: 10px; color: #999; font-weight: 600; }
      .td-nome { width: 22%; font-size: 11px; font-weight: 700; color: #111; white-space: nowrap; }
      .td-pedido { font-size: 10px; color: #555; }
      .td-ass { width: 38%; }
      .ass-line { border-bottom: 1px solid #bbb; height: 18px; width: 100%; }
      .footer { margin-top: 14px; display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid #eee; font-size: 10px; color: #bbb; }
      .btn-print { background: #111; color: white; border: none; padding: 10px 24px; border-radius: 6px; cursor: pointer; font-size: 13px; margin-bottom: 20px; }
      @media print { .btn-print { display: none; } }
    </style></head><body>
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
    <div class="header">
      <div><div class="brand">Menu<span>v</span></div><div style="font-size:10px;color:#888">Gestão de Refeições</div></div>
      <div style="text-align:right"><div class="doc-title">Lista de Assinaturas</div><div class="doc-sub">Gerado em ${hoje}</div></div>
    </div>
    <div class="info-bar">
      <div><div class="info-label">Empresa</div><div class="info-value">${empresa?.nome ?? '—'}</div></div>
      <div><div class="info-label">Data</div><div class="info-value">${nomeDia}, ${dd}/${mm}/${yyyy}</div></div>
      <div><div class="info-label">Total</div><div class="info-value">${pedidos.length} refeição(ões)</div></div>
    </div>
    <table>
      <thead><tr><th>#</th><th style="width:22%">Colaborador</th><th>Pedido</th><th style="width:38%">Assinatura</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
    <div class="footer"><span>Menuv · app.menuv.com.br</span><span>${empresa?.nome ?? ''} · ${dd}/${mm}/${yyyy}</span></div>
    </body></html>`

    const w = window.open('', '_blank')
    w?.document.write(html)
    w?.document.close()
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div className="px-4 pt-4 pb-24">

      {/* Seletor de dias */}
      <p className="font-[var(--mono)] text-[10px] text-[#3d5875] uppercase tracking-[1px] mb-2">Pedidos da semana</p>
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

      {/* Botão relatório */}
      {(pedidosSemana[diaSel] ?? []).length > 0 && (
        <button onClick={() => gerarRelatorio(diaSel, pedidosSemana[diaSel] ?? [])}
          className="w-full mb-3 py-2.5 rounded-[11px] border border-[rgba(77,166,255,.3)] bg-[rgba(77,166,255,.05)] font-[var(--mono)] text-[11px] text-[#4da6ff] cursor-pointer hover:bg-[rgba(77,166,255,.1)] transition-colors">
          🖨️ Gerar lista de assinaturas
        </button>
      )}

      {/* Lista pedidos */}
      {(pedidosSemana[diaSel] ?? []).length > 0 ? (
        <div className="flex flex-col gap-2">
          {(pedidosSemana[diaSel] ?? []).map((p: any) => (
            <div key={p.id} className="bg-[#0d1525] border border-[#1c2e48] rounded-[8px] px-3 py-2.5">
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-sm text-[#ddeaf8]">{p.colaboradorNome}</p>
                <Badge color={p.status === 'despachado' || p.status === 'confirmado' ? 'green' : p.status === 'separado' ? 'blue' : 'gray'}>
                  {p.status === 'despachado' ? 'Despachado' : p.status === 'confirmado' ? 'Confirmado' : p.status === 'separado' ? 'Separado' : 'Em aberto'}
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
