const QUEUE_KEY = 'annex6.offlineQueue'

export function getQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  } catch {
    return []
  }
}

export function addToQueue(item) {
  const queue = getQueue()
  queue.push({ ...item, queuedAt: new Date().toISOString(), id: Date.now() })
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export function removeFromQueue(id) {
  const queue = getQueue().filter((item) => item.id !== id)
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY)
}

export function getQueueCount() {
  return getQueue().length
}