import React from 'react';
import { useWarranties } from '../../context/WarrantyContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useWarranties();

  if (toasts.length === 0) return null;

  return (
    <div 
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border bg-white shadow-md transition-all ${
              isSuccess 
                ? 'border-[#CDEED8] text-[#202733]' 
                : isError 
                ? 'border-[#F9D0CE] text-[#202733]' 
                : 'border-[#E5E9EF] text-[#202733]'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-[#18794E]" />}
              {isError && <AlertCircle className="w-4 h-4 text-[#C03935]" />}
              {!isSuccess && !isError && <Info className="w-4 h-4 text-[#3157D5]" />}
            </div>
            
            <p className="text-xs leading-relaxed flex-1 text-[#202733]">
              {toast.message}
            </p>

            <button
              onClick={() => dismissToast(toast.id)}
              className="text-[#687385] hover:text-[#202733] transition-colors p-0.5"
              aria-label="Dismiss toast"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
