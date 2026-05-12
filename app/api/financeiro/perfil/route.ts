import { NextRequest } from 'next/server'
import { supabaseAdmin, getAppMeta, ok, E, sanitize } from '@/lib/api-helpers'
import { criarCustomer, buscarCustomerPorEmail } from '@/lib/asaas'

function limparDoc(doc: string) {
  return doc.replace(/\D/g, '')
}

function validarDoc(doc: string): 'cpf' | 'cnpj' | null {
  const d = limparDoc(doc)
  if (d.length === 11) return 'cpf'
  if (d.length === 14) return 'cnpj'
  return null
}

export async function POST(req: NextRequest) {
  try {
    const meta = await getAppMeta()
    if (!meta) return E.unauthorized()
    if (meta.app_role !== 'restaurante' && meta.app_role !== 'admin') return E.forbidden()

    const body = await req.json().catch(() => null)
    const restId = meta.app_role === 'admin'
      ? sanitize(body?.restId ?? '')
      : (meta.restaurante_id ?? '')

    if (!restId) return E.forbidden()

    const documento = limparDoc(sanitize(body?.documento ?? ''))
    const telefone  = sanitize(body?.telefone ?? '')

    if (!validarDoc(documento))
      return E.badRequest('CPF (11 dígitos) ou CNPJ (14 dígitos) inválido.')

    const admin = supabaseAdmin()

    const { data: rest }: { data: any } = await admin
      .from('restaurantes')
      .select('id, nome, email, asaas_customer_id')
      .eq('id', restId).single() as any

    if (!rest) return E.notFound('Restaurante não encontrado.')

    // Salva documento no banco
    await admin.from('restaurantes')
      .update({ documento_fiscal: documento })
      .eq('id', restId)

    // Cria/atualiza cliente no Asaas com o documento
    let customerId = rest.asaas_customer_id as string | null
    if (!customerId) {
      let customer = await buscarCustomerPorEmail(rest.email)
      if (!customer) {
        customer = await criarCustomer(rest.nome, rest.email, documento, telefone || undefined)
      }
      customerId = customer.id
      await admin.from('restaurantes').update({ asaas_customer_id: customerId }).eq('id', restId)
    }

    return ok({ customerId, documento })

  } catch (err: any) {
    console.error('[financeiro/perfil]', err?.message ?? err)
    return E.internal(err?.message ?? 'Erro ao salvar perfil fiscal.')
  }
}
