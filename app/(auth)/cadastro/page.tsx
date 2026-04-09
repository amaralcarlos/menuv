'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Btn, Input } from '@/components/ui'
import { MenuvLogo } from '@/components/ui/MenuvLogo'

export default function CadastroPage() {
  const router = useRouter()
  const tipo   = useSearchParams().get('tipo') ?? 'colaborador'
  const isRest = tipo === 'restaurante'

  const [nome,    setNome]    = useState('')
  const [email,   setEmail]   = useState('')
  const [senha,   setSenha]   = useState('')
  const [conf,    setConf]    = useState('')
  const [empId,   setEmpId]   = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [ok,      setOk]      = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!nome || !email || !senha) { setError('Preencha todos os campos.'); return }
    if (senha !== conf) { setError('As senhas não coincidem.'); return }
    if (!isRest && !empId) { setError('Informe o código da empresa.'); return }

    setLoading(true)
    const endpoint = isRest ? '/api/restaurantes' : '/api/colaboradores/cadastro'
    const body = isRest
      ? { nome, email, senha }
      : { nome, email, senha, empresaId: empId }

    const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    setLoading(false)

    if (!data.success) { setError(data.error ?? 'Erro ao criar conta.'); return }
    setOk(true)
  }

  if (ok) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center anim-fade-up">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-[#ddeaf8] mb-2">Conta criada!</h2>
        <p className="font-[var(--mono)] text-xs text-[#3d5875] mb-6">Faça login para continuar.</p>
        <Btn onClick={() => router.push(`/login?role=${isRest ? 'restaurante' : 'colaborador'}`)} className="max-w-xs mx-auto">
          Ir para o login
        </Btn>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="anim-fade-up w-full max-w-[380px]"
        style={{ background: 'linear-gradient(145deg,#0d1525,#121e32)', border: '1px solid #253d5e', borderRadius: 16, padding: '36px 28px', boxShadow: '0 20px 60px rgba(0,0,0,.6)' }}>

        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-9 h-9 flex items-center justify-center rounded-[10px] bg-[rgba(0,232,122,.06)] border border-[rgba(0,232,122,.15)]">
            <MenuvLogo size={26} />
          </div>
          <span className="text-xl font-black text-[#ddeaf8] tracking-tight">
            {isRest ? '🏪 Cadastrar restaurante' : '👤 Criar conta'}
          </span>
        </div>
        <div className="font-[var(--mono)] text-[10px] tracking-[2px] text-[#3d5875] uppercase mb-7">
          {isRest ? 'Novo restaurante' : 'Autoinscrição'}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label={isRest ? 'Nome do restaurante' : 'Seu nome'} value={nome} onChange={e => setNome(e.target.value)} placeholder={isRest ? 'Restaurante Bom Sabor' : 'João Silva'} />
          <Input label="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" autoComplete="email" />
          {!isRest && <Input label="Código da empresa" value={empId} onChange={e => setEmpId(e.target.value)} placeholder="emp_001" />}
          <Input label="Senha" type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Mínimo 4 caracteres" autoComplete="new-password" />
          <Input label="Confirmar senha" type="password" value={conf} onChange={e => setConf(e.target.value)} placeholder="Repita a senha" onKeyDown={e => e.key === 'Enter' && handleSubmit(e as any)} />

          {error && <p className="font-[var(--mono)] text-xs text-[#ff4d6a] text-center">{error}</p>}

          <Btn type="submit" loading={loading} className="mt-1">Criar conta</Btn>
        </form>

        <div className="mt-4 text-center">
          <button onClick={() => router.push(`/login?role=${isRest ? 'restaurante' : 'colaborador'}`)}
            className="font-[var(--mono)] text-[10px] tracking-[1px] text-[#3d5875] hover:text-[#7a96b8] transition-colors uppercase cursor-pointer bg-transparent border-none">
            ← Já tenho conta
          </button>
        </div>
      </div>
    </div>
  )
}
