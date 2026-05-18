import { useState, useCallback } from 'react'
import { Purchases } from '@revenuecat/purchases-capacitor'
import { Capacitor } from '@capacitor/core'

export function useRevenueCat() {
  const [isPro, setIsPro] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkProStatus = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
      return false
    }

    try {
      setLoading(true)
      setError(null)
      
      const customerInfo = await Purchases.getCustomerInfo()
      const isActive = customerInfo.activeSubscriptions?.hasOwnProperty('monthly-499') ||
                      customerInfo.activeSubscriptions?.hasOwnProperty('supporter_monthly') ||
                      customerInfo.activeSubscriptions?.hasOwnProperty('lifetime_4999') ||
                      customerInfo.activeSubscriptions?.hasOwnProperty('lifetime') ||
                      customerInfo.nonSubscriptions?.purchased?.length > 0
      
      setIsPro(isActive)
      return isActive
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check pro status'
      setError(errorMessage)
      console.error('checkProStatus error:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const purchaseMonthly = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
      setError('Purchases only available on native platform')
      return false
    }

    try {
      setLoading(true)
      setError(null)
      
      const offerings = await Purchases.getOfferings()
      if (!offerings.current) {
        setError('No offerings available')
        return false
      }
      
      const product = offerings.current.availableProducts.find(p => 
        p.identifier === 'monthly-499' || p.identifier === 'supporter_monthly'
      )
      
      if (!product) {
        setError('Monthly product not found')
        return false
      }
      
      await Purchases.purchasePackage({ product })
      
      // Check pro status after purchase
      const isActive = await checkProStatus()
      return isActive
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to purchase monthly'
      setError(errorMessage)
      console.error('purchaseMonthly error:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [checkProStatus])

  const purchaseLifetime = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
      setError('Purchases only available on native platform')
      return false
    }

    try {
      setLoading(true)
      setError(null)
      
      const offerings = await Purchases.getOfferings()
      if (!offerings.current) {
        setError('No offerings available')
        return false
      }
      
      const product = offerings.current.availableProducts.find(p => 
        p.identifier === 'lifetime_4999' || p.identifier === 'lifetime'
      )
      
      if (!product) {
        setError('Lifetime product not found')
        return false
      }
      
      await Purchases.purchasePackage({ product })
      
      // Check pro status after purchase
      const isActive = await checkProStatus()
      return isActive
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to purchase lifetime'
      setError(errorMessage)
      console.error('purchaseLifetime error:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [checkProStatus])

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
      setError('Purchases only available on native platform')
      return false
    }

    try {
      setLoading(true)
      setError(null)
      
      await Purchases.restorePurchases()
      
      // Check pro status after restore
      const isActive = await checkProStatus()
      return isActive
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore purchases'
      setError(errorMessage)
      console.error('restorePurchases error:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [checkProStatus])

  return {
    isPro,
    loading,
    error,
    checkProStatus,
    purchaseMonthly,
    purchaseLifetime,
    restorePurchases,
  }
}
