export interface Tenant {
  id: string
  name: string
  subdomain: string
  logoUrl: string | null
  primaryColor: string | null
  isActive: boolean
}

export interface TenantContext {
  tenant: Tenant | null
  isLoading: boolean
  error: string | null
}
