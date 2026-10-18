import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  LayoutList, 
  LayoutGrid, 
  Trash2, 
  Edit2, 
  Eye, 
  Download,
  AlertTriangle,
  RotateCcw,
  Package,
  CheckSquare,
  Square,
  X,
  Bot
} from 'lucide-react';
import { useWarranties } from '../context/WarrantyContext';
import { StatusBadge } from '../components/ui/StatusBadge';
import { AddInvoiceModal } from '../components/warranties/AddInvoiceModal';
import { EditWarrantyModal } from '../components/warranties/EditWarrantyModal';
import { Modal } from '../components/ui/Modal';
import { formatDisplayDate, calculateRemainingDays, formatRemainingTime } from '../utils/dateUtils';
import { getWarrantyStatus, formatCurrency } from '../utils/warrantyUtils';
import { exportWarrantiesToCSV } from '../utils/csvExport';
import { Warranty, WarrantyStatus, WarrantyCategory } from '../types';

export const WarrantiesPage: React.FC = () => {
  const { warranties, deleteWarranty, showToast } = useWarranties();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const statusParam = searchParams.get('status') as WarrantyStatus | null;
  const [statusFilter, setStatusFilter] = useState<string>(statusParam || 'all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('expiry_asc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Interactive Multi-Select State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingWarranty, setEditingWarranty] = useState<Warranty | null>(null);
  const [deletingWarranty, setDeletingWarranty] = useState<Warranty | null>(null);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);

  // Sync url param if changed
  useEffect(() => {
    if (statusParam) {
      setStatusFilter(statusParam);
    }
  }, [statusParam]);

  // Categories present in data
  const availableCategories = useMemo(() => {
    const set = new Set<WarrantyCategory>();
    warranties.forEach((w) => set.add(w.category));
    return Array.from(set).sort();
  }, [warranties]);

  // Filter and Sort Pipeline
  const filteredWarranties = useMemo(() => {
    return warranties
      .filter((w) => {
        // 1. Text search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const match =
            w.productName.toLowerCase().includes(q) ||
            w.brand.toLowerCase().includes(q) ||
            w.seller.toLowerCase().includes(q) ||
            w.invoiceNumber.toLowerCase().includes(q) ||
            (w.serialNumber && w.serialNumber.toLowerCase().includes(q));
          if (!match) return false;
        }

        // 2. Status filter
        if (statusFilter !== 'all') {
          const itemStatus = getWarrantyStatus(w.warrantyExpiryDate);
          if (itemStatus !== statusFilter) return false;
        }

        // 3. Category filter
        if (categoryFilter !== 'all' && w.category !== categoryFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'expiry_asc') {
          return new Date(a.warrantyExpiryDate).getTime() - new Date(b.warrantyExpiryDate).getTime();
        }
        if (sortBy === 'expiry_desc') {
          return new Date(b.warrantyExpiryDate).getTime() - new Date(a.warrantyExpiryDate).getTime();
        }
        if (sortBy === 'purchase_desc') {
          return new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime();
        }
        if (sortBy === 'purchase_asc') {
          return new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime();
        }
        if (sortBy === 'name_asc') {
          return a.productName.localeCompare(b.productName);
        }
        if (sortBy === 'name_desc') {
          return b.productName.localeCompare(a.productName);
        }
        return 0;
      });
  }, [warranties, searchQuery, statusFilter, categoryFilter, sortBy]);

  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val);
    if (val === 'all') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', val);
    }
    setSearchParams(searchParams);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setSortBy('expiry_asc');
    searchParams.delete('status');
    setSearchParams(searchParams);
  };

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredWarranties.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredWarranties.map((w) => w.id));
    }
  };

  const handleToggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExportSelectedCSV = () => {
    const subset = warranties.filter((w) => selectedIds.includes(w.id));
    exportWarrantiesToCSV(subset, `warrantyease_selection_${subset.length}.csv`);
    showToast(`Exported ${subset.length} warranties to CSV.`, 'success');
  };

  const handleExportAllCSV = () => {
    exportWarrantiesToCSV(filteredWarranties, 'warrantyease_all_records.csv');
    showToast(`Exported ${filteredWarranties.length} warranties to CSV.`, 'success');
  };

  const handleBatchDelete = async () => {
    for (const id of selectedIds) {
      await deleteWarranty(id);
    }
    setSelectedIds([]);
    setIsBatchDeleteModalOpen(false);
    showToast('Deleted selected records.', 'info');
  };

  const confirmDelete = async () => {
    if (!deletingWarranty) return;
    await deleteWarranty(deletingWarranty.id);
    setSelectedIds((prev) => prev.filter((id) => id !== deletingWarranty.id));
    setDeletingWarranty(null);
  };

  const allSelected = filteredWarranties.length > 0 && selectedIds.length === filteredWarranties.length;

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#202733]">
            My Warranties
          </h1>
          <p className="text-sm text-[#687385] mt-1">
            Manage the products and coverage you have registered.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={handleExportAllCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#202733] bg-white border border-[#E5E9EF] hover:bg-[#F7F8FA] rounded-lg transition-colors shadow-2xs"
            title="Download all as CSV spreadsheet"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#3157D5] hover:bg-[#2648B8] rounded-lg transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4 stroke-[2.2]" />
            <span>Add invoice</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Search, Filters, Sorters & View Switcher */}
      <div className="bg-white p-4 rounded-xl border border-[#E5E9EF] shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#687385] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product, brand, seller, or invoice..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#E5E9EF] focus:border-[#3157D5] focus:outline-hidden bg-[#F7F8FA] focus:bg-white transition-colors"
            />
          </div>

          {/* Sorter & Category Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-[#E5E9EF] bg-white text-[#202733] focus:border-[#3157D5] focus:outline-hidden"
            >
              <option value="all">All Categories</option>
              {availableCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-[#E5E9EF] bg-white text-[#202733] focus:border-[#3157D5] focus:outline-hidden"
            >
              <option value="expiry_asc">Expiry: Nearest first</option>
              <option value="expiry_desc">Expiry: Furthest first</option>
              <option value="purchase_desc">Purchased: Newest first</option>
              <option value="purchase_asc">Purchased: Oldest first</option>
              <option value="name_asc">Product: A to Z</option>
              <option value="name_desc">Product: Z to A</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center p-0.5 rounded-lg border border-[#E5E9EF] bg-[#F7F8FA]">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-[#202733] shadow-2xs'
                    : 'text-[#687385] hover:text-[#202733]'
                }`}
                title="Table view"
              >
                <LayoutList className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white text-[#202733] shadow-2xs'
                    : 'text-[#687385] hover:text-[#202733]'
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Status Filter Segmented Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-[#E5E9EF] text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {[
              { id: 'all', label: 'All Warranties', count: warranties.length },
              { 
                id: 'active', 
                label: 'Active', 
                count: warranties.filter((w) => getWarrantyStatus(w.warrantyExpiryDate) === 'active').length 
              },
              { 
                id: 'expiring_soon', 
                label: 'Expiring soon', 
                count: warranties.filter((w) => getWarrantyStatus(w.warrantyExpiryDate) === 'expiring_soon').length 
              },
              { 
                id: 'expired', 
                label: 'Expired', 
                count: warranties.filter((w) => getWarrantyStatus(w.warrantyExpiryDate) === 'expired').length 
              },
            ].map((tab) => {
              const isSelected = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleStatusFilterChange(tab.id)}
                  className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#EEF3FF] text-[#3157D5] font-semibold'
                      : 'text-[#687385] hover:text-[#202733] hover:bg-[#F7F8FA]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                    isSelected ? 'bg-[#3157D5] text-white' : 'bg-[#E5E9EF] text-[#687385]'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {(searchQuery || statusFilter !== 'all' || categoryFilter !== 'all') && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-[#3157D5] hover:underline flex items-center gap-1 shrink-0 ml-2"
            >
              <RotateCcw className="w-3 h-3" />
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Main Listing View (Table or Grid) */}
      {filteredWarranties.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E9EF] p-12 text-center shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-[#F7F8FA] text-[#687385] mx-auto flex items-center justify-center mb-3">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-[#202733] mb-1">
            No matching warranties found
          </h3>
          <p className="text-xs text-[#687385] max-w-sm mx-auto mb-4">
            Try adjusting your search terms, changing the status filter, or reset your filters.
          </p>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 text-xs font-medium text-[#202733] bg-[#F7F8FA] hover:bg-[#E5E9EF] rounded-lg transition-colors"
          >
            Clear all filters
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-xl border border-[#E5E9EF] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E9EF] bg-[#F7F8FA] text-[11px] font-semibold text-[#687385] uppercase tracking-wider">
                  <th className="py-3 px-4 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="p-1 rounded text-[#687385] hover:text-[#202733]"
                      title={allSelected ? 'Deselect all' : 'Select all'}
                    >
                      {allSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#3157D5]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4">Product & Invoice</th>
                  <th className="py-3 px-4">Brand</th>
                  <th className="py-3 px-4">Purchase Date</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Remaining Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E9EF] text-xs">
                {filteredWarranties.map((w) => {
                  const status = getWarrantyStatus(w.warrantyExpiryDate);
                  const days = calculateRemainingDays(w.warrantyExpiryDate);
                  const isSelected = selectedIds.includes(w.id);

                  return (
                    <tr
                      key={w.id}
                      onClick={() => navigate(`/warranties/${w.id}`)}
                      className={`hover:bg-[#F7F8FA] transition-colors group cursor-pointer ${
                        isSelected ? 'bg-[#EEF3FF]/40' : ''
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <td 
                        className="py-3.5 px-4 text-center" 
                        onClick={(e) => handleToggleSelectRow(w.id, e)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 text-[#3157D5] rounded border-[#E5E9EF] focus:ring-[#3157D5] cursor-pointer"
                        />
                      </td>

                      {/* Product */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#202733] group-hover:text-[#3157D5] transition-colors">
                          {w.productName}
                        </div>
                        <div className="text-[11px] text-[#687385] font-mono mt-0.5">
                          {w.invoiceNumber}
                        </div>
                      </td>

                      {/* Brand & Category */}
                      <td className="py-3.5 px-4 text-[#202733]">
                        <div>{w.brand}</div>
                        <div className="text-[11px] text-[#687385]">{w.category}</div>
                      </td>

                      {/* Purchase Date */}
                      <td className="py-3.5 px-4 text-[#687385] tabular-nums">
                        <div>{formatDisplayDate(w.purchaseDate)}</div>
                        <div className="text-[11px] text-[#687385]">
                          {formatCurrency(w.purchasePrice, w.currency)}
                        </div>
                      </td>

                      {/* Expiry Date */}
                      <td className="py-3.5 px-4 text-[#202733] font-medium tabular-nums">
                        {formatDisplayDate(w.warrantyExpiryDate)}
                      </td>

                      {/* Remaining Time */}
                      <td className="py-3.5 px-4 tabular-nums">
                        <span
                          className={`font-semibold ${
                            days < 0
                              ? 'text-[#C03935]'
                              : days <= 30
                              ? 'text-[#9A6700]'
                              : 'text-[#18794E]'
                          }`}
                        >
                          {formatRemainingTime(days)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={status} size="sm" />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/assistant?productId=${w.id}`}
                            className="p-1.5 rounded-md text-[#687385] hover:text-[#3157D5] hover:bg-[#EEF3FF] transition-colors"
                            title="Ask Assistant about this product"
                          >
                            <Bot className="w-4 h-4" />
                          </Link>
                          <Link
                            to={`/warranties/${w.id}`}
                            className="p-1.5 rounded-md text-[#687385] hover:text-[#3157D5] hover:bg-[#EEF3FF] transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => setEditingWarranty(w)}
                            className="p-1.5 rounded-md text-[#687385] hover:text-[#202733] hover:bg-[#E5E9EF] transition-colors"
                            title="Edit warranty"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingWarranty(w)}
                            className="p-1.5 rounded-md text-[#687385] hover:text-[#C03935] hover:bg-[#FDECEC] transition-colors"
                            title="Delete record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWarranties.map((w) => {
            const status = getWarrantyStatus(w.warrantyExpiryDate);
            const days = calculateRemainingDays(w.warrantyExpiryDate);
            const isSelected = selectedIds.includes(w.id);

            return (
              <div
                key={w.id}
                onClick={() => navigate(`/warranties/${w.id}`)}
                className={`p-5 bg-white rounded-xl border transition-all flex flex-col justify-between group cursor-pointer ${
                  isSelected ? 'border-[#3157D5] ring-2 ring-[#EEF3FF]' : 'border-[#E5E9EF] hover:border-[#D5E2FF]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onClick={(e) => handleToggleSelectRow(w.id, e)}
                        onChange={() => {}}
                        className="w-4 h-4 text-[#3157D5] rounded border-[#E5E9EF] focus:ring-[#3157D5] cursor-pointer"
                      />
                      <span className="text-[11px] font-semibold text-[#687385] uppercase tracking-wider">
                        {w.brand}
                      </span>
                    </div>
                    <StatusBadge status={status} size="sm" />
                  </div>

                  <h3 className="text-sm font-bold text-[#202733] group-hover:text-[#3157D5] transition-colors line-clamp-1">
                    {w.productName}
                  </h3>

                  <div className="text-xs text-[#687385] mt-1 flex items-center gap-2">
                    <span>{w.category}</span>
                    <span>·</span>
                    <span>Sold by {w.seller}</span>
                  </div>

                  <div className="mt-4 p-3 rounded-lg bg-[#F7F8FA] border border-[#E5E9EF] space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-[#687385]">
                      <span>Expires</span>
                      <span className="font-semibold text-[#202733] tabular-nums">
                        {formatDisplayDate(w.warrantyExpiryDate)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[#687385]">
                      <span>Remaining</span>
                      <span className={`font-semibold tabular-nums ${
                        days < 0 ? 'text-[#C03935]' : days <= 30 ? 'text-[#9A6700]' : 'text-[#18794E]'
                      }`}>
                        {formatRemainingTime(days)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[#687385]">
                      <span>Invoice</span>
                      <span className="font-mono text-[11px] text-[#202733] truncate max-w-[130px]">
                        {w.invoiceNumber}
                      </span>
                    </div>
                  </div>
                </div>

                <div 
                  className="mt-4 pt-3 border-t border-[#E5E9EF] flex items-center justify-between text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="font-semibold text-[#202733] tabular-nums">
                    {formatCurrency(w.purchasePrice, w.currency)}
                  </span>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/assistant?productId=${w.id}`}
                      className="p-1 rounded text-[#687385] hover:text-[#3157D5] hover:bg-[#EEF3FF]"
                      title="Ask Assistant"
                    >
                      <Bot className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => setEditingWarranty(w)}
                      className="p-1 rounded text-[#687385] hover:text-[#202733] hover:bg-[#F7F8FA]"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingWarranty(w)}
                      className="p-1 rounded text-[#687385] hover:text-[#C03935] hover:bg-[#FDECEC]"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <Link
                      to={`/warranties/${w.id}`}
                      className="text-xs font-semibold text-[#3157D5] hover:underline ml-1"
                    >
                      View
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Interactive Batch Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#202733] text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-4 animate-in slide-in-from-bottom duration-150 text-xs">
          <div className="font-medium">
            <span className="font-bold text-[#3157D5] bg-white px-2 py-0.5 rounded mr-2 tabular-nums">
              {selectedIds.length}
            </span>
            <span>warranties selected</span>
          </div>

          <div className="h-4 w-px bg-white/20" />

          <button
            onClick={handleExportSelectedCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsBatchDeleteModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C03935]/80 hover:bg-[#C03935] text-white transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>

          <button
            onClick={() => setSelectedIds([])}
            className="p-1 text-white/60 hover:text-white transition-colors ml-1"
            title="Deselect all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Batch Delete Confirmation Modal */}
      {isBatchDeleteModalOpen && (
        <Modal
          isOpen={isBatchDeleteModalOpen}
          onClose={() => setIsBatchDeleteModalOpen(false)}
          title="Delete Selected Warranties"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-[#C03935] leading-relaxed">
              Are you sure you want to permanently delete <strong>{selectedIds.length}</strong> selected warranty records? This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E9EF]">
              <button
                onClick={() => setIsBatchDeleteModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-[#687385] hover:text-[#202733]"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchDelete}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#C03935] hover:bg-[#a32f2b] rounded-lg transition-colors"
              >
                Delete {selectedIds.length} records
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Single Delete Confirmation Modal */}
      {deletingWarranty && (
        <Modal
          isOpen={!!deletingWarranty}
          onClose={() => setDeletingWarranty(null)}
          title="Delete Warranty Record"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-[#FDECEC] border border-[#F9D0CE] flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#C03935] shrink-0 mt-0.5" />
              <div className="text-xs text-[#C03935] leading-relaxed">
                Are you sure you want to delete the warranty for{' '}
                <strong className="font-semibold">{deletingWarranty.productName}</strong>?
                This will remove associated reminders and attached document records from your local workspace.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E9EF]">
              <button
                type="button"
                onClick={() => setDeletingWarranty(null)}
                className="px-4 py-2 text-xs font-medium text-[#687385] hover:text-[#202733]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-medium text-white bg-[#C03935] hover:bg-[#a32f2b] rounded-lg transition-colors shadow-2xs"
              >
                Delete permanently
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Warranty Modal */}
      <EditWarrantyModal
        warranty={editingWarranty}
        isOpen={!!editingWarranty}
        onClose={() => setEditingWarranty(null)}
      />

      {/* Add Invoice Modal */}
      <AddInvoiceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};
