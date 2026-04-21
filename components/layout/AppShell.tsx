'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { MenuvLogo } from '@/components/ui/MenuvLogo'

/* ── Clock ───────────────────────────────────────────────── */
function Clock() {
  const [t, setT] = useState('')
  useEffect(() => {
    const tick = () => {
      const n = new Date()
      setT(`${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`)
    }
    tick()
    const id = setInterval(tick, 10_000)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="font-[var(--mono)] text-lg text-[#00e87a] tracking-[2px] font-medium"
      style={{ textShadow: '0 0 12px rgba(0,232,122,.3)' }}>
      {t}
    </span>
  )
}

/* ── User menu ───────────────────────────────────────────── */
function UserMenu({ nome, role, subInfo }: { nome: string; role: string; subInfo?: string }) {
  const { signOut } = useAuth()
  const [open, setOpen] = useState(false)

  const initials = nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-9 h-9 rounded-full bg-[rgba(0,232,122,.1)] border border-[rgba(0,232,122,.25)] flex items-center justify-center font-[var(--mono)] text-sm text-[#00e87a] font-semibold cursor-pointer hover:border-[rgba(0,232,122,.5)] transition-colors"
      >
        {initials}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 mt-2 z-50 w-56
            bg-[image:linear-gradient(145deg,#0d1525,#121e32)]
            border border-[#253d5e] rounded-[11px]
            shadow-[0_16px_40px_rgba(0,0,0,.6)] overflow-hidden anim-fade-up">
            <div className="px-4 py-3 border-b border-[#1c2e48]">
              <div className="font-semibold text-sm text-[#ddeaf8] truncate">{nome}</div>
              <div className="font-[var(--mono)] text-[10px] tracking-[1.5px] text-[#00e87a] uppercase mt-0.5">{role}</div>
              {subInfo && (
                <div className="font-[var(--mono)] text-[10px] text-[#3d5875] mt-0.5 truncate">{subInfo}</div>
              )}
            </div>
            <button
              onClick={() => { setOpen(false); signOut() }}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-[#ff4d6a] hover:bg-[rgba(255,77,106,.06)] transition-colors cursor-pointer"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sair
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/* ── Tab icons ───────────────────────────────────────────── */
const ICONS: Record<string, React.ReactNode> = {
  home: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  grade: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  pedido: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>,
  empresas: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>,
  relatorio: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  admin: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  colabs: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
}

export interface Tab { id: string; label: string; icon: keyof typeof ICONS; component: React.ReactNode }

interface AppShellProps {
  tabs: Tab[]
  nome: string
  badge: string
  role: string
  subInfo?: string
}

export function AppShell({ tabs, nome, badge, role, subInfo }: AppShellProps) {
  const [active, setActive] = useState(tabs[0]?.id ?? '')

  return (
    <div className="min-h-screen flex flex-col relative z-[1]">
      {/* Header */}
      <header className="sticky top-0 z-[100] flex items-center justify-between px-4 py-2.5
        bg-[rgba(6,10,15,.92)] border-b border-[rgba(0,232,122,.08)] backdrop-blur-[24px]
        before:content-[''] before:absolute before:inset-0 before:bg-[linear-gradient(135deg,rgba(0,232,122,.03)_0%,transparent_50%,rgba(77,166,255,.02)_100%)] before:pointer-events-none
        after:content-[''] after:absolute after:bottom-0 after:left-[-100%] after:right-[-100%] after:h-px after:bg-[linear-gradient(90deg,transparent,rgba(0,232,122,.4),rgba(77,166,255,.2),transparent)] after:animate-[shimmer-line_4s_linear_infinite]">
        <div className="flex items-center gap-2.5 relative z-[1]">
          <div className="w-9 h-9 flex items-center justify-center rounded-[10px]
            bg-[linear-gradient(145deg,rgba(0,232,122,.15),rgba(0,196,99,.05))]
            border border-[rgba(0,232,122,.3)]
            shadow-[0_0_14px_rgba(0,232,122,.15),inset_0_1px_0_rgba(0,232,122,.2)]">
            <img src="/favicon.svg" alt="Menuv" width={28} height={28} />
          </div>
          <div>
            <div className="font-extrabold text-base text-[#ddeaf8] tracking-tight leading-none">{nome}</div>
            <div className="font-[var(--mono)] text-[10px] tracking-[2px] text-[#00e87a] opacity-80 mt-0.5 uppercase">
              {badge}{subInfo ? ` · ${subInfo}` : ''}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 relative z-[1]">
