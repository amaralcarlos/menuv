import { Suspense } from 'react'
import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-[var(--mono)] text-[#3d5875]">A carregar...</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
