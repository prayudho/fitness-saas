'use client'

import { useQuery } from '@tanstack/react-query'
import {
  getDashboardStats,
  getRevenueByMonth,
  getPackageBreakdown,
  getPaymentMethodBreakdown,
  getMemberGrowth,
  getClassPerformance,
  getTrainerPerformance,
  getRecentCheckins,
} from '@/lib/actions/reports'

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const result = await getDashboardStats()
      if (result.error) throw new Error(result.error)
      return result.data
    },
    staleTime: 60000,
  })
}

export function useRevenueByMonth(months = 6) {
  return useQuery({
    queryKey: ['revenue', months],
    queryFn: async () => {
      const result = await getRevenueByMonth(months)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    staleTime: 60000,
  })
}

export function usePackageBreakdown() {
  return useQuery({
    queryKey: ['package-breakdown'],
    queryFn: async () => {
      const result = await getPackageBreakdown()
      if (result.error) throw new Error(result.error)
      return result.data
    },
    staleTime: 60000,
  })
}

export function usePaymentMethodBreakdown() {
  return useQuery({
    queryKey: ['payment-breakdown'],
    queryFn: async () => {
      const result = await getPaymentMethodBreakdown()
      if (result.error) throw new Error(result.error)
      return result.data
    },
    staleTime: 60000,
  })
}

export function useMemberGrowth(months = 6) {
  return useQuery({
    queryKey: ['member-growth', months],
    queryFn: async () => {
      const result = await getMemberGrowth(months)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    staleTime: 60000,
  })
}

export function useClassPerformance() {
  return useQuery({
    queryKey: ['class-performance'],
    queryFn: async () => {
      const result = await getClassPerformance()
      if (result.error) throw new Error(result.error)
      return result.data
    },
    staleTime: 60000,
  })
}

export function useTrainerPerformance() {
  return useQuery({
    queryKey: ['trainer-performance'],
    queryFn: async () => {
      const result = await getTrainerPerformance()
      if (result.error) throw new Error(result.error)
      return result.data
    },
    staleTime: 60000,
  })
}

export function useRecentCheckins(limit = 5) {
  return useQuery({
    queryKey: ['recent-checkins', limit],
    queryFn: async () => {
      const result = await getRecentCheckins(limit)
      if (result.error) throw new Error(result.error)
      return result.data
    },
    staleTime: 30000,
  })
}
