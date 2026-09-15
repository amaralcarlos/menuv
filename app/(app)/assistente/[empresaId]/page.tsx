'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useApi } from '@/lib/use-api'
import { AppShell } from '@/components/layout/AppShell'
import { Badge, Spinner } from '@/components/ui'
import PedidosContent from '@/app/(app)/pedidos/PedidosContent'
import ResumoColabPane from '@/app/(app)/pedidos/ResumoColabPane'

/* ── Início — visão dos pedidos da empresa ───────────────── */
function InicioPane({ empresaId }: { empresaId: string }) {
  const { call } = useApi()
  const [empresa,       setEmpresa]       = useState<any>(null)
  const [pedidosSemana, setPedidosSemana] = useState<Record<string, any[]>>({})
  const [loading,       setLoading]       = useState(true)
  const [diaSel,        setDiaSel]        = useState('')

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
        call<any[]>(`/api/pedidos?empresaId=${empresaId}&dataInicio=${fmt(seg)}&dataFim=${fmt(sex)}&_assistente=1`),
        call<any>(`/api/empresas/${empresaId}`),
      ])
      if (pedidosRes.success) {
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
      if (empRes.success) setEmpresa(empRes.data?.[0] ?? empRes.data)
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }

  function gerarRelatorio(dia: string, pedidos: any[]) {
    const hoje = new Date().toLocaleDateString('pt-BR')
    const [dd, mm, yyyy] = dia.split('/')
    const DIAS_PT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
    const nomeDia = DIAS_PT[new Date(`${yyyy}-${mm}-${dd}`).getDay()]
    const pedidosOrdenados = [...pedidos].sort((a, b) => (a.colaboradorNome ?? '').localeCompare(b.colaboradorNome ?? '', 'pt-BR'))
    const linhas = pedidosOrdenados.map((p: any, i: number) => {
      const itens = (p.pedido_itens?.map((it: any) => it.item) ?? p.itens ?? []).join(', ')
      return `<tr><td style="width:24px;font-size:10px;color:#999;padding:4px 8px">${i+1}</td><td style="width:22%;font-size:11px;font-weight:700;padding:4px 8px;white-space:nowrap">${p.colaboradorNome ?? '—'}</td><td style="font-size:10px;color:#555;padding:4px 8px">${itens}</td><td style="width:38%;padding:4px 8px"><div style="border-bottom:1px solid #bbb;height:18px"></div></td></tr>`
    }).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Assinaturas ${dd}/${mm}/${yyyy}</title><style>body{font-family:Arial,sans-serif;padding:20px 28px}table{width:100%;border-collapse:collapse}thead tr{background:#111}thead th{color:#fff;font-size:9px;font-weight:700;text-transform:uppercase;padding:5px 8px;text-align:left}tbody tr:nth-child(even){background:#fafafa}tbody tr{border-bottom:1px solid #eee}.btn{background:#111;color:#fff;border:none;padding:10px 24px;border-radius:6px;cursor:pointer;margin-bottom:20px}@media print{.btn{display:none}}</style></head><body>
    <button class="btn" onclick="window.print()">🖨️ Imprimir</button>
    <h2 style="margin-bottom:4px">${empresa?.nome ?? ''}</h2>
    <p style="color:#666;font-size:12px;margin-bottom:16px">${nomeDia}, ${dd}/${mm}/${yyyy} · ${pedidos.length} refeição(ões) · Gerado em ${hoje}</p>
    <table><thead><tr><th>#</th><th style="width:22%">Colaborador</th><th>Pedido</th><th style="width:38%">Assinatura</th></tr></thead><tbody>${linhas}</tbody></table>
    </body></html>`
    const w = window.open('', '_blank')
    w?.document.write(html)
    w?.document.close()
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div className="px-4 pt-4 pb-24">
      <p className="font-[var(--mono)] text-[10px] text-[#3d5875] uppercase tracking-[1px] mb-2">Pedidos da semana</p>
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
        {(() => {
          const hoje = new Date()
          const diaSemana = hoje.getDay() === 0 ? 6 : hoje.getDay() - 1
          const seg = new Date(hoje); seg.setDate(hoje.getDate() - diaSemana)
          return ['Seg','Ter','Qua','Qui','Sex'].map((nome, i) => {
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
      {(pedidosSemana[diaSel] ?? []).length > 0 && (
        <button onClick={() => gerarRelatorio(diaSel, pedidosSemana[diaSel] ?? [])}
          className="w-full mb-3 py-2.5 rounded-[11px] border border-[rgba(77,166,255,.3)] bg-[rgba(77,166,255,.05)] font-[var(--mono)] text-[11px] text-[#4da6ff] cursor-pointer hover:bg-[rgba(77,166,255,.1)] transition-colors">
          🖨️ Gerar lista de assinaturas
        </button>
      )}
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
              {p.itens?.length > 0 && <p className="font-[var(--mono)] text-[10px] text-[#7a96b8]">{p.itens.join(', ')}</p>}
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

/* ── Main ────────────────────────────────────────────────── */
export default function AssistentePage() {
  const params    = useParams()
  const { meta }  = useAuth()
  const empresaId = params.empresaId as string
  const [empNome, setEmpNome] = useState('')

  useEffect(() => {
    if (!empresaId) return
    fetch(`/api/empresas/${empresaId}`)
      .then(r => r.json())
      .then(d => { if (d.success) setEmpNome(d.data?.nome ?? '') })
      .catch(() => {})
  }, [empresaId])

  const tabs = [
    { id: 'inicio', label: 'Início',  icon: 'home'      as const, component: <InicioPane empresaId={empresaId} /> },
    { id: 'pedido', label: 'Pedido',  icon: 'pedido'    as const, component: <PedidosContent /> },
    { id: 'resumo', label: 'Resumo',  icon: 'relatorio' as const, component: <ResumoColabPane empresaId={empresaId} /> },
  ]

  return (
    <AppShell
      tabs={tabs}
      nome={meta?.nome ?? ''}
      badge="colaborador"
      role="Assistente"
      subInfo={empNome}
    />
  )
}
