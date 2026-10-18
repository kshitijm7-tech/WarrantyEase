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
  CheckCircle2
} from 'lucide-react';
import { useWarranties } from '../context/WarrantyContext';
import { formatDisplayDate } from '../utils/dateUtils';
import { Modal } from '../components/ui/Modal';
import { NotificationItem } from '../types';

export const NotificationsPage: React.FC = () => {
  const { 
    notifications, 
    markNotificationAsRead, 
    markAllNotificationsAsRead, 
    clearNotification, 
    unreadCount 
  } = useWarranties();

  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'expiring_soon' | 'expired'>('all');
  const [clearingNotif, setClearingNotif] = useState<NotificationItem | null>(null);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (activeTab === 'unread') return !item.isRead;
      if (activeTab === 'expiring_soon') return item.type === 'expiring_soon';
      if (activeTab === 'expired') return item.type === 'expired';
      return true;
    });
  }, [notifications, activeTab]);

  const handleConfirmClear = async () => {
    if (!clearingNotif) return;
    await clearNotification(clearingNotif.id);
    setClearingNotif(null);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Title & Mark All Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#202733]">
            Notifications
          </h1>
          <p className="text-sm text-[#687385] mt-1">
            Automated alerts, expiry warnings, and warranty coverage status.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllNotificationsAsRead}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-[#202733] bg-white border border-[#E5E9EF] hover:bg-[#F7F8FA] rounded-lg transition-colors shadow-2xs self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4 text-[#3157D5]" />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {/* Backend Integration Note */}
      <div className="p-3.5 rounded-xl border border-[#E5E9EF] bg-white flex items-center justify-between text-xs text-[#687385] shadow-2xs">
        <div className="flex items-center gap-2.5">
          <Mail className="w-4 h-4 text-[#3157D5] shrink-0" />
          <span>
            In-app reminders are active. Outbound email delivery will be managed through AWS SES once the production backend service is connected.
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-2 rounded-xl border border-[#E5E9EF] shadow-2xs flex items-center gap-1.5 overflow-x-auto">
        {[
          { id: 'all', label: 'All', count: notifications.length },
          { id: 'unread', label: 'Unread', count: unreadCount },
          { 
            id: 'expiring_soon', 
            label: 'Expiring soon', 
            count: notifications.filter((n) => n.type === 'expiring_soon').length 
          },
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

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E9EF] p-12 text-center shadow-2xs">
          <Bell className="w-10 h-10 text-[#687385] mx-auto mb-3" />
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
                className={`p-4 rounded-xl border bg-white shadow-2xs transition-all flex items-start justify-between gap-4 ${
                  !notif.isRead ? 'border-[#D5E2FF] bg-[#EEF3FF]/20' : 'border-[#E5E9EF]'
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
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#202733]">
                        {notif.title}
                      </span>
                      {!notif.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3157D5]" />
                      )}
                    </div>

                    <div className="text-xs text-[#687385] leading-relaxed">
                      {notif.message}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-[#687385] pt-1">
                      <span className="font-medium text-[#202733]">{notif.productName}</span>
                      <span>·</span>
                      <span className="tabular-nums">{formatDisplayDate(notif.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Notification Actions */}
                <div className="flex items-center gap-2 shrink-0">
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

      {/* Dismiss Confirmation Modal */}
      {clearingNotif && (
        <Modal
          isOpen={!!clearingNotif}
          onClose={() => setClearingNotif(null)}
          title="Dismiss Notification"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-[#687385] leading-relaxed">
              Remove this notification from your inbox? The underlying warranty record will remain unaffected.
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
