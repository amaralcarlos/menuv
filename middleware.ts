import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/', '/login', '/cadastro']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '?'))

  let res = NextResponse.next({ request: req })

  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) => list.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
      },
    }
  )

  const { data: { session } } = await sb.auth.getSession()

  // Não autenticado → redireciona para /
  if (!session && !isPublic) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Autenticado tentando acessar login → redireciona para app
  if (session && (pathname === '/login' || pathname === '/cadastro' || pathname === '/')) {
    const role = session.user.app_metadata?.app_role
    const dest = role === 'admin' ? '/admin'
               : role === 'colaborador' ? '/pedidos'
               : '/dashboard'
    return NextResponse.redirect(new URL(dest, req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon).*)'],
}
