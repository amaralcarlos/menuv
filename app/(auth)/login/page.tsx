'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { Btn, Input } from '@/components/ui'
import { MenuvLogo } from '@/components/ui/MenuvLogo'

const ROLE_META = {
  restaurante: { icon: '🏪', title: 'Acesso do restaurante', accent: '#00e87a', borderColor: 'rgba(0,232,122,.3)', showRegister: true,  registerPath: '/cadastro?tipo=restaurante' },
  gestor:      { icon: '🏢', title: 'Acesso do gestor',      accent: '#4da6ff', borderColor: 'rgba(77,166,255,.3)', showRegister: false, registerPath: '' },
  colaborador: { icon: '👤', title: 'Acesso do colaborador', accent: '#a259ff', borderColor: 'rgba(162,89,255,.3)', showRegister: true,  registerPath: '/cadastro?tipo=colaborador' },
  admin:       { icon: '🔐', title: 'Acesso restrito',       accent: '#ff4d6a', borderColor: 'rgba(255,77,106,.3)', showRegister: false, registerPath: '' },
}

export default function LoginPage() {
  const router = useRouter()
  const params = useSearchParams()
  const role   = (params.get('role') ?? 'colaborador') as keyof typeof ROLE_META
  const meta   = ROLE_META[role] ?? ROLE_META.colaborador

  const [email,  setEmail]  = useState('')
  const [senha,  setSenha]  = useState('')
  const [error,  setError]  = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    const sb = supabaseBrowser()
    sb.auth.getSession().then(({ data }) => {
      if (data.session) redirectAfterLogin(data.session.user.app_metadata?.app_role)
    })
  }, [])

  function redirectAfterLogin(appRole?: string) {
    switch (appRole) {
      case 'admin':       router.push('/admin');       break
      case 'restaurante':
      case 'rest_usuario':router.push('/dashboard');   break
      default:            router.push('/pedidos');     break
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email || !senha) { setError('Preencha e-mail e senha.'); return }

    setLoading(true)
    const sb = supabaseBrowser()

    const { data, error: sbError } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha })

    setLoading(false)

    if (sbError || !data.session) {
      setError(sbError?.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : (sbError?.message ?? 'Erro ao entrar.'))
      return
    }

    const appRole = data.session.user.app_metadata?.app_role
    if (appRole === 'suspenso') {
      await sb.auth.signOut()
      setError('Conta suspensa. Entre em contato com o suporte Menuv.')
      return
    }

    redirectAfterLogin(appRole)
  }

  const isAdmin = role === 'admin'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: isAdmin ? '#06060f' : undefined }}>

      <div className="anim-fade-up w-full max-w-[380px]"
        style={{
          background: 'linear-gradient(145deg, #0d1525, #121e32)',
          border: `1px solid ${meta.borderColor}`,
          borderRadius: 16,
          padding: '36px 28px',
          boxShadow: '0 20px 60px rgba(0,0,0,.6)',
        }}>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-9 h-9 flex items-center justify-center rounded-[10px]
            bg-[rgba(0,232,122,.06)] border border-[rgba(0,232,122,.15)]">
            <MenuvLogo size={26} />
          </div>
          <span className="text-xl font-black text-[#ddeaf8] tracking-tight">{meta.icon} Menuv</span>
        </div>
        <div className="font-[var(--mono)] text-[10px] tracking-[2px] text-[#3d5875] uppercase mb-7">
          {meta.title}
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

          <Btn type="submit" loading={loading} variant={isAdmin ? 'danger' : 'primary'} className="mt-1">
            Entrar
          </Btn>
        </form>

        <div className="mt-4 flex flex-col items-center gap-2">
          {meta.showRegister && (
            <button
              onClick={() => router.push(meta.registerPath)}
              className="font-[var(--mono)] text-[10px] tracking-[1px] text-[#3d5875] hover:text-[#7a96b8] transition-colors uppercase cursor-pointer bg-transparent border-none"
            >
              Novo aqui? Criar conta →
            </button>
          )}
          <button
            onClick={() => router.push('/')}
            className="font-[var(--mono)] text-[10px] tracking-[1px] text-[#3d5875] hover:text-[#7a96b8] transition-colors uppercase cursor-pointer bg-transparent border-none"
          >
            ← Voltar
          </button>
        </div>
      </div>
    </div>
  )
}
