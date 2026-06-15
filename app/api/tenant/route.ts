import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const subdomain = request.headers.get('x-tenant-subdomain')

  if (!subdomain) {
    return NextResponse.json({ tenant: null })
  }

  try {
    const supabase = createClient()
    const { data: rawBrand, error } = await supabase
      .from('brands')
      .select('id, name, subdomain, logo_url, primary_color, is_active')
      .eq('subdomain', subdomain)
      .eq('is_active', true)
      .single()

    type BrandRow = { id: string; name: string; subdomain: string; logo_url: string | null; primary_color: string | null; is_active: boolean }
    const brand = rawBrand as BrandRow | null

    if (error || !brand) {
      return NextResponse.json({ tenant: null }, { status: 404 })
    }

    return NextResponse.json({
      tenant: {
        id: brand.id,
        name: brand.name,
        subdomain: brand.subdomain,
        logoUrl: brand.logo_url,
        primaryColor: brand.primary_color,
        isActive: brand.is_active,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to resolve tenant' }, { status: 500 })
  }
}
