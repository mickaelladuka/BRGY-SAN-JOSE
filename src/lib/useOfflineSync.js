import { useEffect, useState, useCallback } from 'react'
import { api } from './api'
import { getQueue, removeFromQueue } from './offlineQueue'

export function useOfflineSync(onSuccess) {
  const [online, setOnline] = useState(navigator.onLine)
  const [syncing, setSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(getQueue().length)

  const sync = useCallback(async () => {
    const queue = getQueue()
    if (queue.length === 0) return

    setSyncing(true)
    for (const item of queue) {
      try {
        await api.post(item.endpoint, item.payload)
        removeFromQueue(item.id)
        setPendingCount((c) => Math.max(0, c - 1))
        if (onSuccess) onSuccess(item)
      } catch (err) {
        // If still offline or server error, stop trying
        if (!navigator.onLine) break
      }
    }
    setSyncing(false)
    setPendingCount(getQueue().length)
  }, [onSuccess])

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true)
      // Auto-sync when connection is restored
      sync()
    }
    const handleOffline = () => {
      setOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Try to sync on mount if online
    if (navigator.onLine) {
      sync()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [sync])

  return { online, syncing, pendingCount, sync }
}