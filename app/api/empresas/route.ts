import { NextRequest } from 'next/server'
import { supabaseServer, supabaseAdmin, ok, E, withAuth, sanitize, log } from '@/lib/api-helpers'

export async function GET(req: NextRequest) {
  const restId = (req.nextUrl.searchParams.get('restauranteId') ?? '').trim()
  if (!restId) return E.badRequest('restauranteId é obrigatório.')

  const sb = await supabaseServer()
  const { data, error } = await sb
    .from('empresas')
    .select('id, nome, horario_limite, preco_por_refeicao, ativa')
    .eq('restaurante_id', restId).eq('ativa', true).order('nome')
  if (error) return E.internal(error.message)
  return ok(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return E.badRequest()

  const nome           = sanitize(body.nome)
  const restauranteRef = sanitize(body.restauranteRef ?? '')
  const hl             = sanitize(body.horarioLimite) || '09:30'
  const preco          = parseFloat(String(body.preco ?? '15')) || 15
  const colabId        = sanitize(body.colabId ?? '')

  if (!nome)           return E.badRequest('Nome da empresa é obrigatório.')
  if (!restauranteRef) return E.badRequest('Referência do restaurante é obrigatória.')

  // Usa admin para verificar o restaurante (rota pública no cadastro do gestor)
  const admin = supabaseAdmin()
  const { data: rest } = await admin
    .from('restaurantes').select('id, ativo').eq('id', restauranteRef).maybeSingle() as any
  if (!rest || !rest.ativo) return E.notFound('Restaurante não encontrado.')

  const { data: emp, error } = await admin
    .from('empresas')
    .insert({ nome, restaurante_id: rest.id, horario_limite: hl, preco_por_refeicao: preco })
    .select('id').single() as any
  if (error) return E.internal(error.message)

  // Se vier colabId, vincula o gestor à empresa criada
  if (colabId) {
    await admin.from('colaboradores')
      .update({ empresa_id: emp.id })
      .eq('id', colabId)
  }

  await log('EMPRESA_CRIADA', `${nome} → ${rest.id}`, emp.id)
  return ok({ id: emp.id }, 201)
}
