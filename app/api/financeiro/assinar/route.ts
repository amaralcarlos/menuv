import { NextRequest } from 'next/server'
import { supabaseAdmin, getAppMeta, ok, E, sanitize } from '@/lib/api-helpers'
import {
  criarCustomer, buscarCustomerPorEmail,
  criarCobrancaPix, criarAssinaturaCartao,
  buscarPixQr, vencimentoEmDias,
  type TipoPagamento,
} from '@/lib/asaas'
import { valorMensal, valorAnual } from '@/lib/planos-config'

export async function POST(req: NextRequest) {
  const meta = await getAppMeta()
  if (!meta) return E.unauthorized()
  if (meta.app_role !== 'restaurante') return E.forbidden()

  const body = await req.json().catch(() => null)
  const tipo  = sanitize(body?.tipo ?? '') as TipoPagamento

  if (!['pix_mensal', 'pix_anual', 'cartao_mensal'].includes(tipo))
    return E.badRequest('tipo inválido. Use pix_mensal, pix_anual ou cartao_mensal.')

  const restId = meta.restaurante_id
  if (!restId) return E.forbidden()

  const admin = supabaseAdmin()

  // Busca restaurante + número de empresas
  const { data: rest }: { data: any } = await admin
    .from('restaurantes')
    .select('id, nome, email, asaas_customer_id, plano_lancamento')
    .eq('id', restId).single() as any

  if (!rest) return E.notFound('Restaurante não encontrado.')

  const { count: numEmpresas } = await admin
    .from('empresas').select('*', { count: 'exact', head: true })
    .eq('restaurante_id', restId)

  const planoLanc = rest.plano_lancamento ?? false
  const total     = numEmpresas ?? 0

  // Calcula valor
  const valor = tipo === 'pix_anual'
    ? valorAnual(total, planoLanc)
    : valorMensal(total, planoLanc)

  // Garante cliente no Asaas
  let customerId = rest.asaas_customer_id
  if (!customerId) {
    let customer = await buscarCustomerPorEmail(rest.email)
    if (!customer) customer = await criarCustomer(rest.nome, rest.email)
    customerId = customer.id
    await admin.from('restaurantes').update({ asaas_customer_id: customerId }).eq('id', restId)
  }

  const descricao = `Menuv — ${rest.nome} — ${tipo === 'pix_anual' ? 'Anual' : tipo === 'cartao_mensal' ? 'Mensal Cartão' : 'Mensal Pix'}`

  let paymentId   = ''
  let invoiceUrl  = ''
  let pixQrCode   = ''
  let pixCopaCola = ''
  let subscriptionId = rest.asaas_subscription_id ?? null

  if (tipo === 'cartao_mensal') {
    // Cria assinatura recorrente
    const sub = await criarAssinaturaCartao(customerId, valor, descricao, vencimentoEmDias(1))
    subscriptionId = sub.id
    await admin.from('restaurantes').update({ asaas_subscription_id: subscriptionId }).eq('id', restId)
    paymentId  = sub.id
    invoiceUrl = `https://sandbox.asaas.com/c/${sub.id}`
  } else {
    // Pix mensal ou anual — cobrança única
    const venc = vencimentoEmDias(tipo === 'pix_anual' ? 3 : 1)
    const payment = await criarCobrancaPix(customerId, valor, descricao, venc)
    paymentId  = payment.id
    invoiceUrl = payment.invoiceUrl

    // Busca QR Code Pix
    const pix = await buscarPixQr(payment.id)
    pixQrCode   = pix.encodedImage
    pixCopaCola = pix.payload
  }

  // Salva pagamento no banco
  await admin.from('pagamentos').insert({
    restaurante_id:   restId,
    asaas_payment_id: paymentId,
    valor,
    status:           'PENDING',
    tipo,
    vencimento:       vencimentoEmDias(tipo === 'pix_anual' ? 3 : 1),
    pix_qr_code:      pixQrCode   || null,
    pix_copia_cola:   pixCopaCola || null,
    invoice_url:      invoiceUrl   || null,
  })

  return ok({
    tipo,
    valor,
    paymentId,
    invoiceUrl,
    pix: tipo !== 'cartao_mensal' ? { qrCode: pixQrCode, copiaCola: pixCopaCola } : null,
  })
}
