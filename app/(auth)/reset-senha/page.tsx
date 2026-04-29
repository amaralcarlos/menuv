import { Suspense } from 'react'
import ResetSenhaForm from './ResetSenhaForm'

export default function ResetSenhaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center">
        <p className="font-[var(--mono)] text-[#3d5875]">A carregar…</p>
      </div>
    }>
      <ResetSenhaForm />
    </Suspense>
  )
}
