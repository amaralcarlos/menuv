import { Suspense } from 'react'
import LoginForm from './(auth)/login/LoginForm'

export default function RootPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center">
        <p className="font-[var(--mono)] text-[#3d5875]">A carregar...</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
