// lib/asaas.ts
// Cliente HTTP para a API do Asaas (Sandbox)

const BASE_URL = 'https://sandbox.asaas.com/api/v3'

function headers() {
  return {
    'Content-Type': 'application/json',
    'access_token': process.env.ASAAS_API_KEY!,
  }
}

async function req<T>(method: string, path: string, body?: object): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Asaas ${method} ${path} → ${res.status}: ${text}`)
  }
  return res.json()
}

// ── Customers ────────────────────────────────────────────────

export interface AsaasCustomer {
  id:    string
  name:  string
  email: string
  cpfCnpj?: string
}

export async function criarCustomer(nome: string, email: string, cpfCnpj?: string): Promise<AsaasCustomer> {
  return req('POST', '/customers', { name: nome, email, cpfCnpj, notificationDisabled: false })
}

export async function buscarCustomerPorEmail(email: string): Promise<AsaasCustomer | null> {
  const data = await req<{ data: AsaasCustomer[] }>('GET', `/customers?email=${encodeURIComponent(email)}`)
  return data.data?.[0] ?? null
}

// ── Payments ─────────────────────────────────────────────────

export type TipoPagamento = 'pix_mensal' | 'pix_anual' | 'cartao_mensal'

export interface AsaasPayment {
  id:          string
  status:      string
  value:       number
  dueDate:     string
  invoiceUrl:  string
  pixQrCodeId?: string
  billingType: string
}

export interface AsaasPixQr {
  encodedImage: string // base64 do QR Code
  payload:      string // copia e cola
  expirationDate: string
}

export async function criarCobrancaPix(
  customerId: string,
  valor: number,
  descricao: string,
  vencimento: string // YYYY-MM-DD
): Promise<AsaasPayment> {
  return req('POST', '/payments', {
    customer:    customerId,
    billingType: 'PIX',
    value:       valor,
    dueDate:     vencimento,
    description: descricao,
  })
}

export async function buscarPixQr(paymentId: string): Promise<AsaasPixQr> {
  return req('GET', `/payments/${paymentId}/pixQrCode`)
}

export async function criarAssinaturaCartao(
  customerId: string,
  valor: number,
  descricao: string,
  nextDueDate: string // YYYY-MM-DD
): Promise<{ id: string; status: string; value: number }> {
  return req('POST', '/subscriptions', {
    customer:    customerId,
    billingType: 'CREDIT_CARD',
    value:       valor,
    nextDueDate,
    cycle:       'MONTHLY',
    description: descricao,
    maxPayments: 12,
  })
}

export async function buscarPagamento(paymentId: string): Promise<AsaasPayment> {
  return req('GET', `/payments/${paymentId}`)
}

// ── Helpers ──────────────────────────────────────────────────

export function vencimentoEmDias(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return d.toISOString().split('T')[0]
}
