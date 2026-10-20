import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  ExternalLink, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  Mail,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Calendar,
  ArrowRight,
  Bot,
  Sliders,
  Phone,
  HelpCircle,
  FileText
} from 'lucide-react';
import { useWarranties } from '../context/WarrantyContext';
import { formatDisplayDate, calculateRemainingDays } from '../utils/dateUtils';
import { Modal } from '../components/ui/Modal';
import { NotificationItem, Warranty } from '../types';

export const NotificationsPage: React.FC = () => {
  const { 
    warranties,
    notifications, 
    markNotificationAsRead, 
    markAllNotificationsAsRead, 
    clearNotification, 
    unreadCount,
    scanAndTrigger30DayAlerts,
    simulateExpiringWarranty,
  } = useWarranties();

  const [activeTab, setActiveTab] = useState<'all' | 'expiring_soon' | 'unread' | 'expired'>('all');
  const [clearingNotif, setClearingNotif] = useState<NotificationItem | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSimModalOpen, setIsSimModalOpen] = useState(false);
  const [simProductDays, setSimProductDays] = useState(21);
  const [simProductName, setSimProductName] = useState('Sony PlayStation 5 DualSense Edge Controller');
  const [simProductBrand, setSimProductBrand] = useState('Sony Interactive');

  // Compute all registered products that have entered the 30-day expiry window
  const expiringProducts = useMemo(() => {
    return warranties
      .map((w) => ({
        ...w,
        remainingDays: calculateRemainingDays(w.warrantyExpiryDate),
      }))
      .filter((w) => w.remainingDays >= 0 && w.remainingDays <= 30)
      .sort((a, b) => a.remainingDays - b.remainingDays);
  }, [warranties]);

  const criticalCount = useMemo(() => {
    return expiringProducts.filter((p) => p.remainingDays <= 7).length;
  }, [expiringProducts]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (activeTab === 'unread') return !item.isRead;
      if (activeTab === 'expiring_soon') return item.type === 'expiring_soon';
      if (activeTab === 'expired') return item.type === 'expired';
      return true;
    });
  }, [notifications, activeTab]);

  const expiringNotificationsCount = useMemo(() => {
    return notifications.filter((n) => n.type === 'expiring_soon').length;
  }, [notifications]);

  const handleScan = async () => {
    setIsScanning(true);
    try {
      await scanAndTrigger30DayAlerts();
    } finally {
      setTimeout(() => setIsScanning(false), 450);
    }
  };

  const handleSimulateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulating(true);
    try {
      await simulateExpiringWarranty(
        simProductName.trim() || 'Simulated Test Product',
        simProductBrand.trim() || 'Test Brand',
        Number(simProductDays)
      );
      setIsSimModalOpen(false);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleConfirmClear = async () => {
    if (!clearingNotif) return;
    await clearNotification(clearingNotif.id);
    setClearingNotif(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Header with Title & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#202733]">
              Notifications & Expiry Alerts
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EAF7EF] text-[#18794E] border border-[#CDEED8]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#18794E] animate-pulse" />
              30-Day Alert Engine Active
            </span>
          </div>
          <p className="text-sm text-[#687385]">
            Monitors manufacturer warranty periods across all registered products and triggers visual warnings 30 days prior to expiration.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          {/* Scan Now Button */}
          <button
            onClick={handleScan}
            disabled={isScanning}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#202733] bg-white border border-[#E5E9EF] hover:bg-[#F7F8FA] rounded-lg transition-colors shadow-2xs disabled:opacity-50"
            title="Scan all registered products against the 30-day threshold"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#3157D5] ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning...' : 'Run 30-Day Scan'}</span>
          </button>

          {/* Simulate Expiry Button */}
          <button
            onClick={() => setIsSimModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#3157D5] bg-[#EEF3FF] hover:bg-[#DFEAFF] border border-[#D5E2FF] rounded-lg transition-colors shadow-2xs"
            title="Register a test product expiring in the 30-day window to see the alert trigger live"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Test 30-Day Trigger</span>
          </button>

          {/* Mark All Read */}
          {unreadCount > 0 && (
            <button
              onClick={markAllNotificationsAsRead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#687385] hover:text-[#202733] bg-white border border-[#E5E9EF] hover:bg-[#F7F8FA] rounded-lg transition-colors shadow-2xs"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. System Status Bar & Notification Delivery Channels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl border border-[#E5E9EF] bg-white shadow-2xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-[#687385] uppercase tracking-wider block">
              Registered Products
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-[#202733] tabular-nums">
                {warranties.length}
              </span>
              <span className="text-xs text-[#687385]">under active watch</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#EEF3FF] text-[#3157D5] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-[#FCE6A8] bg-[#FFFDF5] shadow-2xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-[#9A6700] uppercase tracking-wider block">
              30-Day Alert Triggers
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-[#9A6700] tabular-nums">
                {expiringProducts.length}
              </span>
              <span className="text-xs text-[#9A6700]/90">
                {expiringProducts.length === 1 ? 'product expiring soon' : 'products expiring soon'}
              </span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#FFF5D9] text-[#9A6700] flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-[#E5E9EF] bg-white shadow-2xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-[#687385] uppercase tracking-wider block">
              Critical Alerts (&le; 7 Days)
            </span>
            <div className="flex items-baseline gap-2">
              <span className={`text-xl font-bold tabular-nums ${criticalCount > 0 ? 'text-[#C03935]' : 'text-[#202733]'}`}>
                {criticalCount}
              </span>
              <span className="text-xs text-[#687385]">
                {criticalCount > 0 ? 'urgent action recommended' : 'no critical deadlines'}
              </span>
            </div>
          </div>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${criticalCount > 0 ? 'bg-[#FDECEC] text-[#C03935]' : 'bg-[#F7F8FA] text-[#687385]'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. VISUAL ALERT ENGINE: 30-Day Expiry Warnings Section */}
      <section className="bg-white rounded-2xl border border-[#E5E9EF] shadow-2xs overflow-hidden">
        {/* Banner Header */}
        <div className="p-4 sm:p-5 border-b border-[#E5E9EF] bg-gradient-to-r from-[#FFFDF5] to-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FFF5D9] border border-[#FCE6A8] flex items-center justify-center text-[#9A6700] shrink-0 mt-0.5">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#202733]">
                  30-Day Expiry Alert Monitor
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FFF5D9] text-[#9A6700] border border-[#FCE6A8]">
                  Automated Trigger
                </span>
              </div>
              <p className="text-xs text-[#687385] mt-0.5">
                {expiringProducts.length > 0
                  ? `${expiringProducts.length} registered products are currently inside the 30-day manufacturer expiry threshold.`
                  : 'All registered products currently have more than 30 days of active manufacturer warranty coverage.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Link
              to="/settings"
              className="inline-flex items-center gap-1 text-[#3157D5] hover:underline font-medium"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configure alert thresholds</span>
            </Link>
          </div>
        </div>

        {/* Visual Alert Cards Grid */}
        {expiringProducts.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#EAF7EF] text-[#18794E] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-sm font-semibold text-[#202733]">
                No warranties expiring within 30 days
              </h3>
              <p className="text-xs text-[#687385] leading-relaxed">
                All registered products have active coverage extending beyond 30 days. The notification system will automatically trigger a visual alert the moment any item reaches the 30-day mark.
              </p>
            </div>
            <button
              onClick={() => setIsSimModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#3157D5] bg-[#EEF3FF] hover:bg-[#DFEAFF] rounded-lg transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simulate adding a product expiring in 21 days</span>
            </button>
          </div>
        ) : (
          <div className="p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {expiringProducts.map((product) => {
                const days = product.remainingDays;
                const isCritical = days <= 7;
                const isWarning = days > 7 && days <= 15;
                const percentElapsed = Math.min(100, Math.max(0, Math.round(((30 - days) / 30) * 100)));

                return (
                  <div
                    key={`alert-card-${product.id}`}
                    className={`rounded-xl border p-4 transition-all relative overflow-hidden flex flex-col justify-between ${
                      isCritical
                        ? 'border-[#F9D0CE] bg-[#FFF8F8] shadow-xs'
                        : isWarning
                        ? 'border-[#FCE6A8] bg-[#FFFDF5] shadow-xs'
                        : 'border-[#E5E9EF] bg-white'
                    }`}
                  >
                    {/* Top Urgency Header */}
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2">
                        {isCritical ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#FDECEC] text-[#C03935] border border-[#F9D0CE]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#C03935] animate-ping" />
                            CRITICAL: {days === 0 ? 'Expires Today' : `${days} days remaining`}
                          </span>
                        ) : isWarning ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#FFF5D9] text-[#9A6700] border border-[#FCE6A8]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#9A6700]" />
                            HIGH PRIORITY: {days} days remaining
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#EEF3FF] text-[#3157D5] border border-[#D5E2FF]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#3157D5]" />
                            30-DAY NOTICE: {days} days remaining
                          </span>
                        )}
                        <span className="text-[11px] text-[#687385] font-mono">
                          {product.category}
                        </span>
                      </div>

                      <span className="text-[11px] text-[#687385] font-medium whitespace-nowrap">
                        Expires {formatDisplayDate(product.warrantyExpiryDate)}
                      </span>
                    </div>

                    {/* Product Name & Brand */}
                    <div className="space-y-1 mb-3">
                      <h4 className="text-sm font-bold text-[#202733] tracking-tight line-clamp-1">
                        {product.productName}
                      </h4>
                      <p className="text-xs text-[#687385]">
                        Brand: <span className="text-[#202733] font-medium">{product.brand}</span> · Retailer: <span className="text-[#202733] font-medium">{product.seller}</span> · Invoice: <span className="font-mono text-[#202733]">{product.invoiceNumber}</span>
                      </p>
                    </div>

                    {/* Visual 30-Day Countdown Timeline Bar */}
                    <div className="space-y-1.5 py-2 my-1 border-t border-b border-[#E5E9EF]/60">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#687385] font-medium">30-Day Alert Window Timeline</span>
                        <span className="font-semibold text-[#202733] tabular-nums">
                          {percentElapsed}% elapsed ({days}d left)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#E5E9EF] overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCritical ? 'bg-[#C03935]' : isWarning ? 'bg-[#9A6700]' : 'bg-[#3157D5]'
                          }`}
                          style={{ width: `${percentElapsed}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#687385]">
                        <span>T-30 Days Alert Triggered</span>
                        <span>Official Expiry: {formatDisplayDate(product.warrantyExpiryDate)}</span>
                      </div>
                    </div>

                    {/* Coverage & Action Guidance */}
                    {product.coverageSummary && (
                      <p className="text-[11px] text-[#687385] line-clamp-2 my-2 bg-white/60 p-2 rounded-lg border border-[#E5E9EF]/60">
                        <strong className="text-[#202733] font-medium">Coverage reminder:</strong> {product.coverageSummary}
                      </p>
                    )}

                    {/* Quick Action Buttons */}
                    <div className="pt-2 flex items-center justify-between gap-2 mt-auto">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Link
                          to={`/warranties/${product.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#3157D5] hover:bg-[#2648B8] rounded-lg transition-colors shadow-2xs"
                        >
                          <span>View Warranty</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>

                        <Link
                          to={`/assistant?product=${product.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#202733] bg-white border border-[#E5E9EF] hover:bg-[#F7F8FA] rounded-lg transition-colors"
                          title="Check claim eligibility with Warranty Assistant"
                        >
                          <Bot className="w-3.5 h-3.5 text-[#3157D5]" />
                          <span className="hidden sm:inline">Ask Assistant</span>
                        </Link>
                      </div>

                      {product.claimContact?.phone && (
                        <a
                          href={`tel:${product.claimContact.phone}`}
                          className="inline-flex items-center gap-1 text-[11px] text-[#687385] hover:text-[#202733] px-2 py-1 rounded-md hover:bg-black/5"
                          title={`Call support: ${product.claimContact.phone}`}
                        >
                          <Phone className="w-3 h-3 text-[#18794E]" />
                          <span>{product.claimContact.phone}</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* 4. Notification Filter Tabs & Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="bg-white p-1.5 rounded-xl border border-[#E5E9EF] shadow-2xs flex items-center gap-1 overflow-x-auto">
            {[
              { id: 'all', label: 'All Alerts', count: notifications.length },
              { 
                id: 'expiring_soon', 
                label: '30-Day Expiry Alerts', 
                count: expiringNotificationsCount,
                highlight: expiringNotificationsCount > 0
              },
              { id: 'unread', label: 'Unread', count: unreadCount },
              { 
                id: 'expired', 
                label: 'Expired', 
                count: notifications.filter((n) => n.type === 'expired').length 
              },
            ].map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#EEF3FF] text-[#3157D5] font-semibold'
                      : 'text-[#687385] hover:text-[#202733] hover:bg-[#F7F8FA]'
                  }`}
                >
                  {tab.id === 'expiring_soon' && (
                    <Clock className="w-3.5 h-3.5 text-[#9A6700]" />
                  )}
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                    isSelected 
                      ? 'bg-[#3157D5] text-white' 
                      : tab.highlight 
                      ? 'bg-[#FFF5D9] text-[#9A6700] font-bold'
                      : 'bg-[#E5E9EF] text-[#687385]'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-[#687385]">
            <span className="w-2 h-2 rounded-full bg-[#18794E]" />
            <span>AWS SES Email dispatch configured</span>
          </div>
        </div>

        {/* Notifications Feed List */}
        {filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E5E9EF] p-12 text-center shadow-2xs">
            <Bell className="w-10 h-10 text-[#687385] mx-auto mb-3 opacity-60" />
            <h3 className="text-sm font-semibold text-[#202733] mb-1">
              No notifications in this view
            </h3>
            <p className="text-xs text-[#687385]">
              You have caught up with all reminders for this category.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notif) => {
              const isExpiring = notif.type === 'expiring_soon';
              const isExpired = notif.type === 'expired';

              return (
                <div
                  key={notif.id}
                  className={`p-4 rounded-xl border bg-white shadow-2xs transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                    isExpiring
                      ? 'border-[#FCE6A8] bg-[#FFFDF5]'
                      : !notif.isRead 
                      ? 'border-[#D5E2FF] bg-[#EEF3FF]/20' 
                      : 'border-[#E5E9EF]'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isExpiring
                        ? 'bg-[#FFF5D9] text-[#9A6700]'
                        : isExpired
                        ? 'bg-[#FDECEC] text-[#C03935]'
                        : 'bg-[#EEF3FF] text-[#3157D5]'
                    }`}>
                      {isExpiring && <Clock className="w-4 h-4" />}
                      {isExpired && <AlertTriangle className="w-4 h-4" />}
                      {!isExpiring && !isExpired && <ShieldCheck className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-[#202733]">
                          {notif.title}
                        </span>

                        {isExpiring && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#FFF5D9] text-[#9A6700] border border-[#FCE6A8]">
                            30-Day Trigger
                          </span>
                        )}

                        {typeof notif.daysRemaining === 'number' && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold tabular-nums ${
                            notif.daysRemaining <= 7
                              ? 'bg-[#FDECEC] text-[#C03935]'
                              : notif.daysRemaining <= 30
                              ? 'bg-[#FFF5D9] text-[#9A6700]'
                              : 'bg-[#E5E9EF] text-[#687385]'
                          }`}>
                            {notif.daysRemaining < 0 
                              ? `Expired ${Math.abs(notif.daysRemaining)}d ago`
                              : notif.daysRemaining === 0 
                              ? 'Expires today' 
                              : `${notif.daysRemaining} days left`}
                          </span>
                        )}

                        {!notif.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#3157D5]" />
                        )}
                      </div>

                      <div className="text-xs text-[#687385] leading-relaxed">
                        {notif.message}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-[#687385] pt-1">
                        <span className="font-semibold text-[#202733]">{notif.productName}</span>
                        {notif.brand && <span>· Brand: {notif.brand}</span>}
                        <span>·</span>
                        <span className="tabular-nums">Logged {formatDisplayDate(notif.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {!notif.isRead && (
                      <button
                        onClick={() => markNotificationAsRead(notif.id)}
                        className="px-2.5 py-1 text-xs font-medium text-[#687385] hover:text-[#202733] hover:bg-[#F7F8FA] rounded-md transition-colors"
                        title="Mark as read"
                      >
                        Mark read
                      </button>
                    )}

                    <Link
                      to={`/warranties/${notif.warrantyId}`}
                      onClick={() => {
                        if (!notif.isRead) markNotificationAsRead(notif.id);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-[#3157D5] bg-[#EEF3FF] hover:bg-[#E0EBFF] rounded-md transition-colors"
                    >
                      <span>View warranty</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>

                    <button
                      onClick={() => setClearingNotif(notif)}
                      className="p-1 text-[#687385] hover:text-[#C03935] hover:bg-[#FDECEC] rounded-md transition-colors"
                      title="Dismiss notification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Simulation & Trigger Testing Modal */}
      {isSimModalOpen && (
        <Modal
          isOpen={isSimModalOpen}
          onClose={() => setIsSimModalOpen(false)}
          title="Test 30-Day Warranty Expiry Trigger"
          description="Register a simulated product to observe the automated 30-day notification system in action."
          maxWidth="md"
        >
          <form onSubmit={handleSimulateSubmit} className="space-y-4">
            <div className="p-3 rounded-lg bg-[#EEF3FF] border border-[#D5E2FF] text-xs text-[#3157D5] leading-relaxed">
              When a registered product reaches 30 days before manufacturer expiry, WarrantyEase immediately triggers a high-visibility alert banner, generates an in-app notification, and cues SES email dispatch.
            </div>

            <div>
              <label className="block text-xs font-medium text-[#202733] mb-1">
                Product Name
              </label>
              <input
                type="text"
                required
                value={simProductName}
                onChange={(e) => setSimProductName(e.target.value)}
                placeholder="e.g. Sony PlayStation 5 DualSense Edge Controller"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E9EF] focus:border-[#3157D5] focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#202733] mb-1">
                  Brand / Manufacturer
                </label>
                <input
                  type="text"
                  required
                  value={simProductBrand}
                  onChange={(e) => setSimProductBrand(e.target.value)}
                  placeholder="e.g. Sony"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E9EF] focus:border-[#3157D5] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#202733] mb-1">
                  Days Until Warranty Expiry
                </label>
                <select
                  value={simProductDays}
                  onChange={(e) => setSimProductDays(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E9EF] focus:border-[#3157D5] focus:outline-hidden bg-white"
                >
                  <option value={5}>5 Days (Critical Alert &lt; 7d)</option>
                  <option value={12}>12 Days (High Priority Warning)</option>
                  <option value={21}>21 Days (Active 30-Day Window)</option>
                  <option value={28}>28 Days (Fresh 30-Day Notice)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E9EF]">
              <button
                type="button"
                onClick={() => setIsSimModalOpen(false)}
                className="px-3 py-1.5 text-xs font-medium text-[#687385] hover:text-[#202733]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSimulating}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#3157D5] hover:bg-[#2648B8] rounded-lg transition-colors shadow-2xs disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isSimulating ? 'Triggering...' : 'Register & Trigger 30-Day Alert'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 6. Dismiss Confirmation Modal */}
      {clearingNotif && (
        <Modal
          isOpen={!!clearingNotif}
          onClose={() => setClearingNotif(null)}
          title="Dismiss Notification"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-[#687385] leading-relaxed">
              Remove this notification from your inbox? The underlying product warranty record will remain registered and safe.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E9EF]">
              <button
                onClick={() => setClearingNotif(null)}
                className="px-3 py-1.5 text-xs font-medium text-[#687385] hover:text-[#202733]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClear}
                className="px-3 py-1.5 text-xs font-medium text-white bg-[#C03935] hover:bg-[#a32f2b] rounded-lg transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
