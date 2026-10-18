export type WarrantyCategory = 
  | 'Electronics'
  | 'Appliances'
  | 'Audio & Sound'
  | 'Computing'
  | 'Smart Home'
  | 'Personal Care'
  | 'Photography'
  | 'Other';

export type WarrantyStatus = 'active' | 'expiring_soon' | 'expired';

export interface ClaimContact {
  phone?: string;
  email?: string;
  url?: string;
  supportHours?: string;
}

export interface Warranty {
  id: string;
  userId: string;
  productName: string;
  brand: string;
  category: WarrantyCategory;
  seller: string;
  invoiceNumber: string;
  purchaseDate: string; // ISO YYYY-MM-DD
  purchasePrice: number;
  currency: string;
  warrantyStartDate: string; // ISO YYYY-MM-DD
  warrantyDurationMonths: number;
  warrantyExpiryDate: string; // ISO YYYY-MM-DD
  serialNumber?: string;
  notes?: string;
  coverageSummary?: string;
  exclusions?: string[];
  claimRequirements?: string[];
  claimContact?: ClaimContact;
  sourceWarrantyText?: string;
  documentIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type DocumentType = 'Invoice' | 'Warranty certificate' | 'Receipt' | 'Other';

export interface WarrantyDocument {
  id: string;
  warrantyId?: string;
  productName?: string;
  fileName: string;
  fileType: DocumentType;
  fileSize: string;
  uploadedAt: string;
  previewUrl?: string;
  isSample?: boolean;
  rawTextExcerpt?: string;
}

export type NotificationType = 'expiring_soon' | 'expired' | 'registered' | 'claim_info';

export interface NotificationItem {
  id: string;
  warrantyId: string;
  productName: string;
  type: NotificationType;
  title: string;
  message: string;
  daysRemaining?: number;
  createdAt: string;
  isRead: boolean;
}

export interface UserPreferences {
  name: string;
  email: string;
  remindOneMonth: boolean;
  remindOneWeek: boolean;
  remindOneDay: boolean;
  emailNotifications: boolean;
  inAppNotifications: boolean;
}

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant';
  productId?: string;
  productName?: string;
  text: string;
  timestamp: string;
  sourceCitation?: string;
  isUncertain?: boolean;
}

export interface DashboardMetrics {
  totalProducts: number;
  activeWarranties: number;
  expiringSoonWarranties: number;
  expiredWarranties: number;
}
