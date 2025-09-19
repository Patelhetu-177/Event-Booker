"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ToastProps {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive" | "success"
  onClose: (id: string) => void
}

export function Toast({ id, title, description, variant = "default", onClose }: ToastProps) {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id)
    }, 5000)

    return () => clearTimeout(timer)
  }, [id, onClose])

  const variantStyles = {
    default: "bg-white border border-gray-200 text-gray-900",
    destructive: "bg-red-50 border border-red-200 text-red-900",
    success: "bg-green-50 border border-green-200 text-green-900",
  }

  return (
    <div
      className={cn(
        "relative flex w-full max-w-sm items-center space-x-4 overflow-hidden rounded-md p-4 shadow-lg transition-all",
        variantStyles[variant]
      )}
    >
      <div className="flex-1">
        {title && <div className="text-sm font-semibold">{title}</div>}
        {description && <div className="text-sm opacity-90">{description}</div>}
      </div>
      <button
        onClick={() => onClose(id)}
        className="absolute right-2 top-2 rounded-md p-1 text-gray-400 hover:text-gray-600"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

interface ToastContextType {
  toast: (props: Omit<ToastProps, "id" | "onClose">) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export { ToastContext }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastProps[]>([])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const toast = React.useCallback((props: Omit<ToastProps, "id" | "onClose">) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { ...props, id, onClose: removeToast }])
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2">
        {toasts.map((toastProps) => (
          <Toast key={toastProps.id} {...toastProps} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

export function toast(props: Omit<ToastProps, "id" | "onClose">) {
  const id = Math.random().toString(36).substring(2, 9)
  const event = new CustomEvent('show-toast', {
    detail: { id, ...props }
  })
  window.dispatchEvent(event)
  
  return {
    id,
    dismiss: () => {
      const dismissEvent = new CustomEvent('dismiss-toast', { detail: { id } })
      window.dispatchEvent(dismissEvent)
    }
  }
}
