'use client'
import { useState, useEffect, useCallback, type ButtonHTMLAttributes, type InputHTMLAttributes } from 'react'

// ── Button ───────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  loading?: boolean
  size?: 'sm' | 'md'
}

const btnStyles: Record<BtnVariant, string> = {
  primary:   'bg-[image:linear-gradient(160deg,#00ff8a_0%,#00e87a_40%,#00c8b4_100%)] text-[#003320] shadow-[0_4px_0_#007a3d,0_6px_20px_rgba(0,232,122,.3),inset_0_1px_0_rgba(255,255,255,.25)] hover:shadow-[0_4px_0_#007a3d,0_10px_28px_rgba(0,232,122,.4),inset_0_1px_0_rgba(255,255,255,.25)] hover:-translate-y-px',
  secondary: 'bg-[image:linear-gradient(160deg,#121e32_0%,#0d1525_100%)] text-[#ddeaf8] border border-[#253d5e] shadow-[0_2px_4px_rgba(0,0,0,.4)] hover:border-[#7a96b8]',
  danger:    'bg-[image:linear-gradient(160deg,rgba(255,77,106,.1),rgba(255,77,106,.04))] text-[#ff4d6a] border border-[rgba(255,77,106,.2)] hover:bg-[rgba(255,77,106,.13)] hover:border-[rgba(255,77,106,.4)]',
  ghost:     'bg-transparent text-[#7a96b8] hover:text-[#ddeaf8]',
}

export function Btn({ variant = 'primary', loading, size = 'md', className = '', children, disabled, ...props }: BtnProps) {
  const pad = size === 'sm' ? 'py-2 px-3 text-sm' : 'py-3 px-4 text-base'
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-1.5 w-full rounded-[11px] font-semibold font-[var(--sans)] transition-all duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed active:translate-y-0.5 active:scale-[.98] relative overflow-hidden ${pad} ${btnStyles[variant]} ${className}`}
    >
      {loading && <SpinnerXS />}
      {children}
    </button>
  )
}

// ── Input ────────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}
export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="font-[var(--mono)] text-xs tracking-[1.5px] text-[#3d5875] uppercase">{label}</label>}
      <input
        {...props}
        className={`w-full bg-[#080c14] border border-[#253d5e] rounded-[11px] px-3 py-2.5 font-[var(--mono)] text-[#ddeaf8] outline-none transition-all duration-150 focus:border-[rgba(0,232,122,.5)] focus:shadow-[0_0_0_3px_rgba(0,232,122,.06)] placeholder:text-[#3d5875] ${className}`}
      />
      {error && <span className="font-[var(--mono)] text-xs text-[#ff4d6a]">{error}</span>}
    </div>
  )
}

