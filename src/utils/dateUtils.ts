/**
 * Date utilities for WarrantyEase
 */

// Reference base date anchored to current app context (2026-10-18)
export const getReferenceDate = (): Date => {
  return new Date('2026-10-18T00:00:00Z');
};

export const getTodayISO = (): string => {
  return '2026-10-18';
};

/**
 * Calculates remaining days from reference date to expiry date.
 * Returns negative if already expired.
 */
export const calculateRemainingDays = (expiryDateStr: string): number => {
  if (!expiryDateStr) return 0;
  
  const expiry = new Date(`${expiryDateStr}T00:00:00Z`);
  const today = getReferenceDate();
  
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Returns human-readable remaining time text.
 * e.g., "14 days left", "Today", "Expired 5 days ago"
 */
export const formatRemainingTime = (days: number): string => {
  if (days < 0) {
    const abs = Math.abs(days);
    return abs === 1 ? 'Expired 1 day ago' : `Expired ${abs} days ago`;
  }
  if (days === 0) {
    return 'Expires today';
  }
  if (days === 1) {
    return '1 day remaining';
  }
  if (days <= 30) {
    return `${days} days remaining`;
  }
  if (days <= 60) {
    return 'About 1 month remaining';
  }
  const months = Math.floor(days / 30.4);
  if (months < 12) {
    return `${months} months remaining`;
  }
  const years = (days / 365).toFixed(1);
  return `${years} yrs remaining`;
};

/**
 * Formats ISO YYYY-MM-DD to "Oct 18, 2026"
 */
export const formatDisplayDate = (dateStr?: string): string => {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(`${dateStr}T00:00:00Z`);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  } catch {
    return dateStr;
  }
};

/**
 * Adds N months to a YYYY-MM-DD date string and returns new YYYY-MM-DD.
 */
export const addMonthsToDate = (startDateStr: string, months: number): string => {
  if (!startDateStr || isNaN(months)) return startDateStr;
  try {
    const [year, month, day] = startDateStr.split('-').map(Number);
    const d = new Date(Date.UTC(year, month - 1 + months, day));
    return d.toISOString().split('T')[0];
  } catch {
    return startDateStr;
  }
};
