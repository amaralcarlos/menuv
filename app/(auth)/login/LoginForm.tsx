'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { Btn, Input } from '@/components/ui'
import { MenuvLogo } from '@/components/ui/MenuvLogo'

const ROLE_META = {
  restaurante: { icon: '🏪', title: 'Acesso do restaurante', isAdmin: false, showRegister: true,  registerPath: '/cadastro?tipo=restaurante' },
  gestor:      { icon: '🏢', title: 'Acesso do gestor',      isAdmin: false, showRegister: false, registerPath: '' },
  colaborador: { icon: '👤', title: 'Acesso do colaborador', isAdmin: false, showRegister: true,  registerPath: '/cadastro?tipo=colaborador' },
  admin:       { icon: '🔐', title: 'Acesso restrito',       isAdmin: true,  showRegister: false, registerPath: '' },
}

function redirectAfterLogin(appRole: string | undefined, router: ReturnType<typeof useRouter>) {
  switch (appRole) {
    case 'admin':        router.push('/admin');     break
    case 'restaurante':
    case 'rest_usuario': router.push('/dashboard'); break
    default:             router.push('/pedidos');   break
  }
}

export default function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const role   = (params.get('role') ?? 'colaborador') as keyof typeof ROLE_META
  const meta   = ROLE_META[role] ?? ROLE_META.colaborador

  const [email,   setEmail]   = useState('')
  const [senha,   setSenha]   = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const sb = supabaseBrowser()
    sb.auth.getSession().then(({ data }: { data: any }) => {
      if (data.session) redirectAfterLogin(data.session.user.app_metadata?.app_role, router)
    })
  }, [])

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
    setError(sbError?.message === 'Invalid login credentials'
      ? 'E-mail ou senha incorretos.'
      : (sbError?.message ?? 'Erro ao entrar.'))
    return
  }

  // Força refresh para obter os claims do Hook
  const { data: refreshed } = await sb.auth.refreshSession()
  setLoading(false)

  const appRole = refreshed.session?.user?.app_metadata?.app_role

  if (appRole === 'suspenso') {
    await sb.auth.signOut()
    setError('Conta suspensa. Entre em contato com o suporte Menuv.')
    return
  }

  router.push(
    appRole === 'admin' ? '/admin' :
    appRole === 'colaborador' ? '/pedidos' :
    '/dashboard'
  )
}
  const borderColor = meta.isAdmin ? 'rgba(255,77,106,.3)' : 'rgba(0,232,122,.3)'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: meta.isAdmin ? '#06060f' : undefined }}>

      <div className="anim-fade-up w-full max-w-[380px]" style={{
        background: 'linear-gradient(145deg, #0d1525, #121e32)',
        border: `1px solid ${borderColor}`,
        borderRadius: 16,
        padding: '36px 28px',
        boxShadow: '0 20px 60px rgba(0,0,0,.6)',
      }}>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-9 h-9 flex items-center justify-center rounded-[10px] bg-[rgba(0,232,122,.06)] border border-[rgba(0,232,122,.15)]">
            <MenuvLogo size={26} />
          </div>
          <span className="text-xl font-black text-[#ddeaf8] tracking-tight">
            {meta.icon} Menuv
          </span>
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

          <Btn
            type="submit"
            loading={loading}
            variant={meta.isAdmin ? 'danger' : 'primary'}
            className="mt-1"
          >
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
