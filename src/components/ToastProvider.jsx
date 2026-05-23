import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

const ToastContext = createContext({ toast: () => {} });

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const removeToast = useCallback((id) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(({ type = 'success', title, message }) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setItems((current) => [...current, { id, type, title, message }]);
    window.setTimeout(() => removeToast(id), 3500);
  }, [removeToast]);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-20 z-[80] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 sm:right-6">
        {items.map((item) => {
          const isError = item.type === 'error';
          const Icon = isError ? AlertCircle : CheckCircle2;
          return (
            <div
              key={item.id}
              className="rounded-2xl border border-white/80 bg-white p-4 shadow-glow ring-1 ring-slate-900/5"
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isError ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  <Icon size={19} />
                </div>
                <div className="min-w-0 flex-1">
                  {item.title && <p className="font-bold text-slate-950">{item.title}</p>}
                  {item.message && <p className="mt-1 text-sm leading-5 text-slate-600">{item.message}</p>}
                </div>
                <button type="button" onClick={() => removeToast(item.id)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <X size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
