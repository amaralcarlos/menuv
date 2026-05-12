'use client'
import { useEffect, useState } from 'react'
import { useApi } from '@/lib/use-api'
import { Spinner, Badge, Btn, useToast } from '@/components/ui'
import { valorMensal, valorAnual, STATUS_PAGAMENTO, PLANO_LANCAMENTO } from '@/lib/planos-config'

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const DATA = (s: string) => new Date(s).toLocaleDateString('pt-BR')

type TipoPag = 'pix_mensal' | 'pix_anual' | 'cartao_mensal'

interface Pagamento {
  id: string
  valor: number
  status: string
  tipo: string
  vencimento: string
  invoice_url: string
  pix_copia_cola: string
  criado_em: string
}

interface Fatura {
  totalAPagar: number
  faixaLabel: string
  planoLancamento: boolean
  totalEmpresas: number
}

const TIPO_LABEL: Record<string, string> = {
  pix_mensal:   'Pix Mensal',
  pix_anual:    'Pix Anual',
  cartao_mensal: 'Cartão Mensal',
}

export default function FinanceiroPane({ restId }: { restId: string }) {
  const { call } = useApi()
  const toast    = useToast()

  const [loadingFatura,   setLoadingFatura]   = useState(true)
  const [loadingHist,     setLoadingHist]     = useState(true)
  const [fatura,          setFatura]          = useState<Fatura | null>(null)
  const [pagamentos,      setPagamentos]      = useState<Pagamento[]>([])
  const [proximo,         setProximo]         = useState<Pagamento | null>(null)
  const [assinando,       setAssinando]       = useState(false)
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoPag | null>(null)
  const [pixModal,        setPixModal]        = useState<{ qrCode: string; copiaCola: string; valor: number } | null>(null)
  const [copied,          setCopied]          = useState(false)

  // Perfil fiscal
  const [documento,       setDocumento]       = useState('')
  const [telefone,        setTelefone]        = useState('')
  const [temDocumento,    setTemDocumento]    = useState<boolean | null>(null)  // null=carregando, false=sem doc, true=tem doc
  const [salvandoPerfil,  setSalvandoPerfil]  = useState(false)
  const [perfilErro,      setPerfilErro]      = useState('')

  function loadFatura() {
    call<any>(`/api/restaurante/fatura?restauranteId=${restId}`).then(r => {
      if (r.success) {
        setFatura(r.data.fatura)
        setTemDocumento(r.data.temDocumento === true)
      } else {
        setTemDocumento(false)
      }
      setLoadingFatura(false)
    })
  }

  function loadHistorico() {
    call<any>(`/api/financeiro/historico?restauranteId=${restId}`).then(r => {
      if (r.success) {
        setPagamentos(r.data.pagamentos ?? [])
        setProximo(r.data.proximo ?? null)
      }
      setLoadingHist(false)
    })
  }

  async function salvarPerfil(e: React.FormEvent) {
    e.preventDefault()
    setPerfilErro('')
    const doc = documento.replace(/\D/g, '')
    if (doc.length !== 11 && doc.length !== 14) {
      setPerfilErro('Digite um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.')
      return
    }
    setSalvandoPerfil(true)
    const r = await call<any>('/api/financeiro/perfil', {
      method: 'POST',
      body: JSON.stringify({ documento: doc, telefone, restId }),
    })
    setSalvandoPerfil(false)
    if (r.success) {
      setTemDocumento(true)
    } else {
      setPerfilErro(r.error ?? 'Erro ao salvar.')
    }
  }

  useEffect(() => { loadFatura(); loadHistorico() }, [restId])

  async function assinar(tipo: TipoPag) {
    setAssinando(true)
    setTipoSelecionado(tipo)
    const r = await call<any>('/api/financeiro/assinar', {
      method: 'POST',
      body: JSON.stringify({ tipo }),
    })
    setAssinando(false)
    setTipoSelecionado(null)

    if (!r.success) { toast(r.error ?? 'Erro ao gerar cobrança.', 'error'); return }

    if (tipo !== 'cartao_mensal' && r.data.pix) {
      setPixModal({ qrCode: r.data.pix.qrCode, copiaCola: r.data.pix.copiaCola, valor: r.data.valor })
    } else {
      window.open(r.data.invoiceUrl, '_blank')
    }
    loadHistorico()
  }

  async function copiar(texto: string) {
    await navigator.clipboard.writeText(texto)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loadingFatura) return <div className="flex justify-center py-12"><Spinner /></div>

  const numEmpresas   = fatura?.totalEmpresas   ?? 0
  const planoLanc     = fatura?.planoLancamento ?? false
  const mensal        = valorMensal(numEmpresas, planoLanc)
  const anual         = valorAnual(numEmpresas, planoLanc)
  const temDescAnual  = !planoLanc
  const economiaAnual = temDescAnual ? parseFloat((mensal * 12 - anual).toFixed(2)) : 0

  return (
    <div className="px-4 pt-4 pb-24 flex flex-col gap-4">

      {/* ── Formulário de perfil fiscal (aparece se não tem CPF/CNPJ) ── */}
      {temDocumento === false && (
        <div className="rounded-[14px] border border-[rgba(255,179,64,.3)] bg-[rgba(255,179,64,.04)] p-4 flex flex-col gap-3">
          <div>
            <p className="text-sm font-semibold text-[#ddeaf8] mb-1">Cadastro fiscal necessário</p>
            <p className="font-[var(--mono)] text-[10px] text-[#3d5875] leading-relaxed">
              Para gerar cobranças é necessário informar o CPF ou CNPJ do restaurante.
            </p>
          </div>
          <form onSubmit={salvarPerfil} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="font-[var(--mono)] text-[9px] tracking-[1.5px] text-[#3d5875] uppercase">CPF ou CNPJ *</label>
              <input
                value={documento}
                onChange={e => { setDocumento(e.target.value); setPerfilErro('') }}
                placeholder="000.000.000-00 ou 00.000.000/0001-00"
                className="w-full bg-[#080c14] border border-[#253d5e] rounded-[11px] px-3 py-2.5 font-[var(--mono)] text-sm text-[#ddeaf8] outline-none focus:border-[rgba(255,179,64,.5)] placeholder:text-[#3d5875]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-[var(--mono)] text-[9px] tracking-[1.5px] text-[#3d5875] uppercase">Telefone celular (opcional)</label>
              <input
                value={telefone}
                onChange={e => setTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full bg-[#080c14] border border-[#253d5e] rounded-[11px] px-3 py-2.5 font-[var(--mono)] text-sm text-[#ddeaf8] outline-none focus:border-[rgba(255,179,64,.5)] placeholder:text-[#3d5875]"
              />
            </div>
            {perfilErro && <p className="font-[var(--mono)] text-xs text-[#ff4d6a]">{perfilErro}</p>}
            <Btn type="submit" loading={salvandoPerfil}>Salvar e continuar</Btn>
          </form>
        </div>
      )}

      {/* ── Plano atual ── */}
      <div className="rounded-[14px] border border-[rgba(0,232,122,.25)] bg-[rgba(0,232,122,.04)] p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="font-[var(--mono)] text-[10px] tracking-[2px] text-[#3d5875] uppercase">Plano atual</p>
          {planoLanc && (
            <span className="font-[var(--mono)] text-[9px] text-[#ffb340] border border-[rgba(255,179,64,.3)] bg-[rgba(255,179,64,.08)] rounded-full px-2 py-0.5">
              🚀 Lançamento
            </span>
          )}
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm text-[#7a96b8]">{fatura?.faixaLabel}</p>
            <p className="font-[var(--mono)] text-[10px] text-[#3d5875] mt-0.5">
              {numEmpresas} empresa{numEmpresas !== 1 ? 's' : ''} cadastrada{numEmpresas !== 1 ? 's' : ''}
            </p>
          </div>
          <span className="font-[var(--mono)] text-2xl font-black text-[#00e87a]"
            style={{ textShadow: '0 0 16px rgba(0,232,122,.3)' }}>
            {BRL(mensal)}<span className="text-sm font-normal text-[#3d5875]">/mês</span>
          </span>
        </div>

        {/* Próximo pagamento */}
        {proximo && (
          <div className="bg-[#080c14] border border-[#1c2e48] rounded-[10px] px-3 py-2 flex items-center justify-between">
            <div>
              <p className="font-[var(--mono)] text-[9px] tracking-[1.5px] text-[#3d5875] uppercase">Próximo vencimento</p>
              <p className="font-[var(--mono)] text-sm text-[#ddeaf8] font-bold mt-0.5">{DATA(proximo.vencimento)}</p>
            </div>
            <Badge color={STATUS_PAGAMENTO[proximo.status]?.cor as any ?? 'gray'}>
              {STATUS_PAGAMENTO[proximo.status]?.label ?? proximo.status}
            </Badge>
          </div>
        )}
      </div>

      {/* ── Opções de pagamento ── */}
      <div className="flex flex-col gap-2">
        <p className="font-[var(--mono)] text-[10px] tracking-[2px] text-[#3d5875] uppercase">
          Efetuar pagamento
        </p>

        {/* Pix Mensal */}
        <div className="bg-[#0d1525] border border-[#1c2e48] rounded-[12px] p-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-[#ddeaf8] font-medium">Pix Mensal</p>
            <p className="font-[var(--mono)] text-[10px] text-[#3d5875] mt-0.5">Vence em 1 dia</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-[var(--mono)] text-sm font-bold text-[#ddeaf8]">{BRL(mensal)}</span>
            <Btn size="sm" className="w-auto" loading={assinando && tipoSelecionado === 'pix_mensal'}
              onClick={() => assinar('pix_mensal')}>
              Gerar Pix
            </Btn>
          </div>
        </div>

        {/* Pix Anual */}
        <div className="bg-[#0d1525] border border-[rgba(0,232,122,.2)] rounded-[12px] p-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-[#ddeaf8] font-medium flex items-center gap-1.5">
              Pix Anual
              {temDescAnual && (
                <span className="font-[var(--mono)] text-[9px] text-[#00e87a] border border-[rgba(0,232,122,.3)] rounded-full px-1.5 py-0.5">
                  −10%
                </span>
              )}
            </p>
            <p className="font-[var(--mono)] text-[10px] text-[#3d5875] mt-0.5">
              {temDescAnual ? `Economia de ${BRL(economiaAnual)}/ano` : 'Sem desconto (plano lançamento)'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-[var(--mono)] text-sm font-bold text-[#00e87a]">{BRL(anual)}</span>
            <Btn size="sm" className="w-auto" loading={assinando && tipoSelecionado === 'pix_anual'}
              onClick={() => assinar('pix_anual')}>
              Gerar Pix
            </Btn>
          </div>
        </div>

        {/* Cartão Mensal */}
        <div className="bg-[#0d1525] border border-[#1c2e48] rounded-[12px] p-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-[#ddeaf8] font-medium">Cartão de Crédito</p>
            <p className="font-[var(--mono)] text-[10px] text-[#3d5875] mt-0.5">Recorrente por 12 meses</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-[var(--mono)] text-sm font-bold text-[#ddeaf8]">{BRL(mensal)}/mês</span>
            <Btn size="sm" variant="secondary" className="w-auto" loading={assinando && tipoSelecionado === 'cartao_mensal'}
              onClick={() => assinar('cartao_mensal')}>
              Assinar
            </Btn>
          </div>
        </div>
      </div>

      {/* ── Modal Pix ── */}
      {pixModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-[340px] rounded-[16px] border border-[rgba(0,232,122,.3)] bg-[#0d1525] p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="font-bold text-[#ddeaf8]">Pagar com Pix</p>
              <button onClick={() => setPixModal(null)}
                className="text-[#3d5875] hover:text-[#ddeaf8] text-xl leading-none bg-transparent border-none cursor-pointer">
                ×
              </button>
            </div>

            <p className="font-[var(--mono)] text-[10px] text-[#3d5875] text-center">
              Valor: <span className="text-[#00e87a] font-bold">{BRL(pixModal.valor)}</span>
            </p>

            {/* QR Code */}
            {pixModal.qrCode && (
              <div className="flex justify-center">
                <img
                  src={`data:image/png;base64,${pixModal.qrCode}`}
                  alt="QR Code Pix"
                  className="w-44 h-44 rounded-[8px] border border-[#1c2e48]"
                />
              </div>
            )}

            {/* Copia e cola */}
            <div className="flex flex-col gap-1.5">
              <p className="font-[var(--mono)] text-[9px] tracking-[1.5px] text-[#3d5875] uppercase">Pix copia e cola</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={pixModal.copiaCola}
                  className="flex-1 bg-[#080c14] border border-[#253d5e] rounded-[8px] px-2.5 py-2 font-[var(--mono)] text-[10px] text-[#7a96b8] outline-none truncate"
                />
                <Btn size="sm" className="w-auto flex-shrink-0" onClick={() => copiar(pixModal.copiaCola)}>
                  {copied ? '✓' : 'Copiar'}
                </Btn>
              </div>
            </div>

            <p className="font-[var(--mono)] text-[10px] text-[#3d5875] text-center leading-relaxed">
              Após o pagamento, o status atualiza automaticamente em alguns minutos.
            </p>

            <Btn variant="secondary" onClick={() => setPixModal(null)}>Fechar</Btn>
          </div>
        </div>
      )}

      {/* ── Histórico ── */}
      <div className="flex flex-col gap-2">
        <p className="font-[var(--mono)] text-[10px] tracking-[2px] text-[#3d5875] uppercase">
          Histórico de pagamentos
        </p>

        {loadingHist && <Spinner />}

        {!loadingHist && pagamentos.length === 0 && (
          <p className="font-[var(--mono)] text-xs text-[#3d5875] text-center py-4">
            Nenhum pagamento registrado ainda.
          </p>
        )}

        {pagamentos.map(p => {
          const st = STATUS_PAGAMENTO[p.status] ?? { label: p.status, cor: 'gray' }
          return (
            <div key={p.id}
              className="bg-[#0d1525] border border-[#1c2e48] rounded-[11px] px-3 py-2.5 flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-[#ddeaf8] font-medium">{BRL(p.valor)}</p>
                <p className="font-[var(--mono)] text-[10px] text-[#3d5875] mt-0.5">
                  {TIPO_LABEL[p.tipo] ?? p.tipo} · venc. {DATA(p.vencimento)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge color={st.cor as any}>{st.label}</Badge>
                {p.invoice_url && (
                  <a href={p.invoice_url} target="_blank" rel="noreferrer"
                    className="font-[var(--mono)] text-[9px] text-[#4da6ff] border border-[rgba(77,166,255,.2)] rounded-[5px] px-2 py-1 hover:bg-[rgba(77,166,255,.08)] transition-colors">
                    Ver
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Nota */}
      <div className="rounded-[10px] border border-[#1c2e48] bg-[#080c14] px-3 py-2.5">
        <p className="font-[var(--mono)] text-[10px] text-[#3d5875] leading-relaxed">
          💳 Pagamentos processados com segurança via <span className="text-[#7a96b8]">Asaas</span>.
          Dúvidas? Entre em contato com o suporte Menuv.
        </p>
      </div>

    </div>
  )
}