// ── Card ─────────────────────────────────────────────────────
export function Card({ children, highlight, className = '' }: { children: React.ReactNode; highlight?: boolean; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-[16px] p-4 mb-2.5 transition-shadow duration-200
      bg-[image:linear-gradient(145deg,#0d1525_0%,#121e32_100%)]
      border ${highlight ? 'border-[rgba(0,232,122,.4)] shadow-[0_8px_24px_rgba(0,232,122,.2),0_2px_6px_rgba(0,232,122,.12),inset_0_1px_0_rgba(0,232,122,.15)]' : 'border-[#1c2e48] shadow-[0_6px_16px_rgba(0,0,0,.5),0_2px_4px_rgba(0,0,0,.3),inset_0_1px_0_rgba(255,255,255,.04)]'}
      before:content-[""] before:absolute before:top-0 before:left-0 before:right-0 before:h-px
      before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent)]
      ${className}`}
    >
      {children}
    </div>
  )
}

// ── SectionLabel ─────────────────────────────────────────────
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3 font-[var(--mono)] text-[10px] tracking-[3px] text-[#3d5875] uppercase">
      {children}
      <span className="flex-1 h-px bg-[linear-gradient(90deg,#253d5e,transparent)]" />
    </div>
  )
}

// ── Spinner ──────────────────────────────────────────────────
export function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 min-h-[200px]">
      <svg className="animate-spin" width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="20" stroke="#1c2e48" strokeWidth="3" fill="none" />
        <circle cx="24" cy="24" r="20" stroke="#00e87a" strokeWidth="3" fill="none"
          strokeLinecap="round" strokeDasharray="60 66"
          style={{ filter: 'drop-shadow(0 0 6px #00e87a)' }} />
      </svg>
    </div>
  )
}

function SpinnerXS() {
  return <svg className="animate-spin w-4 h-4" viewBox="0 0 16 16">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" fill="none" opacity=".3" />
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="16 22" />
  </svg>
}

// ── Toast ────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info'
interface ToastMsg { id: number; msg: string; type: ToastType }

let _toastId = 0
type ToastFn = (msg: string, type?: ToastType) => void
let _globalToast: ToastFn = () => {}

export function useToast() { return _globalToast }

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMsg[]>([])

  useEffect(() => {
    _globalToast = (msg, type = 'success') => {
      const id = ++_toastId
      setToasts(t => [...t, { id, msg, type }])
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000)
    }
  }, [])

  const colors: Record<ToastType, string> = {
    success: 'bg-[#0d1525] border-[rgba(0,232,122,.4)] text-[#00e87a]',
    error:   'bg-[#0d1525] border-[rgba(255,77,106,.4)] text-[#ff4d6a]',
    info:    'bg-[#0d1525] border-[rgba(77,166,255,.4)] text-[#4da6ff]',
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-[9999] pointer-events-none w-[calc(100vw-32px)] max-w-sm">
      {toasts.map(t => (
        <div key={t.id} className={`${colors[t.type]} border rounded-[11px] px-4 py-3 font-[var(--mono)] text-sm shadow-[0_8px_24px_rgba(0,0,0,.5)] anim-fade-up`}>
          {t.msg}
        </div>
      ))}
    </div>
  )
}

// ── Modal ────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/90 z-[400] flex items-center justify-center backdrop-blur-[8px]" onClick={onClose}>
      <div
        className="bg-[image:linear-gradient(145deg,#0d1525,#121e32)] border border-[#253d5e] rounded-[16px] p-7 w-[calc(100%-32px)] max-w-md max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,.6)] anim-fade-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#ddeaf8]">{title}</h2>
          <button onClick={onClose} className="text-[#3d5875] hover:text-[#ddeaf8] text-2xl leading-none transition-colors">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Badge ────────────────────────────────────────────────────
type BadgeColor = 'green' | 'blue' | 'red' | 'yellow' | 'purple' | 'gray'
const badgeColors: Record<BadgeColor, string> = {
  green:  'bg-[rgba(0,232,122,.08)] text-[#00e87a] border-[rgba(0,232,122,.2)]',
  blue:   'bg-[rgba(77,166,255,.1)] text-[#4da6ff] border-[rgba(77,166,255,.2)]',
  red:    'bg-[rgba(255,77,106,.1)] text-[#ff4d6a] border-[rgba(255,77,106,.2)]',
  yellow: 'bg-[rgba(255,179,64,.1)] text-[#ffb340] border-[rgba(255,179,64,.2)]',
  purple: 'bg-[rgba(162,89,255,.09)] text-[#a259ff] border-[rgba(162,89,255,.2)]',
  gray:   'bg-[rgba(122,150,184,.08)] text-[#7a96b8] border-[rgba(122,150,184,.2)]',
}

export function Badge({ children, color = 'green' }: { children: React.ReactNode; color?: BadgeColor }) {
  return (
    <span className={`inline-block font-[var(--mono)] text-[10px] tracking-[.5px] px-2 py-0.5 rounded-full border ${badgeColors[color]}`}>
      {children}
    </span>
  )
}
