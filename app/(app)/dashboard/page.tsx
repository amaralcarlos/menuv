'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useApi } from '@/lib/use-api'
import { useToast } from '@/components/ui'
import { AppShell } from '@/components/layout/AppShell'
import { Card, SectionLabel, Badge, Spinner, Btn } from '@/components/ui'
import GradesPane from '@/components/grade/GradesPane'
import EmpresasPane from '../empresas/EmpresasPane'
import RelatorioPane from '../relatorio/RelatorioPane'

function CardapioHoje({ cardapio }: { cardapio: any }) {
  if (!cardapio) return (
    <Card>
      <div className="text-center py-4">
        <p className="font-[var(--mono)] text-xs text-[#3d5875]">Nenhum cardápio publicado para hoje.</p>
      </div>
    </Card>
  )
  return (
    <Card highlight>
      <div className="flex items-center justify-between mb-3">
        <span className="font-[var(--mono)] text-[10px] tracking-[2px] text-[#00e87a] uppercase">Hoje · {cardapio.data}</span>
        <Badge color="green">Publicado</Badge>
      </div>
      {cardapio.pratos?.length > 0 && (
        <div className="mb-2">
          <p className="font-[var(--mono)] text-[10px] tracking-[1px] text-[#3d5875] uppercase mb-1">Prato</p>
          {cardapio.pratos.map((p: any) => (
            <p key={p.nome} className="text-sm font-semibold text-[#ddeaf8] py-1 border-b border-[#1c2e48] last:border-none">{p.nome}</p>
          ))}
        </div>
      )}
      {cardapio.guarnicoes?.length > 0 && (
        <div className="mb-2">
          <p className="font-[var(--mono)] text-[10px] tracking-[1px] text-[#7a96b8] uppercase mb-1">Guarnições</p>
          {cardapio.guarnicoes.map((g: any) => (
            <p key={g.nome} className="text-sm text-[#7a96b8] py-0.5">{g.nome}</p>
          ))}
        </div>
      )}
      {cardapio.outros?.length > 0 && (
        <div>
          <p className="font-[var(--mono)] text-[10px] tracking-[1px] text-[#3d5875] uppercase mb-1">Outros</p>
          {cardapio.outros.map((o: any) => (
            <p key={o.nome} className="text-sm text-[#3d5875] py-0.5">{o.nome}</p>
          ))}
        </div>
      )}
    </Card>
  )
}

function StatsRow({ empresas, pedidosHoje }: { empresas: any[]; pedidosHoje: number }) {
  const stats = [
    { label: 'Empresas',     value: empresas.length, color: 'text-[#00e87a]' },
    { label: 'Pedidos hoje', value: pedidosHoje,      color: 'text-[#4da6ff]' },
  ]
  return (
    <div className="grid grid-cols-2 gap-2.5 mb-3">
      {stats.map(s => (
        <div key={s.label} className="bg-[#0d1525] border border-[#1c2e48] rounded-[11px] p-3 text-center">
          <div className={`text-2xl font-black font-[var(--mono)] ${s.color}`}>{s.value}</div>
          <div className="font-[var(--mono)] text-[10px] tracking-[1px] text-[#3d5875] uppercase mt-0.5">{s.label}</div>
        </div>
      ))}
    </div>
  )
}

function HomePane({ restId }: { restId: string }) {
  const { call } = useApi()
  const [dados, setDados] = useState<any>(null)
  const [pedidosHoje, setPedidosHoje] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!restId) return
    async function load() {
      const [dadosRes, pedRes] = await Promise.all([
        call<any>(`/api/dados-iniciais?restauranteId=${restId}`),
        call<any[]>(`/api/pedidos?restauranteId=${restId}`),
      ])
      if (dadosRes.success) setDados(dadosRes.data)
      if (pedRes.success) setPedidosHoje(Array.isArray(pedRes.data) ? pedRes.data.length : 0)
      setLoading(false)
    }
    load()
  }, [restId])

  if (loading) return <Spinner />

  return (
    <div className="px-4 pt-4 pb-24">
      <StatsRow empresas={dados?.empresas ?? []} pedidosHoje={pedidosHoje} />
      <SectionLabel>Cardápio de hoje</SectionLabel>
      <CardapioHoje cardapio={dados?.cardapioHoje} />
    </div>
  )
}

export default function DashboardPage() {
  const { meta, loading } = useAuth()
  const restId = meta?.restaurante_id ?? ''

  if (loading || !restId) return (
    <div className="min-h-screen bg-[#080c14] flex items-center justify-center">
      <Spinner />
    </div>
  )

  const tabs = [
    { id: 'home',      label: 'Início',    icon: 'home'      as const, component: <HomePane restId={restId} /> },
    { id: 'grades',    label: 'Grades',    icon: 'grade'     as const, component: <GradesPane restId={restId} /> },
    { id: 'empresas',  label: 'Empresas',  icon: 'empresas'  as const, component: <EmpresasPane restId={restId} /> },
    { id: 'relatorio', label: 'Relatório', icon: 'relatorio' as const, component: <RelatorioPane restId={restId} /> },
  ]

  const badge = meta?.app_role === 'rest_usuario'
    ? (meta.perfil === 'admin' ? 'admin' : 'equipe')
    : 'restaurante'

 return <AppShell tabs={tabs} nome={meta?.nome ?? 'Menuv'} badge={badge} role="Restaurante" />
} 
