import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/cadastro']

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

  // Não autenticado tentando aceder a rota protegida → vai para /
  if (!session && !isPublic && !isRoot) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Autenticado na raiz → redireciona para o painel correcto
  if (session && isRoot) {
    const role     = session.user.app_metadata?.app_role
    const isGestor = session.user.app_metadata?.is_gestor
    const dest     = role === 'admin'       ? '/admin'
                   : role === 'restaurante' ? '/dashboard'
                   : role === 'colaborador' && isGestor ? '/gestor'
                   : '/pedidos'
    return NextResponse.redirect(new URL(dest, req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon).*)'],
}
