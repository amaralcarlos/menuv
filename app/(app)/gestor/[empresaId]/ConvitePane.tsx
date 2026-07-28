'use client'
import { useEffect, useState } from 'react'
import { useApi } from '@/lib/use-api'
import { useToast, Btn } from '@/components/ui'

function tempoRestante(expiraEm: string) {
  const diff = new Date(expiraEm).getTime() - Date.now()
  if (diff <= 0) return 'Expirado'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}min restantes` : `${m}min restantes`
}

export default function ConvitePane({ empresaId }: { empresaId: string }) {
  const { call }  = useApi()
  const toast     = useToast()
  const [convite, setConvite]   = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [gerando, setGerando]   = useState(false)
  const [copied,  setCopied]    = useState(false)

  const link = convite
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://app.menuv.com.br'}/cadastro?convite=${convite.token}`
    : ''

  async function load() {
    const r = await call<any>(`/api/convites?empresaId=${empresaId}`)
    setConvite(r.success ? r.data : null)
    setLoading(false)
  }

  useEffect(() => { load() }, [empresaId])

  async function gerar() {
    setGerando(true)
    const r = await call<any>('/api/convites', {
      method: 'POST',
      body: JSON.stringify({ empresaId }),
    })
    setGerando(false)
    if (r.success) { setConvite(r.data); toast('Novo link gerado!') }
    else toast(r.error ?? 'Erro ao gerar link.', 'error')
  }

  function copiar() {
    navigator.clipboard.writeText(link)
    setCopied(true)
    toast('Link copiado!')
    setTimeout(() => setCopied(false), 2500)
  }

  if (loading) return null

  return (
    <div className="flex flex-col gap-3">
      <p className="font-[var(--mono)] text-[10px] text-[#3d5875] uppercase tracking-[1px]">
        Link de convite para colaboradores
      </p>

      {convite ? (
        <div className="bg-[#0d1525] border border-[#1c2e48] rounded-[12px] p-3 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="font-[var(--mono)] text-[10px] text-[#00e87a]">
              ✓ Link ativo
            </p>
            <p className="font-[var(--mono)] text-[10px] text-[#3d5875]">
              ⏱ {tempoRestante(convite.expira_em)}
            </p>
          </div>

          <div className="flex gap-2 items-center">
            <div className="flex-1 bg-[#080c14] border border-[#1c2e48] rounded-[8px] px-2.5 py-2 font-[var(--mono)] text-[10px] text-[#7a96b8] truncate">
              {link}
            </div>
            <button onClick={copiar}
              className={`flex-shrink-0 rounded-[8px] px-3 py-2 font-[var(--mono)] text-[10px] cursor-pointer transition-all border
                ${copied
                  ? 'bg-[rgba(0,232,122,.15)] border-[rgba(0,232,122,.4)] text-[#00e87a]'
                  : 'bg-[rgba(0,232,122,.08)] border-[rgba(0,232,122,.2)] text-[#00e87a] hover:bg-[rgba(0,232,122,.15)]'
                }`}>
              {copied ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>

          <p className="font-[var(--mono)] text-[9px] text-[#3d5875]">
            Compartilhe com os colaboradores. O link expira em 24h após a geração.
          </p>

          <button onClick={gerar} disabled={gerando}
            className="font-[var(--mono)] text-[9px] text-[#3d5875] hover:text-[#7a96b8] cursor-pointer bg-transparent border-none text-left transition-colors disabled:opacity-50">
            {gerando ? 'Gerando...' : '↻ Gerar novo link (desativa o atual)'}
          </button>
        </div>
      ) : (
        <div className="bg-[#0d1525] border border-[#1c2e48] rounded-[12px] p-3 flex flex-col gap-2">
          <p className="font-[var(--mono)] text-[10px] text-[#3d5875]">
            Nenhum link ativo. Gere um novo para convidar colaboradores.
          </p>
          <Btn loading={gerando} onClick={gerar} size="sm">
            Gerar link de convite
          </Btn>
        </div>
      )}
    </div>
  )
}
