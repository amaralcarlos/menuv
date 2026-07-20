'use client'
import { useAuth } from '@/lib/auth-context'
import { AppShell } from '@/components/layout/AppShell'
import PedidosContent from './PedidosContent'
import ResumoColabPane from './ResumoColabPane'

export default function PedidosPage() {
  const { meta } = useAuth()
  const empId = meta?.empresa_id ?? ''

  const tabs = [
    { id: 'pedido', label: 'Pedido', icon: 'pedido'    as const, component: <PedidosContent /> },
    { id: 'resumo', label: 'Resumo', icon: 'relatorio' as const, component: <ResumoColabPane empresaId={empId} /> },
  ]

  return <AppShell tabs={tabs} nome={meta?.nome ?? ''} badge="colaborador" role="Colaborador" />
}
