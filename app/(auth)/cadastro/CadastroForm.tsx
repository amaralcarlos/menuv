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
  const ref     = params.get('ref') ?? ''
  const empId   = params.get('emp') ?? ''
  const isGestor = tipo === 'gestor'
  const isRest   = tipo === 'restaurante'
  const isColab  = tipo === 'colaborador'

  const [step,    setStep]    = useState<Step>('conta')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const [nome,  setNome]  = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [conf,  setConf]  = useState('')

  const [empNome,   setEmpNome]   = useState('')
  const [empHl,     setEmpHl]     = useState('09:30')
  const [empPreco,  setEmpPreco]  = useState('15.00')
  const [empFormato, setEmpFormato] = useState<'marmita' | 'buffet'>('marmita')

  const [colabId, setColabId] = useState('')

  async function handleConta(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!nome || !email || !senha) { setError('Preencha todos os campos.'); return }
    if (senha !== conf) { setError('As senhas não coincidem.'); return }
    if (isGestor && !ref) { setError('Link de convite inválido.'); return }
    if (isColab && !empId) { setError('Link de convite inválido.'); return }

    setLoading(true)

    if (isRest) {
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

    const res = await fetch('/api/colaboradores/cadastro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome, email, senha,
        restauranteRef: ref,
        isGestor,
        empresaId: isColab ? empId : null,
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

  async function handleEmpresa(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!empNome) { setError('Nome da empresa é obrigatório.'); return }

    setLoading(true)
    const res = await fetch('/api/empresas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome:           empNome,
        horarioLimite:  empHl,
        preco:          parseFloat(empPreco) || 15,
        restauranteRef: ref,
        colabId,
        formato:        empFormato,
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (!data.success) { setError(data.error ?? 'Erro ao cadastrar empresa.'); return }
    setStep('sucesso')
  }

  if (step === 'sucesso') return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#080c14]">
      <div className="text-center anim-fade-up">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-[#ddeaf8] mb-2">Conta criada!</h2>
        <p className="font-[var(--mono)] text-xs text-[#3d5875] mb-6">
          Faça login para continuar.
        </p>
        <Btn onClick={() => router.push('/')} className="max-w-xs mx-auto">
          Ir para o login
        </Btn>
      </div>
    </div>
  )

  const title = isRest ? '🏪 Novo restaurante'
              : isGestor ? (step === 'empresa' ? '🏢 Cadastrar empresa' : '🏢 Cadastro de gestor')
              : '👤 Criar conta'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#080c14]">
      <div className="anim-fade-up w-full max-w-[380px]" style={{
        background: 'linear-gradient(145deg,#0d1525,#121e32)',
        border: '1px solid #253d5e',
        borderRadius: 16,
        padding: '36px 28px',
        boxShadow: '0 20px 60px rgba(0,0,0,.6)',
      }}>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-9 h-9 flex items-center justify-center rounded-[10px] bg-[rgba(0,232,122,.06)] border border-[rgba(0,232,122,.15)]">
            <MenuvLogo size={26} />
          </div>
          <span className="text-xl font-black text-[#ddeaf8] tracking-tight">{title}</span>
        </div>
        <div className="font-[var(--mono)] text-[10px] tracking-[2px] text-[#3d5875] uppercase mb-6">
          {isRest ? 'Crie sua conta na plataforma' : isGestor ? 'Convite de restaurante' : 'Convite de empresa'}
        </div>

        {/* Steps (só gestor) */}
        {isGestor && (
          <div className="flex gap-2 mb-6">
            {(['conta', 'empresa'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-[var(--mono)]
                  ${step === s ? 'bg-[#00e87a] text-[#003320]'
                    : step === 'empresa' && s === 'conta' ? 'bg-[rgba(0,232,122,.2)] text-[#00e87a]'
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

        {step === 'conta' && (
          <form onSubmit={handleConta} className="flex flex-col gap-4">
            <Input label={isRest ? 'Nome do restaurante' : 'Seu nome'} value={nome}
              onChange={e => setNome(e.target.value)} placeholder={isRest ? 'Restaurante Bom Sabor' : 'João Silva'} />
            <Input label="E-mail" type="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" autoComplete="email" />
            <Input label="Senha" type="password" value={senha}
              onChange={e => setSenha(e.target.value)} placeholder="Mínimo 4 caracteres" autoComplete="new-password" />
            <Input label="Confirmar senha" type="password" value={conf}
              onChange={e => setConf(e.target.value)} placeholder="Repita a senha" />
            {error && <p className="font-[var(--mono)] text-xs text-[#ff4d6a] text-center">{error}</p>}
            <Btn type="submit" loading={loading} className="mt-1">
              {isGestor ? 'Continuar →' : 'Criar conta'}
            </Btn>
          </form>
        )}

        {step === 'empresa' && (
          <form onSubmit={handleEmpresa} className="flex flex-col gap-4">
            <Input label="Nome da empresa" value={empNome}
              onChange={e => setEmpNome(e.target.value)} placeholder="Empresa Ltda." />
            <Input label="Horário limite pedidos" value={empHl}
              onChange={e => setEmpHl(e.target.value)} placeholder="09:30" />
            <Input label="Preço por refeição (R$)" type="number" step="0.01"
              value={empPreco} onChange={e => setEmpPreco(e.target.value)} placeholder="15.00" />

            {/* Formato de entrega */}
            <div>
              <p className="font-[var(--mono)] text-[10px] text-[#3d5875] uppercase tracking-[1px] mb-2">
                Formato de entrega
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(['marmita', 'buffet'] as const).map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setEmpFormato(f)}
                    className={`py-2.5 rounded-[8px] font-[var(--mono)] text-xs uppercase tracking-[1px] border transition-all
                      ${empFormato === f
                        ? 'bg-[rgba(0,232,122,.1)] border-[rgba(0,232,122,.4)] text-[#00e87a]'
                        : 'bg-transparent border-[#253d5e] text-[#3d5875] hover:border-[#3d5875]'
                      }`}>
                    {f === 'marmita' ? '🍱 Marmita' : '🍽️ Buffet'}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="font-[var(--mono)] text-xs text-[#ff4d6a] text-center">{error}</p>}
            <Btn type="submit" loading={loading} className="mt-1">Finalizar cadastro</Btn>
          </form>
        )}

        <div className="mt-4 text-center">
          <button onClick={() => router.push('/')}
            className="font-[var(--mono)] text-[10px] tracking-[1px] text-[#3d5875] hover:text-[#7a96b8] transition-colors uppercase cursor-pointer bg-transparent border-none">
            ← Já tenho conta
          </button>
        </div>
      </div>
    </div>
  )
}
