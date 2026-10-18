import { Warranty, WarrantyStatus, DashboardMetrics } from '../types';
import { calculateRemainingDays } from './dateUtils';

/**
 * Returns warranty status based on expiry date
 */
export const getWarrantyStatus = (expiryDateStr: string): WarrantyStatus => {
  const days = calculateRemainingDays(expiryDateStr);
  if (days < 0) {
    return 'expired';
  }
  if (days <= 30) {
    return 'expiring_soon';
  }
  return 'active';
};

/**
 * Computes exact metrics from list of warranties
 */
export const computeDashboardMetrics = (warranties: Warranty[]): DashboardMetrics => {
  let active = 0;
  let expiringSoon = 0;
  let expired = 0;

  for (const w of warranties) {
    const status = getWarrantyStatus(w.warrantyExpiryDate);
    if (status === 'active') {
      active++;
    } else if (status === 'expiring_soon') {
      expiringSoon++;
    } else if (status === 'expired') {
      expired++;
    }
  }

  return {
    totalProducts: warranties.length,
    activeWarranties: active,
    expiringSoonWarranties: expiringSoon,
    expiredWarranties: expired,
  };
};

/**
 * Format currency amount cleanly
 */
export const formatCurrency = (amount: number, currency = 'USD'): string => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
};

/**
 * Label mapping for status
 */
export const getStatusLabel = (status: WarrantyStatus): string => {
  switch (status) {
    case 'active':
      return 'Active';
    case 'expiring_soon':
      return 'Expiring soon';
    case 'expired':
      return 'Expired';
  }
};
