'use client'
import { useEffect, useState } from 'react'
import { useApi } from '@/lib/use-api'
import { useToast } from '@/components/ui'
import { Card, SectionLabel, Badge, Btn, Spinner, Input } from '@/components/ui'

function mesAtual() {
  const n = new Date()
  return `${String(n.getMonth() + 1).padStart(2, '0')}/${n.getFullYear()}`
}

export default function RelatorioPane({ restId }: { restId: string }) {
  const { call } = useApi()
  const toast = useToast()
  const [mesAno, setMesAno] = useState(mesAtual())
  const [dados, setDados] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [emailDest, setEmailDest] = useState('')
  const [sending, setSending] = useState(false)

  async function buscar() {
    setLoading(true)
    const res = await call<any>(`/api/relatorio/mensal?mesAno=${mesAno}&restauranteId=${restId}`)
    setLoading(false)
    if (res.success) setDados(res.data)
    else toast(res.error, 'error')
  }

  useEffect(() => { buscar() }, [])

  async function enviarEmail() {
    if (!emailDest) { toast('Informe o e-mail.', 'error'); return }
    setSending(true)
    const corpo = (dados?.resultado ?? [])
      .map((e: any) => `${e.empresaNome}: ${e.totalPedidos} pedidos — R$ ${e.valorTotal.toFixed(2)}`)
      .join('\n')
    const res = await call('/api/relatorio/email', {
      method: 'POST',
      body: JSON.stringify({ para: emailDest, assunto: `Relatório Menuv — ${mesAno}`, corpo }),
    })
    setSending(false)
    if (res.success) toast('E-mail enviado!')
    else toast(res.error, 'error')
  }

  const total = (dados?.resultado ?? []).reduce((s: number, e: any) => s + e.totalPedidos, 0)
  const valor = (dados?.resultado ?? []).reduce((s: number, e: any) => s + e.valorTotal, 0)

  return (
    <div className="px-4 pt-4 pb-24">
      {/* Period selector */}
      <div className="flex gap-2 mb-4 items-end">
        <div className="flex-1">
          <Input label="Mês/Ano (MM/AAAA)" value={mesAno} onChange={e => setMesAno(e.target.value)} placeholder="07/2025" />
        </div>
        <Btn size="sm" className="w-auto" onClick={buscar} loading={loading}>Buscar</Btn>
      </div>

      {loading && <Spinner />}

      {!loading && dados && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <div className="bg-[#0d1525] border border-[#1c2e48] rounded-[11px] p-3 text-center">
              <div className="text-2xl font-black font-[var(--mono)] text-[#4da6ff]">{total}</div>
              <div className="font-[var(--mono)] text-[10px] tracking-[1px] text-[#3d5875] uppercase mt-0.5">Pedidos</div>
            </div>
            <div className="bg-[#0d1525] border border-[#1c2e48] rounded-[11px] p-3 text-center">
              <div className="text-2xl font-black font-[var(--mono)] text-[#00e87a]">
                {valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <div className="font-[var(--mono)] text-[10px] tracking-[1px] text-[#3d5875] uppercase mt-0.5">Total</div>
            </div>
          </div>

          <SectionLabel>Por empresa</SectionLabel>

          {dados.resultado.length === 0 && (
            <Card><p className="text-center font-[var(--mono)] text-xs text-[#3d5875] py-4">Sem pedidos neste período.</p></Card>
          )}

          {dados.resultado.map((e: any) => (
            <Card key={e.empresaId}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-sm text-[#ddeaf8]">{e.empresaNome}</p>
                  <p className="font-[var(--mono)] text-[10px] text-[#3d5875] mt-0.5">
                    R$ {Number(e.precoRefeicao).toFixed(2)} / refeição
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-[var(--mono)] text-base font-bold text-[#00e87a]">{e.totalPedidos}</div>
                  <div className="font-[var(--mono)] text-[10px] text-[#3d5875]">
                    {Number(e.valorTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </div>
              </div>
              {e.colaboradores?.length > 0 && (
                <div className="border-t border-[#1c2e48] pt-2 mt-1">
                  {e.colaboradores.map((c: any) => (
                    <div key={c.nome} className="flex justify-between py-0.5">
                      <span className="text-xs text-[#7a96b8]">{c.nome}</span>
                      <span className="font-[var(--mono)] text-xs text-[#3d5875]">{c.total}x</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}

          {/* Email send */}
          <div className="mt-4 flex gap-2 items-end">
            <div className="flex-1">
              <Input label="Enviar por e-mail" value={emailDest} onChange={e => setEmailDest(e.target.value)} placeholder="financeiro@empresa.com" type="email" />
            </div>
            <Btn size="sm" variant="secondary" className="w-auto" loading={sending} onClick={enviarEmail}>Enviar</Btn>
          </div>
        </>
      )}
    </div>
  )
}
