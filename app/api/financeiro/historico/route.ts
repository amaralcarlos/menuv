import { supabaseAdmin, getAppMeta, ok, E } from '@/lib/api-helpers'

export async function GET() {
  const meta = await getAppMeta()
  if (!meta) return E.unauthorized()
  if (meta.app_role !== 'restaurante' && meta.app_role !== 'admin') return E.forbidden()

  const restId = meta.restaurante_id
  if (!restId) return E.forbidden()

  const admin = supabaseAdmin()

  const { data: pagamentos, error }: { data: any; error: any } = await admin
    .from('pagamentos')
    .select('id, valor, status, tipo, vencimento, invoice_url, pix_copia_cola, criado_em')
    .eq('restaurante_id', restId)
    .order('criado_em', { ascending: false })
    .limit(24) as any

  if (error) return E.internal(error.message)

  // Busca próximo pagamento pendente
  const proximo = (pagamentos ?? []).find(p => p.status === 'PENDING')

  return ok({ pagamentos: pagamentos ?? [], proximo: proximo ?? null })
}
