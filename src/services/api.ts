import { 
  Warranty, 
  WarrantyDocument, 
  NotificationItem, 
  UserPreferences, 
  AssistantMessage,
  WarrantyCategory
} from '../types';
import { 
  INITIAL_WARRANTIES, 
  INITIAL_DOCUMENTS, 
  INITIAL_NOTIFICATIONS, 
  INITIAL_USER_PREFERENCES,
  SAMPLE_EXTRACTED_INVOICE 
} from '../data/demoData';
import { calculateRemainingDays, formatDisplayDate, getReferenceDate } from '../utils/dateUtils';
import { getWarrantyStatus } from '../utils/warrantyUtils';

const STORAGE_KEYS = {
  WARRANTIES: 'warrantease_warranties_v1',
  DOCUMENTS: 'warrantease_documents_v1',
  NOTIFICATIONS: 'warrantease_notifications_v1',
  PREFERENCES: 'warrantease_preferences_v1',
};

// Configurable API Base URL from environment (defaults to local backend when ready)
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// Helper for safe localStorage parsing
function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[WarrantyEase] Failed to read ${key} from storage, resetting to default`, err);
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`[WarrantyEase] Storage quota or write error on ${key}`, err);
  }
}

// Simulated network latency for realistic SaaS feel
const delay = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms));

export interface ExtractedInvoiceResult {
  productName: string;
  brand: string;
  category: WarrantyCategory;
  seller: string;
  invoiceNumber: string;
  purchaseDate: string;
  purchasePrice: number;
  currency: string;
  warrantyDurationMonths: number;
  warrantyStartDate: string;
  warrantyExpiryDate: string;
  serialNumber?: string;
  notes?: string;
  fileName: string;
  fileSize: string;
  rawConfidence: number;
}

export interface IApiService {
  getWarranties(): Promise<Warranty[]>;
  getWarrantyById(id: string): Promise<Warranty | null>;
  createWarranty(data: Omit<Warranty, 'id' | 'createdAt' | 'updatedAt'>): Promise<Warranty>;
  updateWarranty(id: string, data: Partial<Warranty>): Promise<Warranty>;
  deleteWarranty(id: string): Promise<boolean>;
  uploadInvoice(file: File): Promise<ExtractedInvoiceResult>;
  getDocuments(): Promise<WarrantyDocument[]>;
  createDocument(doc: Omit<WarrantyDocument, 'id' | 'uploadedAt'>): Promise<WarrantyDocument>;
  deleteDocument(id: string): Promise<boolean>;
  getNotifications(): Promise<NotificationItem[]>;
  syncExpiryAlerts(): Promise<{
    scannedCount: number;
    expiringSoonCount: number;
    newAlertsCreated: number;
    notifications: NotificationItem[];
  }>;
  createSimulatedExpiringWarranty(
    productName?: string,
    brand?: string,
    daysUntilExpiry?: number
  ): Promise<Warranty>;
  markNotificationAsRead(id: string): Promise<void>;
  markAllNotificationsAsRead(): Promise<void>;
  clearNotification(id: string): Promise<boolean>;
  getUserPreferences(): Promise<UserPreferences>;
  updateUserPreferences(data: Partial<UserPreferences>): Promise<UserPreferences>;
  askWarrantyQuestion(productId: string, question: string): Promise<AssistantMessage>;
  resetDemoData(): Promise<void>;
}

/**
 * Demo API Implementation
 * Later this will be swapped for Python / AWS FastAPI HTTP client
 */
export const api: IApiService = {
  async getWarranties(): Promise<Warranty[]> {
    await delay(120);
    return loadFromStorage<Warranty[]>(STORAGE_KEYS.WARRANTIES, INITIAL_WARRANTIES);
  },

  async getWarrantyById(id: string): Promise<Warranty | null> {
    await delay(80);
    const list = loadFromStorage<Warranty[]>(STORAGE_KEYS.WARRANTIES, INITIAL_WARRANTIES);
    return list.find((w) => w.id === id) || null;
  },

  async createWarranty(data: Omit<Warranty, 'id' | 'createdAt' | 'updatedAt'>): Promise<Warranty> {
    await delay(200);
    const list = loadFromStorage<Warranty[]>(STORAGE_KEYS.WARRANTIES, INITIAL_WARRANTIES);
    const newId = `war-${Date.now()}`;
    const nowIso = new Date().toISOString();
    
    const newWarranty: Warranty = {
      ...data,
      id: newId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    
    const updated = [newWarranty, ...list];
    saveToStorage(STORAGE_KEYS.WARRANTIES, updated);

    // If newly created warranty is expiring soon, create a notification automatically
    const remainingDays = calculateRemainingDays(newWarranty.warrantyExpiryDate);
    const status = getWarrantyStatus(newWarranty.warrantyExpiryDate);
    if (status === 'expiring_soon') {
      const notifs = loadFromStorage<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
      const newNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
        warrantyId: newId,
        productName: newWarranty.productName,
        type: 'expiring_soon',
        title: `Warranty expires in ${remainingDays} days`,
        message: `Registered warranty for ${newWarranty.productName} will expire on ${formatDisplayDate(newWarranty.warrantyExpiryDate)}.`,
        daysRemaining: remainingDays,
        createdAt: nowIso,
        isRead: false,
      };
      saveToStorage(STORAGE_KEYS.NOTIFICATIONS, [newNotif, ...notifs]);
    }

    return newWarranty;
  },

  async updateWarranty(id: string, data: Partial<Warranty>): Promise<Warranty> {
    await delay(160);
    const list = loadFromStorage<Warranty[]>(STORAGE_KEYS.WARRANTIES, INITIAL_WARRANTIES);
    const index = list.findIndex((w) => w.id === id);
    if (index === -1) {
      throw new Error(`Warranty not found with id: ${id}`);
    }
    const updatedRecord: Warranty = {
      ...list[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    list[index] = updatedRecord;
    saveToStorage(STORAGE_KEYS.WARRANTIES, list);
    return updatedRecord;
  },

  async deleteWarranty(id: string): Promise<boolean> {
    await delay(160);
    const list = loadFromStorage<Warranty[]>(STORAGE_KEYS.WARRANTIES, INITIAL_WARRANTIES);
    const filtered = list.filter((w) => w.id !== id);
    saveToStorage(STORAGE_KEYS.WARRANTIES, filtered);
    
    // Clean up notifications for this warranty
    const notifs = loadFromStorage<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    saveToStorage(
      STORAGE_KEYS.NOTIFICATIONS,
      notifs.filter((n) => n.warrantyId !== id)
    );
    return true;
  },

  async uploadInvoice(file: File): Promise<ExtractedInvoiceResult> {
    await delay(450); // Simulate processing time
    
    const validExtensions = ['pdf', 'png', 'jpg', 'jpeg'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!validExtensions.includes(ext)) {
      throw new Error(`Unsupported file type: .${ext}. Only PDF, JPG, and PNG are supported.`);
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('File exceeds the 10 MB demo limit.');
    }

    const fileSizeFormatted = file.size > 1024 * 1024 
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
      : `${Math.round(file.size / 1024)} KB`;

    // Demo mode: Return intelligently extracted fields based on filename or fallback to sample
    const isWatch = file.name.toLowerCase().includes('watch');
    const isLaptop = file.name.toLowerCase().includes('laptop') || file.name.toLowerCase().includes('mac');
    
    if (isLaptop) {
      return {
        productName: 'Dell XPS 15 OLED Laptop',
        brand: 'Dell',
        category: 'Computing',
        seller: 'Dell Technologies',
        invoiceNumber: `INV-DELL-${Math.floor(100000 + Math.random() * 900000)}`,
        purchaseDate: '2026-08-15',
        purchasePrice: 1899.00,
        currency: 'USD',
        warrantyDurationMonths: 24,
        warrantyStartDate: '2026-08-15',
        warrantyExpiryDate: '2028-08-15',
        serialNumber: 'XPS-9530-K890',
        notes: 'Includes 24-month Dell Premium Onsite Hardware Support.',
        fileName: file.name,
        fileSize: fileSizeFormatted,
        rawConfidence: 94,
      };
    }

    return {
      ...SAMPLE_EXTRACTED_INVOICE,
      fileName: file.name,
      fileSize: fileSizeFormatted,
      rawConfidence: 92,
    };
  },

  async getDocuments(): Promise<WarrantyDocument[]> {
    await delay(100);
    return loadFromStorage<WarrantyDocument[]>(STORAGE_KEYS.DOCUMENTS, INITIAL_DOCUMENTS);
  },

  async createDocument(doc: Omit<WarrantyDocument, 'id' | 'uploadedAt'>): Promise<WarrantyDocument> {
    await delay(150);
    const list = loadFromStorage<WarrantyDocument[]>(STORAGE_KEYS.DOCUMENTS, INITIAL_DOCUMENTS);
    const newDoc: WarrantyDocument = {
      ...doc,
      id: `doc-${Date.now()}`,
      uploadedAt: new Date().toISOString().split('T')[0],
    };
    const updated = [newDoc, ...list];
    saveToStorage(STORAGE_KEYS.DOCUMENTS, updated);
    return newDoc;
  },

  async deleteDocument(id: string): Promise<boolean> {
    await delay(120);
    const list = loadFromStorage<WarrantyDocument[]>(STORAGE_KEYS.DOCUMENTS, INITIAL_DOCUMENTS);
    const filtered = list.filter((d) => d.id !== id);
    saveToStorage(STORAGE_KEYS.DOCUMENTS, filtered);
    return true;
  },

  /**
   * Evaluates all registered warranties and triggers visual alerts 30 days before expiry
   */
  async syncExpiryAlerts(): Promise<{
    scannedCount: number;
    expiringSoonCount: number;
    newAlertsCreated: number;
    notifications: NotificationItem[];
  }> {
    const warranties = loadFromStorage<Warranty[]>(STORAGE_KEYS.WARRANTIES, INITIAL_WARRANTIES);
    const notifs = loadFromStorage<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    let newCreated = 0;
    const updated = [...notifs];

    const expiringWarranties = warranties.filter((w) => {
      const days = calculateRemainingDays(w.warrantyExpiryDate);
      return days >= 0 && days <= 30;
    });

    for (const w of expiringWarranties) {
      const days = calculateRemainingDays(w.warrantyExpiryDate);
      const existingIdx = updated.findIndex(
        (n) => n.warrantyId === w.id && n.type === 'expiring_soon'
      );

      if (existingIdx === -1) {
        // Trigger a new 30-day visual alert notification
        const alertNotif: NotificationItem = {
          id: `notif-30d-${w.id}-${Date.now()}`,
          warrantyId: w.id,
          productName: w.productName,
          brand: w.brand,
          type: 'expiring_soon',
          title: `30-Day Alert: Warranty expires in ${days === 0 ? 'today' : `${days} day${days === 1 ? '' : 's'}`}`,
          message: `Your manufacturer warranty coverage for ${w.productName} (${w.brand}) expires on ${formatDisplayDate(w.warrantyExpiryDate)}. Submit any defect or repair tickets before protection lapses.`,
          daysRemaining: days,
          expiryDate: w.warrantyExpiryDate,
          createdAt: new Date().toISOString(),
          isRead: false,
        };
        updated.unshift(alertNotif);
        newCreated++;
      } else {
        // Update daysRemaining & message to keep alert fresh
        updated[existingIdx] = {
          ...updated[existingIdx],
          daysRemaining: days,
          brand: w.brand,
          expiryDate: w.warrantyExpiryDate,
          title: `30-Day Alert: Warranty expires in ${days === 0 ? 'today' : `${days} day${days === 1 ? '' : 's'}`}`,
        };
      }
    }

    saveToStorage(STORAGE_KEYS.NOTIFICATIONS, updated);
    return {
      scannedCount: warranties.length,
      expiringSoonCount: expiringWarranties.length,
      newAlertsCreated: newCreated,
      notifications: updated,
    };
  },

  async getNotifications(): Promise<NotificationItem[]> {
    await delay(80);
    // Automatically evaluate registered warranties against 30-day trigger threshold
    const { notifications } = await this.syncExpiryAlerts();
    return notifications;
  },

  /**
   * Helper to register a test product expiring in the 30-day alert window
   */
  async createSimulatedExpiringWarranty(
    productName = 'Sony PlayStation 5 DualSense Edge Controller',
    brand = 'Sony Interactive',
    daysUntilExpiry = 21
  ): Promise<Warranty> {
    const ref = getReferenceDate();
    const expiryDate = new Date(ref.getTime() + daysUntilExpiry * 24 * 60 * 60 * 1000);
    const expiryDateStr = expiryDate.toISOString().split('T')[0];
    const purchaseDate = new Date(ref.getTime() - 344 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const newWarranty = await this.createWarranty({
      userId: 'user-demo',
      productName,
      brand,
      category: 'Electronics',
      seller: 'Best Buy Retail',
      invoiceNumber: `INV-BB-${Math.floor(100000 + Math.random() * 900000)}`,
      purchaseDate,
      purchasePrice: 199.99,
      currency: 'USD',
      warrantyStartDate: purchaseDate,
      warrantyDurationMonths: 12,
      warrantyExpiryDate: expiryDateStr,
      serialNumber: `PS5-CTRL-${Math.floor(10000 + Math.random() * 90000)}`,
      coverageSummary: 'Sony 1-Year Limited Warranty covering stick drift, haptic triggers, and internal battery.',
      exclusions: ['Accidental liquid spill', 'Severe drop damage', 'Unauthorized disassembly'],
      claimRequirements: ['Original purchase receipt', 'Serial number confirmation'],
      claimContact: {
        phone: '1-800-345-7669',
        url: 'https://support.playstation.com',
        supportHours: 'Mon-Fri 9am-6pm PST',
      },
      documentIds: [],
    });

    // Re-sync to immediately trigger the 30-day alert
    await this.syncExpiryAlerts();
    return newWarranty;
  },

  async markNotificationAsRead(id: string): Promise<void> {
    const list = loadFromStorage<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    const updated = list.map((item) => (item.id === id ? { ...item, isRead: true } : item));
    saveToStorage(STORAGE_KEYS.NOTIFICATIONS, updated);
  },

  async markAllNotificationsAsRead(): Promise<void> {
    const list = loadFromStorage<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    const updated = list.map((item) => ({ ...item, isRead: true }));
    saveToStorage(STORAGE_KEYS.NOTIFICATIONS, updated);
  },

  async clearNotification(id: string): Promise<boolean> {
    const list = loadFromStorage<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    const filtered = list.filter((n) => n.id !== id);
    saveToStorage(STORAGE_KEYS.NOTIFICATIONS, filtered);
    return true;
  },

  async getUserPreferences(): Promise<UserPreferences> {
    await delay(60);
    return loadFromStorage<UserPreferences>(STORAGE_KEYS.PREFERENCES, INITIAL_USER_PREFERENCES);
  },

  async updateUserPreferences(data: Partial<UserPreferences>): Promise<UserPreferences> {
    await delay(120);
    const current = loadFromStorage<UserPreferences>(STORAGE_KEYS.PREFERENCES, INITIAL_USER_PREFERENCES);
    const updated: UserPreferences = { ...current, ...data };
    saveToStorage(STORAGE_KEYS.PREFERENCES, updated);
    return updated;
  },

  /**
   * Rule-based Assistant grounded exclusively in saved warranty records
   */
  async askWarrantyQuestion(productId: string, question: string): Promise<AssistantMessage> {
    await delay(350); // Small realistic delay
    const warranties = loadFromStorage<Warranty[]>(STORAGE_KEYS.WARRANTIES, INITIAL_WARRANTIES);
    const warranty = warranties.find((w) => w.id === productId);

    const q = question.toLowerCase().trim();
    const nowIso = new Date().toISOString();

    if (!warranty) {
      return {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        text: 'Please select a registered product above to query its warranty terms and documentation.',
        timestamp: nowIso,
        isUncertain: true,
      };
    }

    const remainingDays = calculateRemainingDays(warranty.warrantyExpiryDate);
    const status = getWarrantyStatus(warranty.warrantyExpiryDate);

    // 1. Expiry / remaining duration
    if (q.includes('expire') || q.includes('when') || q.includes('how long') || q.includes('remaining') || q.includes('valid until') || q.includes('end')) {
      let expiryText = `Your warranty for **${warranty.productName}** is scheduled to expire on **${formatDisplayDate(warranty.warrantyExpiryDate)}**. `;
      if (status === 'expired') {
        expiryText += `This warranty expired ${Math.abs(remainingDays)} days ago. Future repairs may incur out-of-warranty labor and parts fees.`;
      } else if (status === 'expiring_soon') {
        expiryText += `Coverage is expiring soon (${remainingDays} days remaining). We recommend reporting any ongoing hardware anomalies prior to this date.`;
      } else {
        expiryText += `Coverage is fully active with ${remainingDays} days remaining (duration: ${warranty.warrantyDurationMonths} months from ${formatDisplayDate(warranty.warrantyStartDate)}).`;
      }

      return {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        productId: warranty.id,
        productName: warranty.productName,
        text: expiryText,
        timestamp: nowIso,
        sourceCitation: `Source: Purchase invoice & warranty schedule (${warranty.invoiceNumber})`,
      };
    }

    // 2. Accidental damage / drops / liquid / physical
    if (q.includes('accidental') || q.includes('drop') || q.includes('water') || q.includes('liquid') || q.includes('spill') || q.includes('damage') || q.includes('crack')) {
      const mentionsAccidental = warranty.coverageSummary?.toLowerCase().includes('accidental') ||
        warranty.sourceWarrantyText?.toLowerCase().includes('accidental');
      
      const exclusionsMentionLiquid = warranty.exclusions?.some((e) => 
        e.toLowerCase().includes('liquid') || e.toLowerCase().includes('drop') || e.toLowerCase().includes('accidental') || e.toLowerCase().includes('water')
      );

      if (mentionsAccidental && !exclusionsMentionLiquid) {
        return {
          id: `msg-${Date.now()}`,
          sender: 'assistant',
          productId: warranty.id,
          productName: warranty.productName,
          text: `Yes, accidental damage is covered under your active protection plan for **${warranty.productName}**, subject to manufacturer standard handling procedures.\n\nSummary:\n"${warranty.coverageSummary}"`,
          timestamp: nowIso,
          sourceCitation: 'Source: Warranty terms — Coverage section',
        };
      }

      if (exclusionsMentionLiquid || warranty.exclusions && warranty.exclusions.length > 0) {
        const relevantExclusions = warranty.exclusions
          ?.filter((e) => e.toLowerCase().includes('liquid') || e.toLowerCase().includes('drop') || e.toLowerCase().includes('accidental') || e.toLowerCase().includes('cosmetic') || e.toLowerCase().includes('water'))
          .join('\n• ');

        return {
          id: `msg-${Date.now()}`,
          sender: 'assistant',
          productId: warranty.id,
          productName: warranty.productName,
          text: `Accidental damage is **excluded** from the standard limited manufacturer warranty for **${warranty.productName}**.\n\nSpecific exclusion clauses recorded:\n• ${relevantExclusions || 'Accidental drops, physical impact, and liquid ingress are not covered.'}\n\nNote: Claim approval is at the manufacturer's discretion upon hardware inspection.`,
          timestamp: nowIso,
          sourceCitation: 'Source: Warranty terms — Exclusions clause',
        };
      }

      return {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        productId: warranty.id,
        productName: warranty.productName,
        text: 'Not specified in the uploaded document. The saved documents for this product do not explicitly state whether accidental or liquid damage is covered. Please check your full policy paperwork or contact customer care.',
        timestamp: nowIso,
        isUncertain: true,
      };
    }

    // 3. Claim requirements / documents needed
    if (q.includes('document') || q.includes('claim') || q.includes('receipt') || q.includes('how to claim') || q.includes('need') || q.includes('process')) {
      if (warranty.claimRequirements && warranty.claimRequirements.length > 0) {
        const reqs = warranty.claimRequirements.map((r, i) => `${i + 1}. ${r}`).join('\n');
        return {
          id: `msg-${Date.now()}`,
          sender: 'assistant',
          productId: warranty.id,
          productName: warranty.productName,
          text: `To submit a warranty claim for **${warranty.productName}**, the following requirements and documents are listed in your record:\n\n${reqs}\n\nInvoice Number on file: **${warranty.invoiceNumber}**${warranty.serialNumber ? `\nSerial Number: **${warranty.serialNumber}**` : ''}`,
          timestamp: nowIso,
          sourceCitation: 'Source: Warranty claim guidelines & store invoice',
        };
      }
      return {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        productId: warranty.id,
        productName: warranty.productName,
        text: `You will generally require your original purchase invoice (**${warranty.invoiceNumber}**) from **${warranty.seller}** and the product serial number. Specific submission steps are not further detailed in the uploaded document.`,
        timestamp: nowIso,
        sourceCitation: 'Source: Purchase record',
      };
    }

    // 4. Repairs / parts / labor
    if (q.includes('repair') || q.includes('parts') || q.includes('labor') || q.includes('battery') || q.includes('fix') || q.includes('service')) {
      if (warranty.coverageSummary) {
        return {
          id: `msg-${Date.now()}`,
          sender: 'assistant',
          productId: warranty.id,
          productName: warranty.productName,
          text: `Here is the repair and service coverage recorded for **${warranty.productName}**:\n\n"${warranty.coverageSummary}"\n\n${warranty.sourceWarrantyText ? `Document excerpt: "${warranty.sourceWarrantyText}"` : ''}`,
          timestamp: nowIso,
          sourceCitation: 'Source: Warranty terms — Coverage section',
        };
      }
      return {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        productId: warranty.id,
        productName: warranty.productName,
        text: 'Not specified in the uploaded document. Your saved document does not list detailed parts or labor repair specifics.',
        timestamp: nowIso,
        isUncertain: true,
      };
    }

    // 5. Contact / Seller / Phone / Email
    if (q.includes('contact') || q.includes('seller') || q.includes('phone') || q.includes('email') || q.includes('support') || q.includes('call') || q.includes('website')) {
      const contact = warranty.claimContact;
      const details: string[] = [];
      if (contact?.phone) details.push(`• **Phone**: ${contact.phone}`);
      if (contact?.email) details.push(`• **Email**: ${contact.email}`);
      if (contact?.url) details.push(`• **Support Portal**: ${contact.url}`);
      if (contact?.supportHours) details.push(`• **Hours**: ${contact.supportHours}`);
      details.push(`• **Retailer / Seller**: ${warranty.seller}`);

      return {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        productId: warranty.id,
        productName: warranty.productName,
        text: `Here are the official contact details for **${warranty.productName}** (${warranty.brand}):\n\n${details.join('\n')}`,
        timestamp: nowIso,
        sourceCitation: 'Source: Retailer invoice and official support registry',
      };
    }

    // 6. Cost / price / serial / invoice details
    if (q.includes('price') || q.includes('cost') || q.includes('serial') || q.includes('invoice') || q.includes('bought')) {
      return {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        productId: warranty.id,
        productName: warranty.productName,
        text: `Purchase Details for **${warranty.productName}**:\n• **Purchase Date**: ${formatDisplayDate(warranty.purchaseDate)}\n• **Price Paid**: $${warranty.purchasePrice.toFixed(2)} ${warranty.currency}\n• **Retailer**: ${warranty.seller}\n• **Invoice Number**: ${warranty.invoiceNumber}\n• **Serial Number**: ${warranty.serialNumber || 'Not specified in document'}`,
        timestamp: nowIso,
        sourceCitation: `Source: Purchase Invoice (${warranty.invoiceNumber})`,
      };
    }

    // Default: Specific fact not in document
    return {
      id: `msg-${Date.now()}`,
      sender: 'assistant',
      productId: warranty.id,
      productName: warranty.productName,
      text: `Not specified in the uploaded document. The saved document for "${warranty.productName}" does not contain specific information regarding "${question}".\n\nTry asking about:\n• Warranty expiration & days remaining\n• Accidental damage & exclusions\n• Required claim documents & invoice\n• Repair & parts coverage\n• Customer support phone/email`,
      timestamp: nowIso,
      sourceCitation: 'Source: Uploaded document index',
      isUncertain: true,
    };
  },

  async resetDemoData(): Promise<void> {
    await delay(150);
    localStorage.removeItem(STORAGE_KEYS.WARRANTIES);
    localStorage.removeItem(STORAGE_KEYS.DOCUMENTS);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
    localStorage.removeItem(STORAGE_KEYS.PREFERENCES);
  },
};
