import React, { useState, useEffect } from 'react';
import { 
  User, 
  Bell, 
  Mail, 
  RotateCcw, 
  Check, 
  Info, 
  ShieldCheck, 
  AlertTriangle,
  Server
} from 'lucide-react';
import { useWarranties } from '../context/WarrantyContext';
import { Modal } from '../components/ui/Modal';

export const SettingsPage: React.FC = () => {
  const { preferences, updatePreferences, resetDemoData } = useWarranties();

  const [name, setName] = useState(preferences.name);
  const [email, setEmail] = useState(preferences.email);
  const [remindOneMonth, setRemindOneMonth] = useState(preferences.remindOneMonth);
  const [remindOneWeek, setRemindOneWeek] = useState(preferences.remindOneWeek);
  const [remindOneDay, setRemindOneDay] = useState(preferences.remindOneDay);
  const [emailNotifications, setEmailNotifications] = useState(preferences.emailNotifications);
  const [inAppNotifications, setInAppNotifications] = useState(preferences.inAppNotifications);

  const [isSaving, setIsSaving] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  useEffect(() => {
    setName(preferences.name);
    setEmail(preferences.email);
    setRemindOneMonth(preferences.remindOneMonth);
    setRemindOneWeek(preferences.remindOneWeek);
    setRemindOneDay(preferences.remindOneDay);
    setEmailNotifications(preferences.emailNotifications);
    setInAppNotifications(preferences.inAppNotifications);
  }, [preferences]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await updatePreferences({
      name: name.trim(),
      email: email.trim(),
      remindOneMonth,
      remindOneWeek,
      remindOneDay,
      emailNotifications,
      inAppNotifications,
    });
    setIsSaving(false);
  };

  const handleConfirmReset = async () => {
    await resetDemoData();
    setIsResetModalOpen(false);
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#202733]">
          Settings
        </h1>
        <p className="text-sm text-[#687385] mt-1">
          Manage your account profile, reminder preferences, and notification channels.
        </p>
      </div>

      <form onSubmit={handleProfileSubmit} className="space-y-6">
        {/* Profile Card */}
        <div className="p-6 bg-white rounded-xl border border-[#E5E9EF] shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E5E9EF] pb-3">
            <User className="w-4 h-4 text-[#3157D5]" />
            <h2 className="text-sm font-semibold text-[#202733]">
              User Profile
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#202733] mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E9EF] focus:border-[#3157D5] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#202733] mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E9EF] focus:border-[#3157D5] focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Reminder Intervals Card */}
        <div className="p-6 bg-white rounded-xl border border-[#E5E9EF] shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E5E9EF] pb-3">
            <Bell className="w-4 h-4 text-[#3157D5]" />
            <div>
              <h2 className="text-sm font-semibold text-[#202733]">
                Expiry Reminder Schedules
              </h2>
              <p className="text-xs text-[#687385]">
                Configure when you want alerts prior to warranty coverage concluding.
              </p>
            </div>
          </div>

          <div className="divide-y divide-[#E5E9EF] text-xs">
            {/* 1 Month */}
            <label className="py-3 flex items-center justify-between cursor-pointer">
              <div>
                <span className="font-semibold text-[#202733] block">
                  One month before expiry
                </span>
                <span className="text-[#687385] text-[11px]">
                  Advance notice to inspect devices and schedule routine maintenance.
                </span>
              </div>
              <input
                type="checkbox"
                checked={remindOneMonth}
                onChange={(e) => setRemindOneMonth(e.target.checked)}
                className="w-4 h-4 text-[#3157D5] rounded border-[#E5E9EF] focus:ring-[#3157D5]"
              />
            </label>

            {/* 1 Week */}
            <label className="py-3 flex items-center justify-between cursor-pointer">
              <div>
                <span className="font-semibold text-[#202733] block">
                  One week before expiry
                </span>
                <span className="text-[#687385] text-[11px]">
                  Final reminder to submit any pending defect or repair tickets.
                </span>
              </div>
              <input
                type="checkbox"
                checked={remindOneWeek}
                onChange={(e) => setRemindOneWeek(e.target.checked)}
                className="w-4 h-4 text-[#3157D5] rounded border-[#E5E9EF] focus:ring-[#3157D5]"
              />
            </label>

            {/* 1 Day */}
            <label className="py-3 flex items-center justify-between cursor-pointer">
              <div>
                <span className="font-semibold text-[#202733] block">
                  One day before expiry
                </span>
                <span className="text-[#687385] text-[11px]">
                  Urgent alert on the final 24 hours of manufacturer coverage.
                </span>
              </div>
              <input
                type="checkbox"
                checked={remindOneDay}
                onChange={(e) => setRemindOneDay(e.target.checked)}
                className="w-4 h-4 text-[#3157D5] rounded border-[#E5E9EF] focus:ring-[#3157D5]"
              />
            </label>
          </div>
        </div>

        {/* Notification Channels Card */}
        <div className="p-6 bg-white rounded-xl border border-[#E5E9EF] shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E5E9EF] pb-3">
            <Mail className="w-4 h-4 text-[#3157D5]" />
            <div>
              <h2 className="text-sm font-semibold text-[#202733]">
                Delivery Channels
              </h2>
              <p className="text-xs text-[#687385]">
                Control where notification dispatches are routed.
              </p>
            </div>
          </div>

          <div className="divide-y divide-[#E5E9EF] text-xs">
            <label className="py-3 flex items-center justify-between cursor-pointer">
              <div>
                <span className="font-semibold text-[#202733] block">
                  In-App Notification Center
                </span>
                <span className="text-[#687385] text-[11px]">
                  Show real-time badge count and notification feed in top header and workspace.
                </span>
              </div>
              <input
                type="checkbox"
                checked={inAppNotifications}
                onChange={(e) => setInAppNotifications(e.target.checked)}
                className="w-4 h-4 text-[#3157D5] rounded border-[#E5E9EF] focus:ring-[#3157D5]"
              />
            </label>

            <label className="py-3 flex items-center justify-between cursor-pointer">
              <div>
                <span className="font-semibold text-[#202733] block">
                  Email Notifications (AWS SES)
                </span>
                <span className="text-[#687385] text-[11px]">
                  Deliver digests and urgent expiry notices directly to {email}.
                </span>
              </div>
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                className="w-4 h-4 text-[#3157D5] rounded border-[#E5E9EF] focus:ring-[#3157D5]"
              />
            </label>
          </div>
        </div>

        {/* Save Changes Button */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#3157D5] hover:bg-[#2648B8] rounded-lg transition-colors shadow-2xs"
          >
            <Check className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save settings'}</span>
          </button>
        </div>
      </form>

      {/* Application Information & Maintenance */}
      <div className="p-6 bg-white rounded-xl border border-[#E5E9EF] shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E5E9EF] pb-3">
          <Server className="w-4 h-4 text-[#687385]" />
          <h2 className="text-sm font-semibold text-[#202733]">
            System Architecture & Privacy
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-[#F7F8FA] border border-[#E5E9EF]">
            <span className="text-[#687385] block mb-0.5">Application Build</span>
            <span className="font-mono font-medium text-[#202733]">WarrantyEase v1.0.0-rc1</span>
          </div>

          <div className="p-3 rounded-lg bg-[#F7F8FA] border border-[#E5E9EF]">
            <span className="text-[#687385] block mb-0.5">State Engine</span>
            <span className="font-semibold text-[#3157D5]">LocalStorage API Client</span>
          </div>

          <div className="p-3 rounded-lg bg-[#F7F8FA] border border-[#E5E9EF]">
            <span className="text-[#687385] block mb-0.5">Target Backend</span>
            <span className="font-medium text-[#202733]">Python / AWS FastAPI</span>
          </div>
        </div>

        <p className="text-xs text-[#687385] leading-relaxed">
          <strong className="text-[#202733]">Privacy Guarantee:</strong> All document text excerpts and demo records are held securely in your browser workspace. No tracking telemetry, ads, or third-party cookies are used.
        </p>

        {/* Reset Demo Data Action */}
        <div className="pt-4 border-t border-[#E5E9EF] flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-[#202733]">
              Reset Demo Sandbox
            </div>
            <div className="text-[11px] text-[#687385]">
              Restore seed dataset (12 products: 8 active, 3 expiring soon, 1 expired).
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#C03935] bg-[#FDECEC] hover:bg-[#fad8d7] border border-[#F9D0CE] rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset demo data</span>
          </button>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {isResetModalOpen && (
        <Modal
          isOpen={isResetModalOpen}
          onClose={() => setIsResetModalOpen(false)}
          title="Reset Demo Data"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-[#FDECEC] border border-[#F9D0CE] flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#C03935] shrink-0 mt-0.5" />
              <div className="text-xs text-[#C03935] leading-relaxed">
                This will clear all custom added warranties and documents, restoring the default seed dataset with 12 balanced products, original notifications, and default user settings.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E9EF]">
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-[#687385] hover:text-[#202733]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                className="px-4 py-2 text-xs font-medium text-white bg-[#C03935] hover:bg-[#a32f2b] rounded-lg transition-colors"
              >
                Confirm and reset
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
