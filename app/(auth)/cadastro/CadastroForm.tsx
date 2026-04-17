'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Btn, Input } from '@/components/ui'
import { MenuvLogo } from '@/components/ui/MenuvLogo'

type Step = 'conta' | 'empresa' | 'sucesso'

export default function CadastroForm() {
  const router = useRouter()
  const params  = useSearchParams()
  const tipo    = params.get('tipo') ?? 'colaborador'
  const ref     = params.get('ref') ?? ''   // rest_001 vindo do link do restaurante
  const isGestor = tipo === 'gestor'
  const isRest   = tipo === 'restaurante'

  const [step,    setStep]    = useState<Step>('conta')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  // Dados da conta
  const [nome,  setNome]  = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [conf,  setConf]  = useState('')

  // Dados da empresa (só para gestor)
  const [empNome,  setEmpNome]  = useState('')
  const [empHl,    setEmpHl]    = useState('09:30')
  const [empPreco, setEmpPreco] = useState('15.00')

  // IDs gerados após cadastro
  const [colabId, setColabId] = useState('')

  // ── Step 1: Criar conta ──────────────────────────────────
  async function handleConta(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!nome || !email || !senha) { setError('Preencha todos os campos.'); return }
    if (senha !== conf) { setError('As senhas não coincidem.'); return }
    if (isGestor && !ref) { setError('Link de convite inválido. Peça um novo link ao restaurante.'); return }

    setLoading(true)

    if (isRest) {
      // Cadastro de restaurante
      const res  = await fetch('/api/restaurantes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, senha }),
      })
      const data = await res.json()
      setLoading(false)
      if (!data.success) { setError(data.error ?? 'Erro ao criar conta.'); return }
      setStep('sucesso')
      return
    }

    // Cadastro de colaborador ou gestor
    const res  = await fetch('/api/colaboradores/cadastro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome,
        email,
        senha,
        restauranteRef: ref,         // passa a ref do restaurante
        isGestor,
        empresaId: isGestor ? null : params.get('emp') ?? '',
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (!data.success) { setError(data.error ?? 'Erro ao criar conta.'); return }

    if (isGestor) {
      setColabId(data.data?.id ?? '')
      setStep('empresa')
    } else {
      setStep('sucesso')
    }
  }

  // ── Step 2: Cadastrar empresa (só gestor) ────────────────
  async function handleEmpresa(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!empNome) { setError('Nome da empresa é obrigatório.'); return }

    setLoading(true)
    const res  = await fetch('/api/empresas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome:           empNome,
        horarioLimite:  empHl,
        preco:          parseFloat(empPreco) || 15,
        restauranteRef: ref,
        colabId:        colabId,
      }),
    })
    
    const data = await res.json()
    setLoading(false)
    if (!data.success) { setError(data.error ?? 'Erro ao cadastrar empresa.'); return }
    setStep('sucesso')
  }

  // ── Render ───────────────────────────────────────────────
  const title = isRest ? '🏪 Novo restaurante'
              : isGestor ? '🏢 Cadastro de gestor'
              : '👤 Criar conta'

  const subtitle = isRest ? 'Crie sua conta na plataforma'
                 : isGestor ? (step === 'empresa' ? 'Cadastre sua empresa' : 'Crie sua conta pessoal')
                 : 'Entre com o código da empresa'

  if (step === 'sucesso') return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center anim-fade-up">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-[#ddeaf8] mb-2">
          {isGestor ? 'Conta e empresa criadas!' : 'Conta criada!'}
        </h2>
        <p className="font-[var(--mono)] text-xs text-[#3d5875] mb-6">
          Faça login para continuar.
        </p>
        <Btn
          onClick={() => router.push(`/login?role=${isRest ? 'restaurante' : isGestor ? 'gestor' : 'colaborador'}`)}
          className="max-w-xs mx-auto"
        >
          Ir para o login
        </Btn>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="anim-fade-up w-full max-w-[380px]" style={{
        background: 'linear-gradient(145deg,#0d1525,#121e32)',
        border: '1px solid #253d5e',
        borderRadius: 16,
        padding: '36px 28px',
        boxShadow: '0 20px 60px rgba(0,0,0,.6)',
      }}>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-9 h-9 flex items-center justify-center rounded-[10px] bg-[rgba(0,232,122,.06)] border border-[rgba(0,232,122,.15)]">
            <MenuvLogo size={26} />
          </div>
          <span className="text-xl font-black text-[#ddeaf8] tracking-tight">{title}</span>
        </div>
        <div className="font-[var(--mono)] text-[10px] tracking-[2px] text-[#3d5875] uppercase mb-2">
          {subtitle}
        </div>

        {/* Steps indicator (só para gestor) */}
        {isGestor && (
          <div className="flex gap-2 mb-6 mt-2">
            {(['conta', 'empresa'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-[var(--mono)]
                  ${step === s || ((step as string) === 'sucesso' && i === 1)
                    ? 'bg-[#00e87a] text-[#003320]'
                    : step === 'empresa' && s === 'conta'
                      ? 'bg-[rgba(0,232,122,.2)] text-[#00e87a]'
                      : 'bg-[#1c2e48] text-[#3d5875]'}`}>
                  {step === 'empresa' && s === 'conta' ? '✓' : i + 1}
                </div>
                <span className={`font-[var(--mono)] text-[10px] uppercase tracking-[1px]
                  ${step === s ? 'text-[#00e87a]' : 'text-[#3d5875]'}`}>
                  {s === 'conta' ? 'Conta' : 'Empresa'}
                </span>
                {i === 0 && <span className="text-[#1c2e48] mx-1">→</span>}
              </div>
            ))}
          </div>
        )}

        {/* Step 1: Conta */}
        {step === 'conta' && (
          <form onSubmit={handleConta} className="flex flex-col gap-4">
            <Input label="Seu nome" value={nome} onChange={e => setNome(e.target.value)}
              placeholder={isRest ? 'Nome do restaurante' : 'João Silva'} />
            <Input label="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com" autoComplete="email" />
            {!isRest && !isGestor && (
              <Input label="Código da empresa" value={params.get('emp') ?? ''}
                placeholder="Será preenchido automaticamente pelo link"
                disabled className="opacity-50" />
            )}
            <Input label="Senha" type="password" value={senha} onChange={e => setSenha(e.target.value)}
              placeholder="Mínimo 4 caracteres" autoComplete="new-password" />
            <Input label="Confirmar senha" type="password" value={conf} onChange={e => setConf(e.target.value)}
              placeholder="Repita a senha" />
            {error && <p className="font-[var(--mono)] text-xs text-[#ff4d6a] text-center">{error}</p>}
            <Btn type="submit" loading={loading} className="mt-1">
              {isGestor ? 'Continuar →' : 'Criar conta'}
            </Btn>
          </form>
        )}

        {/* Step 2: Empresa (só gestor) */}
        {step === 'empresa' && (
          <form onSubmit={handleEmpresa} className="flex flex-col gap-4">
            <Input label="Nome da empresa" value={empNome} onChange={e => setEmpNome(e.target.value)}
              placeholder="Empresa Ltda." />
            <Input label="Horário limite pedidos" value={empHl} onChange={e => setEmpHl(e.target.value)}
              placeholder="09:30" />
            <Input label="Preço por refeição (R$)" type="number" step="0.01"
              value={empPreco} onChange={e => setEmpPreco(e.target.value)} placeholder="15.00" />
            {error && <p className="font-[var(--mono)] text-xs text-[#ff4d6a] text-center">{error}</p>}
            <Btn type="submit" loading={loading} className="mt-1">Finalizar cadastro</Btn>
          </form>
        )}

        <div className="mt-4 text-center">
          <button onClick={() => router.push(`/login?role=${isRest ? 'restaurante' : isGestor ? 'gestor' : 'colaborador'}`)}
            className="font-[var(--mono)] text-[10px] tracking-[1px] text-[#3d5875] hover:text-[#7a96b8] transition-colors uppercase cursor-pointer bg-transparent border-none">
            ← Já tenho conta
          </button>
        </div>
      </div>
    </div>
  )
}
