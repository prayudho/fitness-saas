import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // 1. Call updateSession to refresh the session and get a response
  const response = await updateSession(request)

  // 2. Extract subdomain and set x-tenant-subdomain header
  const hostname = request.headers.get('host') ?? ''
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'gerak.online'

  const isMainDomain =
    hostname === appDomain ||
    hostname === `www.${appDomain}` ||
    /^localhost(:\d+)?$/.test(hostname) ||
    /^127\.0\.0\.1(:\d+)?$/.test(hostname)

  if (!isMainDomain) {
    const subdomain = hostname.split('.')[0]
    if (subdomain && subdomain !== 'www') {
      response.headers.set('x-tenant-subdomain', subdomain)
    }
  }

  // 3. Set x-url and x-pathname headers
  response.headers.set('x-url', request.url)
  response.headers.set('x-pathname', request.nextUrl.pathname)

  // 4. Create Supabase client from request/response cookies and get user
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // 5. Protected paths — redirect unauthenticated users to /login
  const protectedPaths = ['/admin', '/staff', '/trainer', '/member', '/superadmin']
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p))

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // 6. Role-based routing
  const role = user?.app_metadata?.role as string | undefined

  if (role && user) {
    if (role === 'member') {
      if (
        pathname.startsWith('/admin') ||
        pathname.startsWith('/staff') ||
        pathname.startsWith('/trainer') ||
        pathname.startsWith('/superadmin')
      ) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/member'
        return NextResponse.redirect(redirectUrl)
      }
    }

    if (role === 'staff') {
      if (
        pathname.startsWith('/admin') ||
        pathname.startsWith('/trainer') ||
        pathname.startsWith('/superadmin')
      ) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/staff/checkin'
        return NextResponse.redirect(redirectUrl)
      }
    }

    if (role === 'trainer') {
      if (
        pathname.startsWith('/admin') ||
        pathname.startsWith('/staff') ||
        pathname.startsWith('/superadmin')
      ) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/trainer/schedule'
        return NextResponse.redirect(redirectUrl)
      }
    }

    if (role === 'admin') {
      if (pathname.startsWith('/superadmin')) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/admin/dashboard'
        return NextResponse.redirect(redirectUrl)
      }
    }

    // role === 'superadmin' can access everything — no restriction needed

    // 7. Redirect authenticated users away from /login and /register
    if (pathname === '/login' || pathname === '/register') {
      const redirectUrl = request.nextUrl.clone()

      switch (role) {
        case 'superadmin':
          redirectUrl.pathname = '/superadmin/dashboard'
          break
        case 'admin':
          redirectUrl.pathname = '/admin/dashboard'
          break
        case 'staff':
          redirectUrl.pathname = '/staff/checkin'
          break
        case 'trainer':
          redirectUrl.pathname = '/trainer/schedule'
          break
        case 'member':
        default:
          redirectUrl.pathname = '/member'
          break
      }

      return NextResponse.redirect(redirectUrl)
    }
  }

  // 8. Set x-user-role header
  if (role) {
    response.headers.set('x-user-role', role)
  }

  // 9. Return the response
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
