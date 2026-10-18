import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { SearchModal } from '../ui/SearchModal';
import { ToastContainer } from '../ui/ToastContainer';
import { KeyboardShortcutsModal } from '../ui/KeyboardShortcutsModal';
import { AddInvoiceModal } from '../warranties/AddInvoiceModal';

export const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isAddInvoiceOpen, setIsAddInvoiceOpen] = useState(false);

  // Global Keyboard Shortcuts Handler
  useEffect(() => {
    let lastKey = '';
    let lastKeyTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger single-key shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
        return;
      }

      if (isInput) return;

      const now = Date.now();

      if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }

      if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsAddInvoiceOpen(true);
        return;
      }

      // 'g' then navigation key
      if (lastKey === 'g' && now - lastKeyTime < 1000) {
        if (e.key.toLowerCase() === 'o') {
          e.preventDefault();
          navigate('/');
        } else if (e.key.toLowerCase() === 'w') {
          e.preventDefault();
          navigate('/warranties');
        } else if (e.key.toLowerCase() === 'd') {
          e.preventDefault();
          navigate('/documents');
        } else if (e.key.toLowerCase() === 'a') {
          e.preventDefault();
          navigate('/assistant');
        } else if (e.key.toLowerCase() === 'n') {
          e.preventDefault();
          navigate('/notifications');
        } else if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          navigate('/settings');
        }
        lastKey = '';
        return;
      }

      lastKey = e.key.toLowerCase();
      lastKeyTime = now;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <div className="min-h-screen flex bg-[#F7F8FA] text-[#202733]">
      {/* Sidebar */}
      <Sidebar 
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
      />

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Modals & Toasts */}
      <SearchModal 
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
      <AddInvoiceModal
        isOpen={isAddInvoiceOpen}
        onClose={() => setIsAddInvoiceOpen(false)}
      />
      <ToastContainer />
    </div>
  );
};
