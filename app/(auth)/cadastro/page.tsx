import { Suspense } from 'react'
import CadastroForm from './CadastroForm'

export default function CadastroPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-[var(--mono)] text-[#3d5875]">A carregar...</p>
      </div>
    }>
      <CadastroForm />
    </Suspense>
  )
}
