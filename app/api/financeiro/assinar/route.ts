import { NextRequest } from 'next/server'
import { supabaseAdmin, getAppMeta, ok, E, sanitize } from '@/lib/api-helpers'
import {
  criarCustomer, buscarCustomerPorEmail, atualizarCustomer,
  criarCobrancaPix, criarAssinaturaCartao,
  buscarPixQr, vencimentoEmDias,
  type TipoPagamento,
} from '@/lib/asaas'
import { valorMensal, valorAnual } from '@/lib/planos-config'

export async function POST(req: NextRequest) {
  try {
    const meta = await getAppMeta()
    if (!meta) return E.unauthorized()
    if (meta.app_role !== 'restaurante' && meta.app_role !== 'admin') return E.forbidden()

    const body = await req.json().catch(() => null)
    const tipo  = sanitize(body?.tipo ?? '') as TipoPagamento

    if (!['pix_mensal', 'pix_anual', 'cartao_mensal'].includes(tipo))
      return E.badRequest('tipo inválido.')

    const restId = meta.app_role === 'admin'
      ? sanitize(body?.restId ?? '')
      : (meta.restaurante_id ?? '')

    if (!restId) return E.forbidden()

    const admin = supabaseAdmin()

    const { data: rest }: { data: any } = await admin
      .from('restaurantes')
      .select('id, nome, email, asaas_customer_id, plano_lancamento, documento_fiscal')
      .eq('id', restId).single() as any

    if (!rest) return E.notFound('Restaurante não encontrado.')

    const { count: numEmpresas } = await admin
      .from('empresas').select('*', { count: 'exact', head: true })
      .eq('restaurante_id', restId)

    const planoLanc = !!(rest.plano_lancamento)
    const total     = numEmpresas ?? 0

    const valor = tipo === 'pix_anual'
      ? valorAnual(total, planoLanc)
      : valorMensal(total, planoLanc)

    // Garante cliente no Asaas com CPF/CNPJ sempre sincronizado
    let customerId = rest.asaas_customer_id as string | null
    if (!customerId) {
      let customer = await buscarCustomerPorEmail(rest.email)
      if (!customer) customer = await criarCustomer(rest.nome, rest.email, rest.documento_fiscal ?? undefined)
      customerId = customer.id
      await admin.from('restaurantes').update({ asaas_customer_id: customerId }).eq('id', restId)
    }

    // Sempre atualiza CPF/CNPJ no Asaas para garantir que está preenchido
    if (rest.documento_fiscal) {
      await atualizarCustomer(customerId, { cpfCnpj: rest.documento_fiscal }).catch(() => {})
    }

    const descricao = `Menuv — ${rest.nome} — ${
      tipo === 'pix_anual' ? 'Anual' : tipo === 'cartao_mensal' ? 'Mensal Cartão' : 'Mensal Pix'
    }`

    let paymentId   = ''
    let invoiceUrl  = ''
    let pixQrCode   = ''
    let pixCopaCola = ''

    if (tipo === 'cartao_mensal') {
      const sub = await criarAssinaturaCartao(customerId, valor, descricao, vencimentoEmDias(1))
      await admin.from('restaurantes').update({ asaas_subscription_id: sub.id }).eq('id', restId)
      paymentId  = sub.id
      invoiceUrl = `https://asaas.com/c/${sub.id}`
    } else {
      const venc    = vencimentoEmDias(tipo === 'pix_anual' ? 3 : 1)
      const payment = await criarCobrancaPix(customerId, valor, descricao, venc)
      paymentId     = payment.id
      invoiceUrl    = payment.invoiceUrl ?? ''

      const pix   = await buscarPixQr(payment.id)
      pixQrCode   = pix.encodedImage ?? ''
      pixCopaCola = pix.payload ?? ''
    }

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

  } catch (err: any) {
    console.error('[financeiro/assinar]', err?.message ?? err)
    return E.internal(err?.message ?? 'Erro ao processar pagamento.')
  }
}
