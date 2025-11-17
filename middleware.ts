import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Se não estiver autenticado e tentar acessar rotas protegidas
  if (!session && req.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Se estiver autenticado e tentar acessar login
  if (session && req.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return res
}

export const config = {
  matcher: ['/', '/login', '/credits'],
}
