'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useApi } from '@/lib/use-api'
import { Card, SectionLabel, Spinner } from '@/components/ui'
import { MenuvLogo } from '@/components/ui/MenuvLogo'

export default function GestorPage() {
  const { meta, signOut } = useAuth()
  const { call } = useApi()
  const router = useRouter()
  const [empresas, setEmpresas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!meta?.restaurante_id) return
    call<any[]>(`/api/empresas?restauranteId=${meta.restaurante_id}`)
      .then(r => {
        if (r.success) setEmpresas(r.data)
        setLoading(false)
      })
  }, [meta])

  if (loading) return (
    <div className="min-h-screen bg-[#080c14] flex items-center justify-center">
      <Spinner />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#080c14] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3
        bg-[rgba(6,10,15,.92)] border-b border-[rgba(0,232,122,.08)] backdrop-blur-[24px]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 flex items-center justify-center rounded-[10px]
            bg-[linear-gradient(145deg,rgba(0,232,122,.15),rgba(0,196,99,.05))]
            border border-[rgba(0,232,122,.3)]">
            <MenuvLogo size={26} />
          </div>
          <div>
            <div className="font-extrabold text-base text-[#ddeaf8] tracking-tight">Menuv</div>
            <div className="font-[var(--mono)] text-[10px] tracking-[2px] text-[#00e87a] uppercase">gestor</div>
          </div>
        </div>
        <button onClick={signOut}
          className="font-[var(--mono)] text-[10px] tracking-[1px] text-[#3d5875] hover:text-[#ff4d6a] transition-colors uppercase cursor-pointer bg-transparent border-none">
          Sair
        </button>
      </header>

      <div className="px-4 pt-6 pb-24 max-w-md mx-auto w-full">
        <SectionLabel>Selecione a empresa</SectionLabel>

        {empresas.length === 0 && (
          <Card>
            <p className="text-center font-[var(--mono)] text-xs text-[#3d5875] py-4">
              Nenhuma empresa encontrada.
            </p>
          </Card>
        )}

        {empresas.map(e => (
          <button key={e.id} onClick={() => router.push(`/gestor/${e.id}`)}
            className="w-full text-left mb-2.5 group">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-[#ddeaf8] group-hover:text-[#00e87a] transition-colors">
                    {e.nome}
                  </p>
                  <p className="font-[var(--mono)] text-[10px] text-[#3d5875] mt-0.5">
                    Limite: {e.horario_limite} · R$ {Number(e.preco_por_refeicao).toFixed(2)}/refeição
                  </p>
                </div>
                <svg className="text-[#3d5875] group-hover:text-[#00e87a] transition-colors flex-shrink-0"
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </Card>
          </button>
        ))}
      </div>
    </div>
  )
}
