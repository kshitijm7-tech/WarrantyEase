import React from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShieldCheck, 
  FolderArchive, 
  Bot, 
  Bell, 
  Settings, 
  X,
  Keyboard,
  RotateCcw,
  Globe
} from 'lucide-react';
import { useWarranties } from '../../context/WarrantyContext';

interface SidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
  onOpenShortcuts?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isMobileOpen, 
  onMobileClose,
  onOpenShortcuts 
}) => {
  const { preferences, unreadCount, resetDemoData } = useWarranties();
  const navigate = useNavigate();

  const workspaceNavItems = [
    { label: 'Overview', to: '/overview', icon: LayoutDashboard },
    { label: 'My Warranties', to: '/warranties', icon: ShieldCheck },
    { label: 'Documents', to: '/documents', icon: FolderArchive },
    { label: 'Warranty Assistant', to: '/assistant', icon: Bot },
    { 
      label: 'Notifications', 
      to: '/notifications', 
      icon: Bell, 
      badge: unreadCount > 0 ? unreadCount : undefined 
    },
  ];

  const preferencesNavItems = [
    { label: 'Settings', to: '/settings', icon: Settings },
  ];

  const handleReset = async () => {
    if (window.confirm('Reset all demo data back to factory initial state?')) {
      await resetDemoData();
      navigate('/overview');
    }
  };

  const navContent = (
    <div className="flex flex-col h-full bg-white border-r border-[#E5E9EF] w-[240px] select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-[#E5E9EF] shrink-0">
        <NavLink 
          to="/overview" 
          onClick={onMobileClose}
          className="flex items-center gap-2.5 text-[#202733] font-semibold tracking-tight hover:opacity-90 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-[#3157D5] flex items-center justify-center text-white shadow-xs">
            <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-base font-bold text-[#202733] tracking-tight">WarrantyEase</span>
        </NavLink>

        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className="md:hidden p-1.5 text-[#687385] hover:text-[#202733] rounded-md hover:bg-[#F7F8FA]"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 py-5 px-3 space-y-6 overflow-y-auto">
        {/* Workspace Section */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-semibold text-[#687385] tracking-wider uppercase">
            Workspace
          </div>
          <nav className="space-y-1">
            {workspaceNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onMobileClose}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-[#EEF3FF] text-[#3157D5]'
                        : 'text-[#687385] hover:text-[#202733] hover:bg-[#F7F8FA]'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0 stroke-[2]" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="tabular-nums px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-[#3157D5] text-white">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Preferences Section */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-semibold text-[#687385] tracking-wider uppercase">
            Preferences
          </div>
          <nav className="space-y-1">
            {preferencesNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onMobileClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-[#EEF3FF] text-[#3157D5]'
                        : 'text-[#687385] hover:text-[#202733] hover:bg-[#F7F8FA]'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0 stroke-[2]" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}

            {/* Link back to marketing landing page */}
            <Link
              to="/"
              onClick={onMobileClose}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-[#687385] hover:text-[#202733] hover:bg-[#F7F8FA] transition-colors"
            >
              <Globe className="w-4 h-4 shrink-0 stroke-[2]" />
              <span className="truncate">Marketing Site</span>
            </Link>

            {onOpenShortcuts && (
              <button
                type="button"
                onClick={() => {
                  onMobileClose();
                  onOpenShortcuts();
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-[#687385] hover:text-[#202733] hover:bg-[#F7F8FA] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Keyboard className="w-4 h-4 shrink-0 stroke-[2]" />
                  <span className="truncate">Shortcuts</span>
                </div>
                <kbd className="text-[10px] font-mono text-[#687385] bg-[#F7F8FA] px-1.5 py-0.5 rounded border border-[#E5E9EF]">
                  ?
                </kbd>
              </button>
            )}

            <button
              onClick={handleReset}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-[#687385] hover:text-[#C03935] hover:bg-[#FDECEC] transition-colors text-left"
              title="Reset demo data to factory state"
            >
              <RotateCcw className="w-4 h-4 shrink-0 stroke-[2]" />
              <span className="truncate">Reset demo data</span>
            </button>
          </nav>
        </div>
      </div>

      {/* User Profile Section */}
      <div className="p-3 border-t border-[#E5E9EF] bg-white shrink-0">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#F7F8FA] transition-colors">
          <div className="w-8 h-8 rounded-full bg-[#EEF3FF] text-[#3157D5] font-semibold text-xs flex items-center justify-center shrink-0 border border-[#D5E2FF]">
            DU
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-[#202733] truncate">
              {preferences.name}
            </div>
            <div className="text-[11px] text-[#687385] truncate">
              {preferences.email}
            </div>
          </div>
          <NavLink
            to="/settings"
            onClick={onMobileClose}
            className="text-[#687385] hover:text-[#202733] p-1 rounded"
            title="Account Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </NavLink>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block shrink-0 h-screen sticky top-0 z-30">
        {navContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          <div className="relative z-10 w-[240px] max-w-full h-full shadow-2xl animate-in slide-in-from-left duration-200">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
};
