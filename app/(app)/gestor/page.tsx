'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Spinner } from '@/components/ui'

export default function GestorPage() {
  const { meta } = useAuth()
  const router   = useRouter()

  useEffect(() => {
    if (!meta) return
    if (meta.empresa_id) {
      // Gestor com uma empresa — vai direto
      router.replace(`/gestor/${meta.empresa_id}`)
    }
  }, [meta])

  return (
    <div className="min-h-screen bg-[#080c14] flex items-center justify-center">
      <Spinner />
    </div>
  )
}
