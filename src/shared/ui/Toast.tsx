import { type ReactNode, createContext, useCallback, useContext, useState } from "react";
import { cn } from "../lib/cn";
import { Icon, type IconName } from "./Icon";

export type ToastTone = "success" | "error" | "default";

export interface Toast {
  id: number;
  tone: ToastTone;
  message: ReactNode;
}

export interface ToastContextValue {
  toast: (message: ReactNode, tone?: ToastTone) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe usarse dentro de <ToastProvider>");
  }
  return context;
}

const TONE_ICON: Partial<Record<ToastTone, IconName>> = {
  success: "aprobar",
  error: "anular",
};

const TONE_CLASS: Partial<Record<ToastTone, string>> = {
  success: "toast--success",
  error: "toast--error",
};

const TONE_LABEL: Partial<Record<ToastTone, string>> = {
  success: "Éxito",
  error: "Error",
};

export interface ToastProviderProps {
  children: ReactNode;
  duration?: number;
}

export function ToastProvider({ children, duration = 5000 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    (message: ReactNode, tone: ToastTone = "default") => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { id, tone, message }]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== id));
      }, duration);
    },
    [duration],
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      {toasts.length > 0 ? (
        <div className="toast-region" role="status" aria-live="polite">
          {toasts.map((item) => {
            const toneIcon = TONE_ICON[item.tone];
            return (
              <div key={item.id} className={cn("toast", TONE_CLASS[item.tone])}>
                {toneIcon ? (
                  <Icon name={toneIcon} className="toast__icon" aria-hidden="true" />
                ) : null}
                <div className="toast__content">
                  {TONE_LABEL[item.tone] ? (
                    <span className="toast__label">{TONE_LABEL[item.tone]}</span>
                  ) : null}
                  <span className="toast__message">{item.message}</span>
                </div>
                <button
                  type="button"
                  className="toast__close"
                  onClick={() => dismiss(item.id)}
                  aria-label="Cerrar notificación"
                >
                  <Icon name="cerrarPanel" size={16} aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}
