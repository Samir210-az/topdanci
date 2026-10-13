import { useEffect, useState } from 'react'

let deferred = null
const listeners = new Set()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferred = event
    listeners.forEach((fn) => fn())
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    listeners.forEach((fn) => fn())
  })
}

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

const isIos = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent)

export function usePwaInstall() {
  const [, tick] = useState(0)
  useEffect(() => {
    const fn = () => tick((n) => n + 1)
    listeners.add(fn)
    return () => listeners.delete(fn)
  }, [])

  return {
    installed: isStandalone(),
    canPrompt: Boolean(deferred),
    ios: isIos(),
    async install() {
      if (!deferred) return false
      const prompt = deferred
      deferred = null
      prompt.prompt()
      const { outcome } = await prompt.userChoice
      listeners.forEach((fn) => fn())
      return outcome === 'accepted'
    },
  }
}
