// Client-side brand_id helper.
// Reads the __fp_brand_id cookie set by middleware when the subdomain is resolved.

export function getClientBrandId(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)__fp_brand_id=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}
