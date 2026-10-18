import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Warranty, 
  WarrantyDocument, 
  NotificationItem, 
  UserPreferences, 
  DashboardMetrics 
} from '../types';
import { api } from '../services/api';
import { computeDashboardMetrics } from '../utils/warrantyUtils';
import { INITIAL_USER_PREFERENCES } from '../data/demoData';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface WarrantyContextType {
  warranties: Warranty[];
  documents: WarrantyDocument[];
  notifications: NotificationItem[];
  preferences: UserPreferences;
  metrics: DashboardMetrics;
  unreadCount: number;
  isLoading: boolean;
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;
  refreshData: () => Promise<void>;
  createWarranty: (data: Omit<Warranty, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Warranty>;
  updateWarranty: (id: string, data: Partial<Warranty>) => Promise<Warranty>;
  deleteWarranty: (id: string) => Promise<boolean>;
  createDocument: (doc: Omit<WarrantyDocument, 'id' | 'uploadedAt'>) => Promise<WarrantyDocument>;
  deleteDocument: (id: string) => Promise<boolean>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  clearNotification: (id: string) => Promise<boolean>;
  updatePreferences: (data: Partial<UserPreferences>) => Promise<UserPreferences>;
  resetDemoData: () => Promise<void>;
}

const WarrantyContext = createContext<WarrantyContextType | undefined>(undefined);

export const WarrantyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [documents, setDocuments] = useState<WarrantyDocument[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>(INITIAL_USER_PREFERENCES);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4000);
  }, [dismissToast]);

  const refreshData = useCallback(async () => {
    try {
      const [fetchedWarranties, fetchedDocs, fetchedNotifs, fetchedPrefs] = await Promise.all([
        api.getWarranties(),
        api.getDocuments(),
        api.getNotifications(),
        api.getUserPreferences(),
      ]);
      setWarranties(fetchedWarranties);
      setDocuments(fetchedDocs);
      setNotifications(fetchedNotifs);
      setPreferences(fetchedPrefs);
    } catch (err) {
      console.error('Failed to load WarrantyEase data:', err);
      showToast('Error syncing warranty data.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const metrics = useMemo(() => {
    return computeDashboardMetrics(warranties);
  }, [warranties]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const createWarranty = async (data: Omit<Warranty, 'id' | 'createdAt' | 'updatedAt'>): Promise<Warranty> => {
    try {
      const created = await api.createWarranty(data);
      await refreshData();
      showToast(`Saved warranty for "${created.productName}".`, 'success');
      return created;
    } catch (err) {
      showToast('Failed to save warranty.', 'error');
      throw err;
    }
  };

  const updateWarranty = async (id: string, data: Partial<Warranty>): Promise<Warranty> => {
    try {
      const updated = await api.updateWarranty(id, data);
      await refreshData();
      showToast(`Updated "${updated.productName}".`, 'success');
      return updated;
    } catch (err) {
      showToast('Failed to update warranty.', 'error');
      throw err;
    }
  };

  const deleteWarranty = async (id: string): Promise<boolean> => {
    try {
      const target = warranties.find((w) => w.id === id);
      await api.deleteWarranty(id);
      await refreshData();
      showToast(`Deleted warranty for "${target?.productName || 'product'}".`, 'info');
      return true;
    } catch (err) {
      showToast('Failed to delete warranty.', 'error');
      throw err;
    }
  };

  const createDocument = async (doc: Omit<WarrantyDocument, 'id' | 'uploadedAt'>): Promise<WarrantyDocument> => {
    try {
      const created = await api.createDocument(doc);
      await refreshData();
      showToast(`Uploaded document "${created.fileName}".`, 'success');
      return created;
    } catch (err) {
      showToast('Failed to attach document.', 'error');
      throw err;
    }
  };

  const deleteDocument = async (id: string): Promise<boolean> => {
    try {
      const target = documents.find((d) => d.id === id);
      await api.deleteDocument(id);
      await refreshData();
      showToast(`Removed document "${target?.fileName || 'document'}".`, 'info');
      return true;
    } catch (err) {
      showToast('Failed to delete document.', 'error');
      throw err;
    }
  };

  const markNotificationAsRead = async (id: string) => {
    await api.markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllNotificationsAsRead = async () => {
    await api.markAllNotificationsAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    showToast('All notifications marked as read.', 'info');
  };

  const clearNotification = async (id: string): Promise<boolean> => {
    await api.clearNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    showToast('Notification cleared.', 'info');
    return true;
  };

  const updatePreferences = async (data: Partial<UserPreferences>): Promise<UserPreferences> => {
    try {
      const updated = await api.updateUserPreferences(data);
      setPreferences(updated);
      showToast('Preferences saved.', 'success');
      return updated;
    } catch (err) {
      showToast('Failed to save preferences.', 'error');
      throw err;
    }
  };

  const resetDemoData = async () => {
    try {
      await api.resetDemoData();
      await refreshData();
      showToast('Demo data reset to factory initial state.', 'info');
    } catch (err) {
      showToast('Failed to reset demo data.', 'error');
    }
  };

  return (
    <WarrantyContext.Provider
      value={{
        warranties,
        documents,
        notifications,
        preferences,
        metrics,
        unreadCount,
        isLoading,
        toasts,
        showToast,
        dismissToast,
        refreshData,
        createWarranty,
        updateWarranty,
        deleteWarranty,
        createDocument,
        deleteDocument,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearNotification,
        updatePreferences,
        resetDemoData,
      }}
    >
      {children}
    </WarrantyContext.Provider>
  );
};

export const useWarranties = () => {
  const context = useContext(WarrantyContext);
  if (!context) {
    throw new Error('useWarranties must be used within a WarrantyProvider');
  }
  return context;
};
