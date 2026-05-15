import { NextRequest } from 'next/server'
import { supabaseServer, supabaseAdmin, ok, E, log } from '@/lib/api-helpers'

function parseJwt(token: string) {
  try { return JSON.parse(atob(token.split('.')[1])) } catch { return null }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sb = await supabaseServer()
  const { data: { session } } = await sb.auth.getSession()
  if (!session) return E.unauthorized()

  const meta = parseJwt(session.access_token)?.app_metadata as any
  const { id: empresaId } = await params

  // Só gestor da empresa ou restaurante ou admin pode estender
  const isGestor     = meta?.app_role === 'colaborador' && meta?.is_gestor && meta?.empresa_id === empresaId
  const isRestaurante = meta?.app_role === 'restaurante'
  const isAdmin      = meta?.app_role === 'admin'

  if (!isGestor && !isRestaurante && !isAdmin) return E.forbidden()

  const admin = supabaseAdmin()

  const { data: emp }: { data: any } = await admin
    .from('empresas')
    .select('id, nome, horario_limite, extensao_ate')
    .eq('id', empresaId).single() as any

  if (!emp) return E.notFound('Empresa não encontrada.')

  // Verifica se horário limite já passou (extensão só faz sentido após o limite)
  const agora = new Date()
  const [h, m] = (emp.horario_limite ?? '09:30').split(':').map(Number)
  const limite = new Date()
  limite.setHours(h, m, 0, 0)

  // Extensão só pode ser ativada 5 minutos APÓS o horário limite
  const limiteExt = new Date(limite.getTime() + 5 * 60 * 1000)
  if (agora < limite)    return E.badRequest('O horário limite ainda não passou.')
  if (agora < limiteExt) {
    const minutosRestantes = Math.ceil((limiteExt.getTime() - agora.getTime()) / 60_000)
    return E.badRequest(`Aguarde ${minutosRestantes} min após o horário limite para liberar a extensão.`)
  }

  // Verifica se extensão já foi usada e expirou
  if (emp.extensao_ate) {
    const extAte = new Date(emp.extensao_ate)
    if (agora > extAte) return E.badRequest('Extensão já encerrada. Pedidos do dia bloqueados.')
    // Extensão ainda ativa
    return ok({ extensao_ate: emp.extensao_ate, msg: 'Extensão já está ativa.' })
  }

  // Cria extensão de 5 minutos a partir de agora
  const extensaoAte = new Date(agora.getTime() + 5 * 60 * 1000)

  const { error } = await admin
    .from('empresas')
    .update({ extensao_ate: extensaoAte.toISOString() })
    .eq('id', empresaId)

  if (error) return E.internal(error.message)

  await log('EXTENSAO_HORARIO', `${emp.nome} — +5 min até ${extensaoAte.toLocaleTimeString('pt-BR')}`)

  return ok({ extensao_ate: extensaoAte.toISOString() })
}
