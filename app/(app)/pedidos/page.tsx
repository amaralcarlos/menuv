'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { AppShell } from '@/components/layout/AppShell'
import PedidosContent from './PedidosContent'
import ResumoColabPane from './ResumoColabPane'
import InicioAssistentePane from './InicioAssistentePane'

export default function PedidosPage() {
  const { meta } = useAuth()
  const empId = meta?.empresa_id ?? ''
  const [empNome, setEmpNome] = useState('')

  useEffect(() => {
    if (!empId) return
    fetch(`/api/empresas/${empId}`)
      .then(r => r.json())
      .then(d => { if (d.success) setEmpNome(d.data?.nome ?? '') })
      .catch(() => {})
  }, [empId])

  const isAssistente = meta?.is_assistente === true
  const tabs = [
    ...(isAssistente ? [{ id: 'inicio', label: 'Início', icon: 'home' as const, component: <InicioAssistentePane empresaId={empId} /> }] : []),
    { id: 'pedido', label: 'Pedido', icon: 'pedido'    as const, component: <PedidosContent /> },
    { id: 'resumo', label: 'Resumo', icon: 'relatorio' as const, component: <ResumoColabPane empresaId={empId} /> },
  ]

    const isAss = meta?.is_assistente === true
  return <AppShell tabs={tabs} nome={meta?.nome ?? ''} badge={isAss ? 'assistente' : 'colaborador'} role={isAss ? 'Assistente' : 'Colaborador'} subInfo={empNome} />
}
