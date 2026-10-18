import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWarranties } from '../../context/WarrantyContext';
import { Search, X, Shield, ArrowRight } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { getWarrantyStatus } from '../../utils/warrantyUtils';
import { calculateRemainingDays, formatDisplayDate } from '../../utils/dateUtils';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const { warranties } = useWarranties();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    if (!query.trim()) {
      return warranties.slice(0, 5); // Show recent 5 if query is empty
    }
    const q = query.toLowerCase();
    return warranties.filter((w) =>
      w.productName.toLowerCase().includes(q) ||
      w.brand.toLowerCase().includes(q) ||
      w.seller.toLowerCase().includes(q) ||
      w.invoiceNumber.toLowerCase().includes(q) ||
      (w.serialNumber && w.serialNumber.toLowerCase().includes(q)) ||
      w.category.toLowerCase().includes(q)
    );
  }, [query, warranties]);

  if (!isOpen) return null;

  const handleSelect = (warrantyId: string) => {
    onClose();
    navigate(`/warranties/${warrantyId}`);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-100"
      role="dialog"
      aria-modal="true"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 w-full max-w-2xl bg-white rounded-xl border border-[#E5E9EF] shadow-2xl overflow-hidden flex flex-col">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#E5E9EF] bg-white">
          <Search className="w-5 h-5 text-[#687385] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by product, brand, seller, invoice #, or serial..."
            className="w-full text-sm text-[#202733] placeholder:text-[#687385] outline-hidden bg-transparent"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-[#687385] hover:text-[#202733] p-1"
              aria-label="Clear query"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-flex text-[11px] font-mono text-[#687385] px-1.5 py-0.5 rounded border border-[#E5E9EF] bg-[#F7F8FA]">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-[#E5E9EF]">
          <div className="px-4 py-2 bg-[#F7F8FA] border-b border-[#E5E9EF] flex items-center justify-between text-xs text-[#687385]">
            <span>{query ? `Search results (${results.length})` : 'Recent registered warranties'}</span>
            <span>{query ? 'Select a result to open' : 'Quick jump'}</span>
          </div>

          {results.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#687385]">
              No warranties matching &quot;{query}&quot;. Check spelling or invoice number.
            </div>
          ) : (
            results.map((w) => {
              const status = getWarrantyStatus(w.warrantyExpiryDate);
              const remaining = calculateRemainingDays(w.warrantyExpiryDate);

              return (
                <button
                  key={w.id}
                  onClick={() => handleSelect(w.id)}
                  className="w-full text-left px-4 py-3 hover:bg-[#F7F8FA] transition-colors flex items-center justify-between gap-4 group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-[#202733] truncate group-hover:text-[#3157D5] transition-colors">
                        {w.productName}
                      </span>
                      <StatusBadge status={status} size="sm" />
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-[#687385]">
                      <span>{w.brand}</span>
                      <span aria-hidden="true">·</span>
                      <span>{w.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>Invoice: {w.invoiceNumber}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-medium text-[#202733]">
                      Expires {formatDisplayDate(w.warrantyExpiryDate)}
                    </div>
                    <div className="text-[11px] text-[#687385] tabular-nums">
                      {remaining > 0 ? `${remaining} days left` : 'Expired'}
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-[#687385] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-[#F7F8FA] border-t border-[#E5E9EF] flex items-center justify-between text-xs text-[#687385]">
          <div className="flex items-center gap-3">
            <span>Navigation:</span>
            <span className="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded border border-[#E5E9EF]">↑↓ Navigate</span>
            <span className="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded border border-[#E5E9EF]">↵ Select</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#3157D5]" />
            <span>WarrantyEase Quick Jump</span>
          </div>
        </div>
      </div>
    </div>
  );
};
