'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { Btn, Input } from '@/components/ui'

type Etapa = 'verificando' | 'formulario' | 'sucesso' | 'erro'

export default function ResetSenhaForm() {
  const router  = useRouter()
  const [etapa,   setEtapa]   = useState<Etapa>('verificando')
  const [senha,   setSenha]   = useState('')
  const [confirm, setConfirm] = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  // O Supabase redireciona com #access_token=...&type=recovery na URL.
  // O SDK detecta o hash e emite o evento PASSWORD_RECOVERY automaticamente.
  useEffect(() => {
    const sb = supabaseBrowser()

    // Escuta o evento de recuperação
    const { data: { subscription } } = sb.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setEtapa('formulario')
      }
    })

    // Fallback: se já há sessão ativa (ex: reload após o link)
    sb.auth.getSession().then(({ data }: { data: any }) => {
      if (data.session) setEtapa('formulario')
      else {
        // Aguarda até 4s pelo evento do SDK antes de considerar link inválido
        setTimeout(() => {
          setEtapa(prev => prev === 'verificando' ? 'erro' : prev)
        }, 4000)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (senha.length < 6)        { setError('A senha deve ter pelo menos 6 caracteres.'); return }
    if (senha !== confirm)        { setError('As senhas não coincidem.'); return }

    setLoading(true)
    const sb = supabaseBrowser()
    const { error: sbError } = await sb.auth.updateUser({ password: senha })
    setLoading(false)

    if (sbError) {
      setError('Não foi possível redefinir a senha. O link pode ter expirado.')
    } else {
      await sb.auth.signOut()
      setEtapa('sucesso')
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

        {/* ── Verificando link ── */}
        {etapa === 'verificando' && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-6 h-6 border-2 border-[#00e87a] border-t-transparent rounded-full animate-spin" />
            <p className="font-[var(--mono)] text-[11px] text-[#3d5875]">Verificando link…</p>
          </div>
        )}

        {/* ── Link inválido / expirado ── */}
        {etapa === 'erro' && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-[rgba(255,77,106,.2)] bg-[rgba(255,77,106,.05)] px-4 py-3">
              <p className="font-[var(--mono)] text-[11px] text-[#ff4d6a] leading-relaxed">
                Link inválido ou expirado. Solicite um novo link de redefinição.
              </p>
            </div>
            <Btn variant="secondary" onClick={() => router.push('/')}>
              Voltar ao login
            </Btn>
          </div>
        )}

        {/* ── Formulário de nova senha ── */}
        {etapa === 'formulario' && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[#ddeaf8] text-sm font-semibold mb-1">Nova senha</p>
              <p className="font-[var(--mono)] text-[10px] text-[#3d5875] leading-relaxed">
                Escolha uma senha segura com pelo menos 6 caracteres.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Nova senha"
                type="password"
                placeholder="••••••••"
                value={senha}
                onChange={e => { setSenha(e.target.value); setError('') }}
                autoComplete="new-password"
              />
              <Input
                label="Confirmar senha"
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setError('') }}
                autoComplete="new-password"
              />

              {error && (
                <p className="font-[var(--mono)] text-xs text-[#ff4d6a] text-center">{error}</p>
              )}

              <Btn type="submit" loading={loading} className="mt-1">
                Salvar nova senha
              </Btn>
            </form>
          </div>
        )}

        {/* ── Sucesso ── */}
        {etapa === 'sucesso' && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-[rgba(0,232,122,.2)] bg-[rgba(0,232,122,.05)] px-4 py-3">
              <p className="font-[var(--mono)] text-[11px] text-[#00e87a] leading-relaxed">
                Senha redefinida com sucesso! Faça login com sua nova senha.
              </p>
            </div>
            <Btn onClick={() => router.push('/')}>
              Ir para o login
            </Btn>
          </div>
        )}

      </div>
    </div>
  )
}
