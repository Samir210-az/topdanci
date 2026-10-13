import { useEffect, useState } from 'react'
import { onToast } from '../lib/events'

export default function ToastHost() {
  const [toasts, setToasts] = useState([])

  useEffect(
    () =>
      onToast(({ message, kind }) => {
        const id = crypto.randomUUID()
        setToasts((list) => [...list, { id, message, kind }])
        setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 6000)
      }),
    [],
  )

  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.kind}`} role={toast.kind === 'error' ? 'alert' : 'status'}>
          {toast.message}
        </div>
      ))}
    </div>
  )
}
