import { NextRequest } from 'next/server'
import { supabaseServer, ok, E } from '@/lib/api-helpers'

function parseJwt(token: string) {
  try { return JSON.parse(atob(token.split('.')[1])) } catch { return null }
}

const DOW = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab']

function fmtDate(d: Date) {
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

export async function GET(req: NextRequest) {
  const sb = await supabaseServer()
  const { data: { session } } = await sb.auth.getSession()
  if (!session) return E.unauthorized()

  const meta   = parseJwt(session.access_token)?.app_metadata as any
  const restId = req.nextUrl.searchParams.get('restauranteId') ?? meta?.restaurante_id ?? ''
  if (!restId) return E.badRequest('restauranteId é obrigatório.')

  const { data: grades } = await sb.rpc('get_grade_ativa', { p_restaurante_id: restId })
  const grade = Array.isArray(grades) && grades.length > 0 ? grades[0] : null
  if (!grade) return ok([])

  const dias = grade.dias ?? {}
  const hoje = new Date(); hoje.setHours(0,0,0,0)
  const ini  = grade.data_inicio ? new Date(grade.data_inicio + 'T00:00:00') : new Date(hoje)
  const fim  = grade.data_fim    ? new Date(grade.data_fim    + 'T00:00:00') : new Date(hoje.getTime() + 13*86_400_000)
  fim.setHours(23,59,59,0)

  const result: any[] = []
  const cur = new Date(ini); cur.setHours(0,0,0,0)
  while (cur <= fim && result.length < 14) {
    const dow = DOW[cur.getDay()]
    const dd  = (dias as any)[dow]
    if (dd) result.push({
      data:       fmtDate(cur),
      pratos:     (dd.prato    ?? []).map((nome: string, i: number) => ({ nome, ordem: i })),
      guarnicoes: (dd.guarnicao ?? []).map((nome: string, i: number) => ({ nome, ordem: i })),
      outros:     (dd.outros   ?? []).map((nome: string, i: number) => ({ nome, ordem: i })),
    })
    cur.setDate(cur.getDate()+1)
  }
  return ok(result)
}
