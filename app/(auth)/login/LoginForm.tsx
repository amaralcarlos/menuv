'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { Btn, Input, PasswordInput } from '@/components/ui'

const SAVED_EMAIL_KEY = 'menuv_saved_email'

function parseJwt(token: string) {
  try { return JSON.parse(atob(token.split('.')[1])) } catch { return null }
}

export default function LoginForm() {
  const router = useRouter()
  const [email,   setEmail]   = useState('')
  const [senha,   setSenha]   = useState('')
  const [lembrar, setLembrar] = useState(false)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  // "Esqueci a senha"
  const [modoReset,    setModoReset]    = useState(false)
  const [emailReset,   setEmailReset]   = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMsg,     setResetMsg]     = useState('')
  const [resetErr,     setResetErr]     = useState('')

  // Pré-preenche e-mail salvo
  useEffect(() => {
    const saved = localStorage.getItem(SAVED_EMAIL_KEY)
    if (saved) {
      setEmail(saved)
      setLembrar(true)
    }
  }, [])

  // Redireciona se já estiver logado
  useEffect(() => {
    const sb = supabaseBrowser()
    sb.auth.getSession().then(({ data }: { data: any }) => {
      if (data.session) {
        const jwt = parseJwt(data.session.access_token)
        redirect(jwt?.app_metadata?.app_role, jwt?.app_metadata?.is_gestor)
      }
    })
  }, [])

  function redirect(appRole: string, isGestor?: boolean) {
    if (appRole === 'admin')                   { router.push('/admin');     return }
    if (appRole === 'restaurante')             { router.push('/dashboard'); return }
    if (appRole === 'colaborador' && isGestor) { router.push('/gestor');    return }
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

    // Lembrar de mim
    if (lembrar) {
      localStorage.setItem(SAVED_EMAIL_KEY, email.trim().toLowerCase())
    } else {
      localStorage.removeItem(SAVED_EMAIL_KEY)
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

  async function handleResetSenha(e: React.FormEvent) {
    e.preventDefault()
    setResetErr('')
    setResetMsg('')
    const trimmed = emailReset.trim().toLowerCase()
    if (!trimmed) { setResetErr('Informe seu e-mail.'); return }

    setResetLoading(true)
    const sb = supabaseBrowser()
    const { error } = await sb.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${window.location.origin}/reset-senha`,
    })
    setResetLoading(false)

    if (error) {
      setResetErr('Não foi possível enviar o e-mail. Tente novamente.')
    } else {
      setResetMsg('E-mail enviado! Verifique sua caixa de entrada e siga as instruções.')
    }
  }

  const cardStyle: React.CSSProperties = {
    background: 'linear-gradient(145deg, #0d1525, #121e32)',
    border: '1px solid rgba(0,232,122,.3)',
    borderRadius: 16,
    padding: '36px 28px',
    boxShadow: '0 20px 60px rgba(0,0,0,.6)',
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#080c14]">
      <div className="anim-fade-up w-full max-w-[380px]" style={cardStyle}>

        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-14 h-14 flex items-center justify-center rounded-[14px]
            bg-[linear-gradient(145deg,rgba(0,232,122,.15),rgba(0,196,99,.05))]
            border border-[rgba(0,232,122,.3)]
            shadow-[0_0_24px_rgba(0,232,122,.15)]">
            <img src="/favicon.svg" alt="Menuv" width={36} height={36} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-[#ddeaf8] tracking-tight">Menuv</h1>
            <p className="font-[var(--mono)] text-[10px] tracking-[2px] text-[#3d5875] uppercase mt-1">
              Gestão de refeições
            </p>
          </div>
        </div>

        {/* ── Formulário de login ── */}
        {!modoReset && (
          <>
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <Input
                label="E-mail"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                autoComplete="username"
              />

              <div className="flex flex-col gap-1">
                <PasswordInput
                  placeholder="••••••••"
                  value={senha}
                  onChange={e => { setSenha(e.target.value); setError('') }}
                  autoComplete="current-password"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => { setModoReset(true); setEmailReset(email); setError('') }}
                    className="font-[var(--mono)] text-[10px] text-[#3d5875] hover:text-[#00e87a] transition-colors cursor-pointer bg-transparent border-none mt-0.5"
                  >
                    Esqueci a senha
                  </button>
                </div>
              </div>

              {/* Lembrar de mim */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => setLembrar(v => !v)}
                  className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all flex-shrink-0
                    ${lembrar
                      ? 'bg-[#00e87a] border-[#00e87a]'
                      : 'bg-transparent border-[#2a4060] hover:border-[#00e87a]'
                    }`}
                >
                  {lembrar && (
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                      <path d="M1 3.5L3.5 6L8 1" stroke="#080c14" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span
                  onClick={() => setLembrar(v => !v)}
                  className="font-[var(--mono)] text-[10px] text-[#3d5875]"
                >
                  Lembrar de mim
                </span>
              </label>

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
                className="font-[var(--mono)] text-[10px] tracking-[1px] text-[#00e87a] hover:text-[#00c463] transition-colors uppercase cursor-pointer bg-transparent border-none"
              >
                Criar conta de restaurante →
              </button>
            </div>
          </>
        )}

        {/* ── Modo "Esqueci a senha" ── */}
        {modoReset && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[#ddeaf8] text-sm font-semibold mb-1">Redefinir senha</p>
              <p className="font-[var(--mono)] text-[10px] text-[#3d5875] leading-relaxed">
                Informe seu e-mail cadastrado. Enviaremos um link para você criar uma nova senha.
              </p>
            </div>

            {!resetMsg ? (
              <form onSubmit={handleResetSenha} className="flex flex-col gap-4">
                <Input
                  label="E-mail"
                  type="email"
                  placeholder="seu@email.com"
                  value={emailReset}
                  onChange={e => { setEmailReset(e.target.value); setResetErr('') }}
                  autoComplete="email"
                />

                {resetErr && (
                  <p className="font-[var(--mono)] text-xs text-[#ff4d6a] text-center">{resetErr}</p>
                )}

                <Btn type="submit" loading={resetLoading}>
                  Enviar link de redefinição
                </Btn>
              </form>
            ) : (
              <div className="rounded-xl border border-[rgba(0,232,122,.2)] bg-[rgba(0,232,122,.05)] px-4 py-3">
                <p className="font-[var(--mono)] text-[11px] text-[#00e87a] leading-relaxed">{resetMsg}</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => { setModoReset(false); setResetMsg(''); setResetErr('') }}
              className="font-[var(--mono)] text-[10px] text-[#3d5875] hover:text-[#ddeaf8] transition-colors cursor-pointer bg-transparent border-none text-center"
            >
              ← Voltar ao login
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
