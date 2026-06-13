import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // 1. Refresh session cookies
  const response = await updateSession(request)

  // 2. Resolve subdomain
  const hostname  = request.headers.get('host') ?? ''
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'gerak.online'

  const isMainDomain =
    hostname === appDomain ||
    hostname === `www.${appDomain}` ||
    /^localhost(:\d+)?$/.test(hostname) ||
    /^127\.0\.0\.1(:\d+)?$/.test(hostname)

  let subdomain: string | null = null

  if (!isMainDomain) {
    const sub = hostname.split('.')[0]
    if (sub && sub !== 'www') {
      subdomain = sub
      response.headers.set('x-tenant-subdomain', sub)

      // Redirect bare subdomain root → /login
      if (request.nextUrl.pathname === '/') {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = '/login'
        return NextResponse.redirect(loginUrl)
      }
    }
  }

  // 3. Common headers
  response.headers.set('x-url',      request.url)
  response.headers.set('x-pathname', request.nextUrl.pathname)

  // 4. Supabase client (reads cookies, does NOT forward brand header here
  //    since we're in middleware before the brand is fully resolved)
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

  const { data: { user } } = await supabase.auth.getUser()

  // 5. Resolve brand_id from subdomain (one cheap indexed lookup)
  let brandId: string | null = null
  if (subdomain) {
    const { data: brand } = await supabase
      .from('brands')
      .select('id')
      .eq('slug', subdomain)
      .eq('is_active', true)
      .maybeSingle()

    if (brand?.id) {
      brandId = brand.id
      // Set header for server components/actions and the Supabase client factory
      response.headers.set('x-brand-id', brand.id)
      // Set cookie so client-side hooks can read brand_id without an extra query
      response.cookies.set('__fp_brand_id', brand.id, {
        path:     '/',
        sameSite: 'lax',
        secure:   process.env.NODE_ENV === 'production',
        httpOnly: false,   // must be readable by client JS
        maxAge:   60 * 60 * 24 * 365,
      })
    }
  }

  const pathname = request.nextUrl.pathname

  // 6. Must-change-password check + resolve per-brand role
  const isMustChangePasswordExempt =
    pathname === '/change-password' ||
    pathname === '/login' ||
    pathname.startsWith('/api/')

  let brandRole: string | null = null

  if (user) {
    if (!isMustChangePasswordExempt && brandId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('must_change_password, role')
        .eq('id', user.id)
        .eq('brand_id', brandId)
        .maybeSingle()

      if (profile?.must_change_password === true) {
        const changePasswordUrl = request.nextUrl.clone()
        changePasswordUrl.pathname = '/change-password'
        return NextResponse.redirect(changePasswordUrl)
      }

      // Brand-specific role wins over JWT role for routing decisions
      brandRole = (profile?.role as string | null) ?? null
    }

    if (!brandRole) {
      brandRole = (user.app_metadata?.role as string | undefined) ?? null
    }
  }

  // 7. Protected paths
  const protectedPaths = ['/admin', '/staff', '/trainer', '/member', '/superadmin']
  const isProtected    = protectedPaths.some((p) => pathname.startsWith(p))

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // 8. Role-based route guards (prevents wrong-portal access)
  if (brandRole && user) {
    if (brandRole === 'member') {
      if (
        pathname.startsWith('/admin') ||
        pathname.startsWith('/staff') ||
        pathname.startsWith('/trainer') ||
        pathname.startsWith('/superadmin')
      ) {
        return NextResponse.redirect(new URL('/member', request.url))
      }
    }

    if (brandRole === 'staff') {
      if (
        pathname.startsWith('/admin') ||
        pathname.startsWith('/trainer') ||
        pathname.startsWith('/superadmin')
      ) {
        return NextResponse.redirect(new URL('/staff/checkin', request.url))
      }
    }

    if (brandRole === 'trainer') {
      if (
        pathname.startsWith('/admin') ||
        pathname.startsWith('/staff') ||
        pathname.startsWith('/superadmin')
      ) {
        return NextResponse.redirect(new URL('/trainer/schedule', request.url))
      }
    }

    if (brandRole === 'admin') {
      if (pathname.startsWith('/superadmin')) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      }
    }

    // Redirect away from /login and /register when already authenticated
    if (pathname === '/login' || pathname === '/register') {
      let dest = '/member'
      if (brandRole === 'superadmin') dest = '/superadmin/dashboard'
      else if (brandRole === 'admin')  dest = '/admin/dashboard'
      else if (brandRole === 'staff')  dest = '/staff/checkin'
      else if (brandRole === 'trainer') dest = '/trainer/schedule'
      return NextResponse.redirect(new URL(dest, request.url))
    }
  }

  // 9. Expose role header for layouts
  if (brandRole) {
    response.headers.set('x-user-role', brandRole)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
