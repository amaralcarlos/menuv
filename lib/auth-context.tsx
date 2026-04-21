'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import type { Session, User } from '@supabase/supabase-js'

export interface AppMeta {
  app_role: 'admin' | 'restaurante' | 'rest_usuario' | 'colaborador' | 'suspenso'
  nome?: string
  restaurante_id?: string
  empresa_id?: string
  colaborador_id?: string
  is_gestor?: boolean
  perfil?: 'admin' | 'colaborador'
}

interface AuthCtx {
  session: Session | null
  user: User | null
  meta: AppMeta | null
  loading: boolean
  signOut: () => Promise<void>
}

function parseJwt(token: string): any {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

function getMetaFromSession(session: Session | null): AppMeta | null {
  if (!session?.access_token) return null
  const jwt = parseJwt(session.access_token)
  return (jwt?.app_metadata ?? session.user?.app_metadata ?? null) as AppMeta | null
}

const Ctx = createContext<AuthCtx>({ session: null, user: null, meta: null, loading: true, signOut: async () => {} })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const sb = supabaseBrowser()

  useEffect(() => {
    sb.auth.getSession().then(({ data }: { data: any }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: { subscription } } = sb.auth.onAuthStateChange((_ev: any, s: any) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  const signOut = useCallback(async () => {
    await sb.auth.signOut()
    window.location.href = '/'
  }, [])

  const meta = getMetaFromSession(session)

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, meta, loading, signOut }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
