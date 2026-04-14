// ============================================================
// MENUV — API Helpers
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// ── Supabase clients ─────────────────────────────────────────

export async function supabaseServer() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list: { name: string; value: string; options?: object }[]) => {
          try { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options as any)) }
          catch {}
        },
      },
    }
  )
}

export function supabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function getAppMeta() {
  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  return user?.app_metadata ?? null
}

// ── Respostas padronizadas ────────────────────────────────────

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, code: status, data }, { status })
}

export function err(message: string, status = 500) {
  return NextResponse.json({ success: false, code: status, error: message }, { status })
}

export const E = {
  badRequest:   (msg = 'Parâmetros inválidos.')    => err(msg, 400),
  unauthorized: (msg = 'Não autorizado.')           => err(msg, 401),
  forbidden:    (msg = 'Acesso negado.')            => err(msg, 403),
  notFound:     (msg = 'Recurso não encontrado.')   => err(msg, 404),
  conflict:     (msg = 'Registro já existe.')       => err(msg, 409),
  internal:     (msg = 'Erro interno do servidor.') => err(msg, 500),
  suspended:    ()                                   => err('Conta suspensa. Entre em contato com o suporte Menuv.', 403),
}

// ── Auth guard ────────────────────────────────────────────────

type AppRole = 'admin' | 'restaurante' | 'rest_usuario' | 'colaborador' | 'suspenso'
type AppMeta = Record<string, any>
type RouteHandler = (req: NextRequest, meta: AppMeta, params?: Record<string, string>) => Promise<NextResponse>

export function withAuth(allowedRoles: AppRole[] = []) {
  return function(handler: RouteHandler) {
    return async function(req: NextRequest, ctx?: { params?: Record<string, string> }) {
      const meta = await getAppMeta()
      if (!meta) return E.unauthorized()
      if (meta.app_role === 'suspenso') return E.suspended()
      if (allowedRoles.length > 0 && !allowedRoles.includes(meta.app_role as AppRole)) {
        return E.forbidden()
      }
      try {
        return await handler(req, meta, ctx?.params)
      } catch (e) {
        console.error('[API Error]', e)
        return E.internal()
      }
    }
  }
}

// ── Input helpers ─────────────────────────────────────────────

export function sanitize(val: unknown): string {
  if (val === null || val === undefined) return ''
  return String(val).trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
}

export function sanitizeEmail(val: unknown): string {
  return sanitize(val).toLowerCase().replace(/[^a-z0-9@._+-]/g, '')
}

export function toIsoDate(val: string): string | null {
  const parts = val.trim().split('/')
  if (parts.length === 3) {
    const [d, m, y] = parts
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(val) ? val : null
}

export async function log(acao: string, detalhe = '', usuarioId?: string) {
  try {
    const sb = await supabaseServer()
    await sb.rpc('inserir_log', { p_acao: acao, p_detalhe: detalhe, p_usuario_id: usuarioId ?? null })
  } catch {}
}
