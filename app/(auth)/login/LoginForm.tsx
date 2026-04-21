'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { Btn, Input } from '@/components/ui'
import { MenuvLogo } from '@/components/ui/MenuvLogo'

function parseJwt(token: string) {
  try { return JSON.parse(atob(token.split('.')[1])) } catch { return null }
}

export default function LoginForm() {
  const router = useRouter()
  const [email,   setEmail]   = useState('')
  const [senha,   setSenha]   = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const sb = supabaseBrowser()
    sb.auth.getSession().then(({ data }: { data: any }) => {
      if (data.session) {
        const jwt = parseJwt(data.session.access_token)
        const appRole = jwt?.app_metadata?.app_role
        redirect(appRole, jwt?.app_metadata?.is_gestor)
      }
    })
  }, [])

  function redirect(appRole: string, isGestor?: boolean) {
    if (appRole === 'admin')       { router.push('/admin');     return }
    if (appRole === 'restaurante') { router.push('/dashboard'); return }
    if (appRole === 'colaborador' && isGestor) { router.push('/gestor'); return }
    router.push('/pedidos')
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email || !senha) { setError('Preencha e-mail e senha.'); return }

    setLoading(true)
    const sb = supabaseBrowser()

    const { data, error: sbError } = await sb.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: senha,
    })

    if (sbError || !data.session) {
      setLoading(false)
      setError('E-mail ou senha incorretos.')
      return
    }

    await new Promise(resolve => setTimeout(resolve, 500))
    const { data: refreshed } = await sb.auth.refreshSession()
    setLoading(false)

    const jwt = parseJwt(refreshed.session?.access_token ?? '')
    const appRole = jwt?.app_metadata?.app_role

    if (appRole === 'suspenso') {
      await sb.auth.signOut()
      setError('Conta suspensa. Entre em contato com o suporte Menuv.')
      return
    }

    redirect(appRole, jwt?.app_metadata?.is_gestor)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#080c14]">
      <div className="anim-fade-up w-full max-w-[380px]" style={{
        background: 'linear-gradient(145deg, #0d1525, #121e32)',
        border: '1px solid rgba(0,232,122,.3)',
        borderRadius: 16,
        padding: '36px 28px',
        boxShadow: '0 20px 60px rgba(0,0,0,.6)',
      }}>

        {/* Header */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-14 h-14 flex items-center justify-center rounded-[14px]
            bg-[linear-gradient(145deg,rgba(0,232,122,.15),rgba(0,196,99,.05))]
            border border-[rgba(0,232,122,.3)]
            shadow-[0_0_24px_rgba(0,232,122,.15)]">
            <MenuvLogo size={36} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-[#ddeaf8] tracking-tight">Menuv</h1>
            <p className="font-[var(--mono)] text-[10px] tracking-[2px] text-[#3d5875] uppercase mt-1">
              Gestão de refeições
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <Input
            label="E-mail"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={e => { setEmail(e.target.value); setError('') }}
            autoComplete="username"
          />
          <Input
            label="Senha"
            type="password"
            placeholder="••••••••"
            value={senha}
            onChange={e => { setSenha(e.target.value); setError('') }}
            autoComplete="current-password"
          />

          {error && (
            <p className="font-[var(--mono)] text-xs text-[#ff4d6a] text-center">{error}</p>
          )}

          <Btn type="submit" loading={loading} className="mt-1">
            Entrar
          </Btn>
        </form>

        <div className="mt-5 text-center">
          <p className="font-[var(--mono)] text-[10px] text-[#3d5875] mb-2">
            É um restaurante?
          </p>
          <button
            onClick={() => router.push('/cadastro?tipo=restaurante')}
            className="font-[var(--mono)] text-[10px] tracking-[1px] text-[#00e87a] hover:text-[#00c463] transition-colors uppercase cursor-pointer bg-transparent border-none">
            Criar conta de restaurante →
          </button>
        </div>
      </div>
    </div>
  )
}
