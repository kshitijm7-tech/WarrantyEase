import { Warranty } from '../types';
import { getWarrantyStatus } from './warrantyUtils';

/**
 * Exports warranties array to a standard CSV file and triggers browser download.
 */
export const exportWarrantiesToCSV = (warranties: Warranty[], filename = 'warrantyease_export.csv'): void => {
  if (warranties.length === 0) return;

  const headers = [
    'Product Name',
    'Brand',
    'Category',
    'Seller',
    'Invoice Number',
    'Purchase Date',
    'Price Paid',
    'Currency',
    'Warranty Duration (Months)',
    'Start Date',
    'Expiry Date',
    'Status',
    'Serial Number',
    'Support Phone',
    'Support Email',
    'Notes',
  ];

  const escapeCSV = (val?: string | number) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = warranties.map((w) => [
    escapeCSV(w.productName),
    escapeCSV(w.brand),
    escapeCSV(w.category),
    escapeCSV(w.seller),
    escapeCSV(w.invoiceNumber),
    escapeCSV(w.purchaseDate),
    escapeCSV(w.purchasePrice),
    escapeCSV(w.currency),
    escapeCSV(w.warrantyDurationMonths),
    escapeCSV(w.warrantyStartDate),
    escapeCSV(w.warrantyExpiryDate),
    escapeCSV(getWarrantyStatus(w.warrantyExpiryDate)),
    escapeCSV(w.serialNumber || ''),
    escapeCSV(w.claimContact?.phone || ''),
    escapeCSV(w.claimContact?.email || ''),
    escapeCSV(w.notes || ''),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
