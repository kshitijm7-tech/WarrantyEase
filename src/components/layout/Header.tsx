import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Search, Bell, Menu, Shield, ExternalLink, Check, Trash2 } from 'lucide-react';
import { useWarranties } from '../../context/WarrantyContext';
import { formatDisplayDate } from '../../utils/dateUtils';

interface HeaderProps {
  onOpenMobileSidebar: () => void;
  onOpenSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileSidebar, onOpenSearch }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { notifications, unreadCount, markNotificationAsRead, preferences } = useWarranties();
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  // Close notifications dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setShowNotifMenu(false);
      }
    };
    if (showNotifMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifMenu]);

  // Compute breadcrumbs / page title
  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === '/' || path === '/overview' || path === '/app' || path === '/app/overview') {
      return { title: 'Overview', trail: ['Workspace', 'Overview'] };
    }
    if (path === '/warranties' || path === '/app/warranties') {
      return { title: 'My Warranties', trail: ['Workspace', 'My Warranties'] };
    }
    if (path.startsWith('/warranties/new') || path.startsWith('/app/warranties/new')) {
      return { title: 'Add Invoice', trail: ['My Warranties', 'Add Invoice'] };
    }
    if (path.startsWith('/warranties/') || path.startsWith('/app/warranties/')) {
      return { title: 'Warranty Details', trail: ['My Warranties', 'Product Overview'] };
    }
    if (path === '/documents' || path === '/app/documents') {
      return { title: 'Documents', trail: ['Workspace', 'Documents'] };
    }
    if (path === '/assistant' || path === '/app/assistant') {
      return { title: 'Warranty Assistant', trail: ['Workspace', 'Assistant'] };
    }
    if (path === '/notifications' || path === '/app/notifications') {
      return { title: 'Notifications', trail: ['Workspace', 'Notifications'] };
    }
    if (path === '/settings' || path === '/app/settings') {
      return { title: 'Settings', trail: ['Preferences', 'Settings'] };
    }
    return { title: 'WarrantyEase', trail: ['Workspace'] };
  };

  const breadcrumbs = getBreadcrumbs();
  const recentNotifications = notifications.slice(0, 4);

  return (
    <header className="h-16 bg-white border-b border-[#E5E9EF] px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
      {/* Left: Mobile Toggle & Page Title / Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden p-2 -ml-2 text-[#687385] hover:text-[#202733] rounded-lg hover:bg-[#F7F8FA] transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#687385] mb-0.5">
            <span>{breadcrumbs.trail[0]}</span>
            <span aria-hidden="true">/</span>
            <span className="text-[#202733] font-medium truncate">{breadcrumbs.trail[1]}</span>
          </div>
          <h1 className="text-base sm:text-lg font-bold text-[#202733] truncate leading-tight">
            {breadcrumbs.title}
          </h1>
        </div>
      </div>

      {/* Center/Right: Functional Search Bar Trigger */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2.5 px-3 py-1.5 sm:w-64 text-left rounded-lg border border-[#E5E9EF] bg-[#F7F8FA] hover:bg-[#EEF3FF] hover:border-[#D5E2FF] text-[#687385] hover:text-[#202733] transition-all text-xs"
          title="Search warranties, receipts, products (⌘K)"
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline flex-1 truncate">Search products, invoices...</span>
          <span className="sm:hidden">Search</span>
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-[#687385] bg-white rounded border border-[#E5E9EF] shadow-2xs">
            ⌘K
          </kbd>
        </button>

        {/* Notifications Popover Menu */}
        <div className="relative" ref={notifMenuRef}>
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="relative p-2 rounded-lg text-[#687385] hover:text-[#202733] hover:bg-[#F7F8FA] transition-colors"
            aria-label={`Notifications (${unreadCount} unread)`}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#3157D5]" />
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl border border-[#E5E9EF] shadow-lg py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-4 py-2 border-b border-[#E5E9EF] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#202733]">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 bg-[#EEF3FF] text-[#3157D5] font-semibold rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <Link
                  to="/notifications"
                  onClick={() => setShowNotifMenu(false)}
                  className="text-xs text-[#3157D5] hover:underline"
                >
                  View all
                </Link>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-[#E5E9EF]">
                {recentNotifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#687385]">
                    No notifications yet.
                  </div>
                ) : (
                  recentNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3 text-left hover:bg-[#F7F8FA] transition-colors cursor-pointer ${
                        !notif.isRead ? 'bg-[#EEF3FF]/40' : ''
                      }`}
                      onClick={() => {
                        if (!notif.isRead) markNotificationAsRead(notif.id);
                        setShowNotifMenu(false);
                        navigate(`/warranties/${notif.warrantyId}`);
                      }}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-[#202733] truncate">
                          {notif.productName}
                        </span>
                        <span className="text-[10px] text-[#687385]">
                          {formatDisplayDate(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-[#687385] line-clamp-2">
                        {notif.message}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="px-4 py-2 border-t border-[#E5E9EF] bg-[#F7F8FA] flex items-center justify-between text-xs">
                <span className="text-[11px] text-[#687385]">
                  Automated reminders enabled
                </span>
                <Link
                  to="/settings"
                  onClick={() => setShowNotifMenu(false)}
                  className="text-[11px] text-[#3157D5] hover:underline"
                >
                  Configure
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Avatar Menu Link */}
        <Link
          to="/settings"
          className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-[#F7F8FA] transition-colors border border-transparent hover:border-[#E5E9EF]"
          title="Account profile and settings"
        >
          <div className="w-7 h-7 rounded-full bg-[#3157D5] text-white text-xs font-semibold flex items-center justify-center">
            {preferences.name.charAt(0) || 'U'}
          </div>
          <span className="hidden lg:inline text-xs font-medium text-[#202733]">
            {preferences.name}
          </span>
        </Link>
      </div>
    </header>
  );
};
