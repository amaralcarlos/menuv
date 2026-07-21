import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/cadastro', '/reset-senha']
const ADMIN_PATHS   = ['/gestor']  // admin e restaurante podem acessar

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '?'))
  const isRoot   = pathname === '/'

  let res = NextResponse.next({ request: { headers: req.headers } })

  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list: { name: string; value: string; options?: object }[]) =>
          list.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options as any)
          ),
      },
    }
  )

  const { data: { session } } = await sb.auth.getSession()

  // Rotas que admin/restaurante podem acessar sem redirect
  const isAdminPath = ADMIN_PATHS.some(p => pathname.startsWith(p))

  // Não autenticado tentando aceder a rota protegida → vai para /
  if (!session && !isPublic && !isRoot) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Autenticado em rota de admin (ex: /gestor) → deixa passar
  if (session && isAdminPath) {
    const { data: refreshed } = await sb.auth.refreshSession()
    const user    = refreshed.session?.user ?? session.user
    const appRole = user.app_metadata?.app_role
    // Só admin e restaurante podem acessar /gestor diretamente
    if (appRole === 'admin' || appRole === 'restaurante') return res
    // Gestor acessa normalmente
    if (appRole === 'colaborador' && user.app_metadata?.is_gestor) return res
    // Outros → redireciona para seu painel
    return NextResponse.redirect(new URL('/pedidos', req.url))
  }

  // Autenticado na raiz → força refresh do JWT e redireciona para o painel correto
  if (session && isRoot) {
    // refreshSession garante que o role no JWT está atualizado
    const { data: refreshed } = await sb.auth.refreshSession()
    const user = refreshed.session?.user ?? session.user

    const appRole  = user.app_metadata?.app_role
    const isGestor = user.app_metadata?.is_gestor

    const dest = appRole === 'admin'                   ? '/admin'
               : appRole === 'restaurante'             ? '/dashboard'
               : appRole === 'colaborador' && isGestor ? '/gestor'
               : '/pedidos'

    return NextResponse.redirect(new URL(dest, req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon).*)'],
}
