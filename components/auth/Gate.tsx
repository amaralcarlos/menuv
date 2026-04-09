'use client'
import { useRouter } from 'next/navigation'
import { MenuvLogo } from '@/components/ui/MenuvLogo'

const ROLES = [
  { id: 'restaurante', icon: '🏪', label: 'Restaurante', desc: 'gestão de cardápios e pedidos', iconClass: 'bg-[linear-gradient(145deg,rgba(0,232,122,.15),rgba(0,196,99,.05))] border border-[rgba(0,232,122,.2)]' },
  { id: 'gestor',      icon: '🏢', label: 'Gestor de empresa', desc: 'acompanhe sua equipe', iconClass: 'bg-[linear-gradient(145deg,rgba(77,166,255,.15),rgba(77,166,255,.05))] border border-[rgba(77,166,255,.2)]' },
  { id: 'colaborador', icon: '👤', label: 'Colaborador', desc: 'faça seu pedido do dia', iconClass: 'bg-[linear-gradient(145deg,rgba(162,89,255,.15),rgba(162,89,255,.05))] border border-[rgba(162,89,255,.2)]' },
]

export function Gate() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-8 gap-7 relative">
      {/* Radial glow */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px]
        bg-[radial-gradient(circle,rgba(0,232,122,.07)_0%,transparent_65%)]
        pointer-events-none animate-[breathe_4s_ease-in-out_infinite]" />

      {/* Logo */}
      <div className="relative flex items-center justify-center">
        <div className="absolute w-24 h-24 rounded-full bg-[radial-gradient(circle,rgba(0,232,122,.2),transparent_70%)]
          animate-[breathe_2.5s_ease-in-out_infinite]" />
        <div className="relative z-[1] animate-[float_3s_ease-in-out_infinite]
          drop-shadow-[0_0_24px_rgba(0,232,122,.5)]">
          <MenuvLogo size={72} />
        </div>
      </div>

      {/* Title */}
      <div className="text-center">
        <h1 className="text-5xl font-black text-[#ddeaf8] tracking-tight">Menuv</h1>
        <p className="font-[var(--mono)] text-xs text-[#3d5875] tracking-[2px] uppercase mt-1">
          Gestão inteligente de refeições
        </p>
        <p className="font-[var(--mono)] text-[10px] text-[#3d5875] tracking-[3px] uppercase mt-2">
          selecione seu acesso
        </p>
      </div>

      {/* Role cards */}
      <div className="flex flex-col gap-2.5 w-full max-w-sm">
        {ROLES.map(role => (
          <button
            key={role.id}
            onClick={() => router.push(`/login?role=${role.id}`)}
            className="group relative overflow-hidden
              bg-[image:linear-gradient(145deg,#0d1525,#121e32)]
              border border-[#253d5e] rounded-[16px] p-4
              flex items-center gap-3.5 cursor-pointer
              shadow-[0_6px_16px_rgba(0,0,0,.5),0_2px_4px_rgba(0,0,0,.3),inset_0_1px_0_rgba(255,255,255,.04)]
              hover:border-[rgba(0,232,122,.4)] hover:shadow-[0_16px_40px_rgba(0,0,0,.6),0_0_20px_rgba(0,232,122,.1)]
              transition-all duration-200 text-left
              before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-px
              before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.07),transparent)]"
          >
            <div className={`w-12 h-12 rounded-[12px] flex items-center justify-center flex-shrink-0 text-2xl ${role.iconClass}`}>
              {role.icon}
            </div>
            <div className="flex-1">
              <div className="font-bold text-base text-[#ddeaf8]">{role.label}</div>
              <div className="font-[var(--mono)] text-[10px] tracking-[.3px] text-[#3d5875] mt-0.5">{role.desc}</div>
            </div>
            <svg className="text-[#3d5875] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 flex-shrink-0"
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ))}

        {/* Admin hidden link */}
        <button
          onClick={() => router.push('/login?role=admin')}
          className="w-full font-[var(--mono)] text-[10px] tracking-[2px] text-[#1c2e48] hover:text-[#3d5875] transition-colors uppercase mt-2 py-1 cursor-pointer bg-transparent border-none"
        >
          · · ·
        </button>
      </div>
    </div>
  )
}
