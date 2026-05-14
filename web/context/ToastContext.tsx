"use client";
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type ToastType = "error" | "success" | "info";

interface ToastEntry {
  id: string;
  message: string;
  type: ToastType;
  exiting: boolean;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const BG: Record<ToastType, string> = {
  error:   "rgba(224, 92, 107, 0.12)",
  success: "rgba(76, 175, 130, 0.12)",
  info:    "var(--color-surface)",
};
const BORDER: Record<ToastType, string> = {
  error:   "rgba(224, 92, 107, 0.4)",
  success: "rgba(76, 175, 130, 0.4)",
  info:    "var(--color-border)",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, message, type, exiting: false }]);

      // Begin exit animation after 3.2 s, remove after 3.35 s
      setTimeout(() => {
        setToasts((prev) =>
          prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
        );
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 150);
      }, 3200);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Fixed overlay — rendered at provider level so it floats above all pages */}
      <div
        aria-live="assertive"
        aria-atomic="false"
        className="fixed top-0 inset-x-0 z-50 flex flex-col items-center gap-2 pt-4 px-4 pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto max-w-sm w-full px-4 py-3 rounded-[10px] text-sm text-[var(--color-text)] ${
              t.exiting ? "toast-exit-anim" : "toast-enter"
            }`}
            style={{
              background: BG[t.type],
              border: `1px solid ${BORDER[t.type]}`,
              boxShadow: "var(--shadow-modal)",
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
