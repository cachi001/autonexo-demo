"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";

type Tono = "exito" | "error";
type ToastItem = { id: number; tono: Tono; mensaje: string };

type ToastContextType = { mostrar: (tono: Tono, mensaje: string) => void };

const ToastContext = createContext<ToastContextType | null>(null);

// Antes los errores de las acciones (publicar, pausar, eliminar, verificar)
// quedaban como texto chico pegado debajo de un ícono, fácil de no ver. Ahora
// cualquier resultado (éxito o error) de esas acciones aparece como una
// notificación flotante, visible sí o sí, que se cierra sola o con el botón X.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const mostrar = useCallback((tono: Tono, mensaje: string) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, tono, mensaje }]);
    setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 6000);
  }, []);

  function cerrar(id: number) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <ToastContext.Provider value={{ mostrar }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 sm:top-6 sm:right-6">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-start gap-2.5 rounded-lg border p-3 shadow-lg ${
              item.tono === "exito" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-red-300 bg-red-50 text-red-800"
            }`}
          >
            {item.tono === "exito" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
            )}
            <p className="flex-1 text-sm font-medium leading-snug">{item.mensaje}</p>
            <button onClick={() => cerrar(item.id)} className="shrink-0 opacity-60 hover:opacity-100" aria-label="Cerrar">
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast tiene que usarse dentro de ToastProvider.");
  return ctx;
}
