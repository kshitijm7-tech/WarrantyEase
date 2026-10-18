import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  ArrowUpRight, 
  Package, 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  ChevronRight,
  Sparkles,
  ArrowRight,
  Calendar,
  FileCheck2,
  Bot
} from 'lucide-react';
import { useWarranties } from '../context/WarrantyContext';
import { StatusBadge } from '../components/ui/StatusBadge';
import { AddInvoiceModal } from '../components/warranties/AddInvoiceModal';
import { formatDisplayDate, calculateRemainingDays, formatRemainingTime } from '../utils/dateUtils';
import { getWarrantyStatus } from '../utils/warrantyUtils';

export const OverviewPage: React.FC = () => {
  const { warranties, metrics } = useWarranties();
  const navigate = useNavigate();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'urgent'>('all');

  // Expiring soon items (status === 'expiring_soon')
  const expiringSoonList = useMemo(() => {
    return warranties
      .filter((w) => {
        const status = getWarrantyStatus(w.warrantyExpiryDate);
        if (status !== 'expiring_soon') return false;
        if (priorityFilter === 'urgent') {
          return calculateRemainingDays(w.warrantyExpiryDate) <= 15;
        }
        return true;
      })
      .sort((a, b) => {
        const diffA = calculateRemainingDays(a.warrantyExpiryDate);
        const diffB = calculateRemainingDays(b.warrantyExpiryDate);
        return diffA - diffB;
      });
  }, [warranties, priorityFilter]);

  // Recently added products (sorted by purchaseDate descending)
  const recentlyAddedList = useMemo(() => {
    return [...warranties]
      .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
      .slice(0, 5);
  }, [warranties]);

  // Monthly Expiry Forecast (next 6 months starting from current month Oct 2026)
  const monthlyForecast = useMemo(() => {
    const months = [
      { key: '2026-10', label: 'Oct 2026', count: 0, items: [] as string[] },
      { key: '2026-11', label: 'Nov 2026', count: 0, items: [] as string[] },
      { key: '2026-12', label: 'Dec 2026', count: 0, items: [] as string[] },
      { key: '2027-01', label: 'Jan 2027', count: 0, items: [] as string[] },
      { key: '2027-02', label: 'Feb 2027', count: 0, items: [] as string[] },
      { key: '2027-03', label: 'Mar 2027', count: 0, items: [] as string[] },
    ];

    warranties.forEach((w) => {
      const monthKey = w.warrantyExpiryDate.substring(0, 7);
      const target = months.find((m) => m.key === monthKey);
      if (target) {
        target.count++;
        target.items.push(w.productName);
      }
    });

    return months;
  }, [warranties]);

  return (
    <div className="space-y-8">
      {/* Page Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#202733]">
            Overview
          </h1>
          <p className="text-sm text-[#687385] mt-1">
            Keep track of your purchases and warranty coverage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/warranties"
            className="px-4 py-2 text-xs font-semibold text-[#202733] bg-white border border-[#E5E9EF] rounded-lg hover:bg-[#F7F8FA] transition-colors shadow-2xs whitespace-nowrap"
          >
            View warranties
          </Link>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#3157D5] hover:bg-[#2648B8] rounded-lg transition-colors shadow-2xs whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[2.2]" />
            <span>Add invoice</span>
          </button>
        </div>
      </div>

      {/* Interactive Summary Metrics Panels (Clickable to jump to filtered views!) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Metric 1: Total products */}
        <button
          onClick={() => navigate('/warranties')}
          className="p-5 bg-white rounded-xl border border-[#E5E9EF] hover:border-[#3157D5] hover:shadow-xs transition-all flex flex-col justify-between text-left group"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-[#687385] uppercase tracking-wider group-hover:text-[#3157D5] transition-colors">
              Total Products
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#F7F8FA] group-hover:bg-[#EEF3FF] flex items-center justify-center text-[#687385] group-hover:text-[#3157D5] transition-colors">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-[#202733] tabular-nums tracking-tight">
              {metrics.totalProducts}
            </div>
            <div className="flex items-center justify-between text-[12px] text-[#687385] mt-1">
              <span>All registered records</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-[#3157D5]" />
            </div>
          </div>
        </button>

        {/* Metric 2: Active warranties */}
        <button
          onClick={() => navigate('/warranties?status=active')}
          className="p-5 bg-white rounded-xl border border-[#E5E9EF] hover:border-[#18794E] hover:shadow-xs transition-all flex flex-col justify-between text-left group"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-[#687385] uppercase tracking-wider group-hover:text-[#18794E] transition-colors">
              Active Warranties
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#EAF7EF] flex items-center justify-center text-[#18794E]">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-[#18794E] tabular-nums tracking-tight">
              {metrics.activeWarranties}
            </div>
            <div className="flex items-center justify-between text-[12px] text-[#687385] mt-1">
              <span>Protected in full</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-[#18794E]" />
            </div>
          </div>
        </button>

        {/* Metric 3: Expiring soon */}
        <button
          onClick={() => navigate('/warranties?status=expiring_soon')}
          className="p-5 bg-white rounded-xl border border-[#E5E9EF] hover:border-[#9A6700] hover:shadow-xs transition-all flex flex-col justify-between text-left group"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-[#687385] uppercase tracking-wider group-hover:text-[#9A6700] transition-colors">
              Expiring Soon
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FFF5D9] flex items-center justify-center text-[#9A6700]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-[#9A6700] tabular-nums tracking-tight">
              {metrics.expiringSoonWarranties}
            </div>
            <div className="flex items-center justify-between text-[12px] text-[#687385] mt-1">
              <span>Next 30 days</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-[#9A6700]" />
            </div>
          </div>
        </button>

        {/* Metric 4: Expired warranties */}
        <button
          onClick={() => navigate('/warranties?status=expired')}
          className="p-5 bg-white rounded-xl border border-[#E5E9EF] hover:border-[#C03935] hover:shadow-xs transition-all flex flex-col justify-between text-left group"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-[#687385] uppercase tracking-wider group-hover:text-[#C03935] transition-colors">
              Expired
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FDECEC] flex items-center justify-center text-[#C03935]">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-[#C03935] tabular-nums tracking-tight">
              {metrics.expiredWarranties}
            </div>
            <div className="flex items-center justify-between text-[12px] text-[#687385] mt-1">
              <span>Standard term ended</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-[#C03935]" />
            </div>
          </div>
        </button>
      </div>

      {/* Interactive 6-Month Expiry Forecast Strip */}
      <div className="p-4 bg-white rounded-xl border border-[#E5E9EF] shadow-2xs space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#3157D5]" />
            <span className="font-semibold text-[#202733]">
              6-Month Expiration Schedule
            </span>
          </div>
          <span className="text-[#687385] text-[11px]">
            Hover or click month to review
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
          {monthlyForecast.map((m) => {
            const hasExpirations = m.count > 0;
            return (
              <div
                key={m.key}
                onClick={() => {
                  if (hasExpirations) {
                    navigate('/warranties?status=expiring_soon');
                  }
                }}
                className={`p-3 rounded-lg border text-center transition-all ${
                  hasExpirations
                    ? 'border-[#D5E2FF] bg-[#EEF3FF]/40 hover:bg-[#EEF3FF] cursor-pointer'
                    : 'border-[#E5E9EF] bg-[#F7F8FA] opacity-80'
                }`}
                title={hasExpirations ? `Expiring: ${m.items.join(', ')}` : 'No warranties expire this month'}
              >
                <div className="text-[11px] font-semibold text-[#687385]">
                  {m.label}
                </div>
                <div className={`text-base font-bold tabular-nums mt-1 ${
                  hasExpirations ? 'text-[#3157D5]' : 'text-[#202733]'
                }`}>
                  {m.count} {m.count === 1 ? 'item' : 'items'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Sections: Expiring Soon & Recently Added */}
      {warranties.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E9EF] p-12 text-center shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-[#EEF3FF] text-[#3157D5] mx-auto flex items-center justify-center mb-4">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-[#202733] mb-1">
            No registered warranties yet
          </h3>
          <p className="text-xs text-[#687385] max-w-md mx-auto mb-6">
            Upload your first purchase invoice or receipt to automatically track warranty expirations, coverage terms, and contact information.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#3157D5] rounded-lg hover:bg-[#2648B8] transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add your first invoice</span>
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Section: Expiring soon */}
          <div className="bg-white rounded-xl border border-[#E5E9EF] shadow-2xs overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E9EF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-[#202733]">
                  Expiring soon
                </h2>
                <p className="text-xs text-[#687385] mt-0.5">
                  Warranties nearing expiration within 30 days. File any needed repair claims promptly.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Priority Filter */}
                <div className="flex items-center gap-1 p-0.5 bg-[#F7F8FA] rounded-md border border-[#E5E9EF] text-xs">
                  <button
                    onClick={() => setPriorityFilter('all')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      priorityFilter === 'all'
                        ? 'bg-white text-[#202733] shadow-2xs'
                        : 'text-[#687385] hover:text-[#202733]'
                    }`}
                  >
                    Next 30d
                  </button>
                  <button
                    onClick={() => setPriorityFilter('urgent')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      priorityFilter === 'urgent'
                        ? 'bg-white text-[#9A6700] font-semibold shadow-2xs'
                        : 'text-[#687385] hover:text-[#202733]'
                    }`}
                  >
                    Next 15d
                  </button>
                </div>

                <Link
                  to="/warranties?status=expiring_soon"
                  className="text-xs font-medium text-[#3157D5] hover:text-[#2648B8] inline-flex items-center gap-1 group whitespace-nowrap"
                >
                  <span>View all</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>

            {expiringSoonList.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#687385]">
                No warranties in this timeframe. All active coverage is in good standing.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E5E9EF] bg-[#F7F8FA] text-[11px] font-semibold text-[#687385] uppercase tracking-wider">
                      <th className="py-2.5 px-5">Product</th>
                      <th className="py-2.5 px-4">Brand</th>
                      <th className="py-2.5 px-4">Expiry Date</th>
                      <th className="py-2.5 px-4">Days Remaining</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E9EF] text-xs">
                    {expiringSoonList.map((item) => {
                      const days = calculateRemainingDays(item.warrantyExpiryDate);
                      const status = getWarrantyStatus(item.warrantyExpiryDate);

                      return (
                        <tr 
                          key={item.id} 
                          className="hover:bg-[#F7F8FA] transition-colors group cursor-pointer"
                          onClick={() => navigate(`/warranties/${item.id}`)}
                        >
                          <td className="py-3.5 px-5 font-medium text-[#202733]">
                            <div className="truncate max-w-xs group-hover:text-[#3157D5] transition-colors">
                              {item.productName}
                            </div>
                            <div className="text-[11px] text-[#687385] font-normal truncate mt-0.5">
                              Invoice: {item.invoiceNumber}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-[#687385]">
                            {item.brand}
                          </td>
                          <td className="py-3.5 px-4 text-[#202733] tabular-nums font-medium">
                            {formatDisplayDate(item.warrantyExpiryDate)}
                          </td>
                          <td className="py-3.5 px-4 text-[#9A6700] font-semibold tabular-nums">
                            {formatRemainingTime(days)}
                          </td>
                          <td className="py-3.5 px-4">
                            <StatusBadge status={status} size="sm" />
                          </td>
                          <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                to={`/assistant?productId=${item.id}`}
                                className="p-1 rounded text-[#687385] hover:text-[#3157D5] hover:bg-[#EEF3FF] transition-colors"
                                title="Ask Assistant about claim terms"
                              >
                                <Bot className="w-3.5 h-3.5" />
                              </Link>
                              <Link
                                to={`/warranties/${item.id}`}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-[#3157D5] hover:text-[#2648B8]"
                              >
                                <span>View</span>
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section: Recently added */}
          <div className="bg-white rounded-xl border border-[#E5E9EF] shadow-2xs overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E9EF] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[#202733]">
                  Recently added
                </h2>
                <p className="text-xs text-[#687385] mt-0.5">
                  Latest registered devices and appliances in your workspace.
                </p>
              </div>

              <Link
                to="/warranties"
                className="text-xs font-medium text-[#3157D5] hover:text-[#2648B8] inline-flex items-center gap-1 group"
              >
                <span>View all ({warranties.length})</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E9EF] bg-[#F7F8FA] text-[11px] font-semibold text-[#687385] uppercase tracking-wider">
                    <th className="py-2.5 px-5">Product</th>
                    <th className="py-2.5 px-4">Purchase Date</th>
                    <th className="py-2.5 px-4">Warranty Expiry</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9EF] text-xs">
                  {recentlyAddedList.map((item) => {
                    const status = getWarrantyStatus(item.warrantyExpiryDate);

                    return (
                      <tr 
                        key={item.id} 
                        className="hover:bg-[#F7F8FA] transition-colors group cursor-pointer"
                        onClick={() => navigate(`/warranties/${item.id}`)}
                      >
                        <td className="py-3 px-5">
                          <div className="font-medium text-[#202733] truncate max-w-sm group-hover:text-[#3157D5] transition-colors">
                            {item.productName}
                          </div>
                          <div className="text-[11px] text-[#687385] flex items-center gap-2 mt-0.5">
                            <span>{item.brand}</span>
                            <span>·</span>
                            <span>{item.category}</span>
                            <span>·</span>
                            <span>{item.seller}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[#687385] tabular-nums">
                          {formatDisplayDate(item.purchaseDate)}
                        </td>
                        <td className="py-3 px-4 text-[#202733] font-medium tabular-nums">
                          {formatDisplayDate(item.warrantyExpiryDate)}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={status} size="sm" />
                        </td>
                        <td className="py-3 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                          <Link
                            to={`/warranties/${item.id}`}
                            className="text-xs font-semibold text-[#3157D5] hover:text-[#2648B8]"
                          >
                            Details
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Invoice Modal */}
      <AddInvoiceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};
