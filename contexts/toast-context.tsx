'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { ToastNotification } from '@carbon/react'

type ToastKind = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: number
  kind: ToastKind
  title: string
  subtitle?: string
}

type Notify = (kind: ToastKind, title: string, subtitle?: string) => void

const ToastContext = createContext<Notify | undefined>(undefined)

/** Sayfa içi `message` state'leri yerine kullanılan, kendiliğinden kapanan bildirimler. */
export function useToast(): Notify {
  const notify = useContext(ToastContext)
  if (!notify) throw new Error('useToast must be used within a ToastProvider')
  return notify
}

let nextId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback<Notify>((kind, title, subtitle) => {
    setToasts((current) => [...current.slice(-3), { id: ++nextId, kind, title, subtitle }])
  }, [])

  const value = useMemo(() => notify, [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <ToastNotification
            key={toast.id}
            kind={toast.kind}
            title={toast.title}
            subtitle={toast.subtitle}
            timeout={toast.kind === 'error' ? 8000 : 5000}
            // Zaman aşımı ve kapat düğmesi onClose'u çağırır; görünürlüğü state yönetir.
            onClose={() => {
              dismiss(toast.id)
              return false
            }}
            lowContrast
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
