import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit2, 
  Trash2, 
  Calendar, 
  ShieldCheck, 
  FileText, 
  Phone, 
  Mail, 
  ExternalLink, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Download, 
  Bot, 
  Copy,
  Check,
  Receipt,
  FileSpreadsheet
} from 'lucide-react';
import { useWarranties } from '../context/WarrantyContext';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EditWarrantyModal } from '../components/warranties/EditWarrantyModal';
import { DocumentPreviewModal } from '../components/documents/DocumentPreviewModal';
import { ClaimPacketModal } from '../components/warranties/ClaimPacketModal';
import { Modal } from '../components/ui/Modal';
import { formatDisplayDate, calculateRemainingDays, formatRemainingTime } from '../utils/dateUtils';
import { getWarrantyStatus, formatCurrency } from '../utils/warrantyUtils';
import { WarrantyDocument } from '../types';

export const WarrantyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { warranties, documents, deleteWarranty, showToast } = useWarranties();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [previewingDoc, setPreviewingDoc] = useState<WarrantyDocument | null>(null);

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const warranty = useMemo(() => {
    return warranties.find((w) => w.id === id);
  }, [warranties, id]);

  const attachedDocs = useMemo(() => {
    if (!warranty) return [];
    return documents.filter(
      (d) => d.warrantyId === warranty.id || warranty.documentIds?.includes(d.id)
    );
  }, [documents, warranty]);

  if (!warranty) {
    return (
      <div className="bg-white rounded-xl border border-[#E5E9EF] p-12 text-center shadow-2xs max-w-lg mx-auto mt-12">
        <AlertCircle className="w-10 h-10 text-[#C03935] mx-auto mb-3" />
        <h2 className="text-base font-bold text-[#202733] mb-1">
          Warranty record not found
        </h2>
        <p className="text-xs text-[#687385] mb-6">
          The requested warranty ID does not exist or may have been deleted.
        </p>
        <Link
          to="/warranties"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#3157D5] rounded-lg hover:bg-[#2648B8] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to My Warranties</span>
        </Link>
      </div>
    );
  }

  const status = getWarrantyStatus(warranty.warrantyExpiryDate);
  const remainingDays = calculateRemainingDays(warranty.warrantyExpiryDate);

  const handleDelete = async () => {
    await deleteWarranty(warranty.id);
    navigate('/warranties');
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    showToast(`Copied ${fieldName} to clipboard.`, 'success');
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back link & Top Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/warranties"
          className="inline-flex items-center gap-2 text-xs font-medium text-[#687385] hover:text-[#202733] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to My Warranties</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Claim Assistant Trigger */}
          <button
            onClick={() => setIsClaimModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#3157D5] hover:bg-[#2648B8] rounded-lg transition-colors shadow-2xs"
            title="Prepare and export warranty claim dossier"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Prepare Claim Packet</span>
          </button>

          <Link
            to={`/assistant?productId=${warranty.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#3157D5] bg-[#EEF3FF] hover:bg-[#E0EBFF] rounded-lg border border-[#D5E2FF] transition-colors"
            title="Ask Assistant about this warranty terms"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Ask Assistant</span>
          </Link>

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#202733] bg-white hover:bg-[#F7F8FA] rounded-lg border border-[#E5E9EF] transition-colors shadow-2xs"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>

          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="p-1.5 text-[#687385] hover:text-[#C03935] hover:bg-[#FDECEC] rounded-lg transition-colors border border-transparent hover:border-[#F9D0CE]"
            title="Delete warranty"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Product Header Card */}
      <div className="p-6 bg-white rounded-xl border border-[#E5E9EF] shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E9EF] pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold text-[#687385] uppercase tracking-wider">
                {warranty.brand}
              </span>
              <span aria-hidden="true" className="text-[#687385]">·</span>
              <span className="text-xs text-[#687385]">{warranty.category}</span>
              <span aria-hidden="true" className="text-[#687385]">·</span>
              <span className="text-xs text-[#687385]">Sold by {warranty.seller}</span>
            </div>
            
            <h1 className="text-xl sm:text-2xl font-bold text-[#202733] tracking-tight">
              {warranty.productName}
            </h1>

            {warranty.notes && (
              <p className="text-xs text-[#687385] mt-2 italic">
                &ldquo;{warranty.notes}&rdquo;
              </p>
            )}
          </div>

          <div className="flex sm:flex-col sm:items-end justify-between shrink-0 gap-2">
            <StatusBadge status={status} size="md" />
            <div className="text-right">
              <div className="text-xs text-[#687385]">Remaining coverage</div>
              <div className={`text-sm font-bold tabular-nums ${
                remainingDays < 0 ? 'text-[#C03935]' : remainingDays <= 30 ? 'text-[#9A6700]' : 'text-[#18794E]'
              }`}>
                {formatRemainingTime(remainingDays)}
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics Strip with Click-to-Copy */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 text-xs">
          <div>
            <span className="text-[#687385] block mb-1">Purchase Date</span>
            <span className="font-semibold text-[#202733] tabular-nums">
              {formatDisplayDate(warranty.purchaseDate)}
            </span>
          </div>

          <div>
            <span className="text-[#687385] block mb-1">Purchase Price</span>
            <span className="font-semibold text-[#202733] tabular-nums">
              {formatCurrency(warranty.purchasePrice, warranty.currency)}
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[#687385]">Invoice Number</span>
              <button
                type="button"
                onClick={() => copyToClipboard(warranty.invoiceNumber, 'Invoice Number')}
                className="text-[#687385] hover:text-[#3157D5] p-0.5"
                title="Copy invoice number"
              >
                {copiedField === 'Invoice Number' ? <Check className="w-3 h-3 text-[#18794E]" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <span className="font-mono font-medium text-[#202733]">
              {warranty.invoiceNumber}
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[#687385]">Serial Number</span>
              {warranty.serialNumber && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(warranty.serialNumber || '', 'Serial Number')}
                  className="text-[#687385] hover:text-[#3157D5] p-0.5"
                  title="Copy serial number"
                >
                  {copiedField === 'Serial Number' ? <Check className="w-3 h-3 text-[#18794E]" /> : <Copy className="w-3 h-3" />}
                </button>
              )}
            </div>
            <span className="font-mono font-medium text-[#202733]">
              {warranty.serialNumber || 'Not specified'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Overview Details & Coverage Terms */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Coverage & Claim Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Coverage Summary */}
          <div className="p-6 bg-white rounded-xl border border-[#E5E9EF] shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E9EF] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#3157D5]" />
                <h2 className="text-sm font-semibold text-[#202733]">
                  Warranty Coverage & Terms
                </h2>
              </div>
              <span className="text-xs font-medium text-[#687385] tabular-nums">
                {warranty.warrantyDurationMonths} Months Duration
              </span>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-[#687385] uppercase tracking-wider mb-1.5">
                Included Protection
              </h3>
              <p className="text-xs text-[#202733] leading-relaxed">
                {warranty.coverageSummary || 'Standard manufacturer limited warranty covering original factory defects in materials and workmanship.'}
              </p>
            </div>

            {/* Exclusions */}
            <div>
              <h3 className="text-xs font-semibold text-[#687385] uppercase tracking-wider mb-2">
                Known Exclusions
              </h3>
              {warranty.exclusions && warranty.exclusions.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-[#687385]">
                  {warranty.exclusions.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-[#C03935] font-bold">✕</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[#687385] italic">
                  Not specified in the uploaded document. Check with retailer for explicit exclusion clauses.
                </p>
              )}
            </div>

            {/* Claim Requirements */}
            <div>
              <h3 className="text-xs font-semibold text-[#687385] uppercase tracking-wider mb-2">
                Claim Requirements & Process
              </h3>
              {warranty.claimRequirements && warranty.claimRequirements.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-[#202733]">
                  {warranty.claimRequirements.map((req, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#18794E] shrink-0 mt-0.5" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[#687385] italic">
                  Not specified in the uploaded document.
                </p>
              )}
            </div>

            {/* Official Source Excerpt */}
            {warranty.sourceWarrantyText && (
              <div className="p-3.5 rounded-lg bg-[#F7F8FA] border border-[#E5E9EF] text-xs space-y-1">
                <span className="text-[11px] font-semibold text-[#687385] block">
                  Document Excerpt Citation:
                </span>
                <p className="text-xs text-[#202733] italic">
                  &ldquo;{warranty.sourceWarrantyText}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Attached Documents */}
          <div className="p-6 bg-white rounded-xl border border-[#E5E9EF] shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E9EF] pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#3157D5]" />
                <h2 className="text-sm font-semibold text-[#202733]">
                  Attached Documents ({attachedDocs.length})
                </h2>
              </div>
              <Link
                to="/documents"
                className="text-xs text-[#3157D5] hover:underline"
              >
                All documents
              </Link>
            </div>

            {attachedDocs.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#687385]">
                No document files attached to this warranty record.
              </div>
            ) : (
              <div className="space-y-2">
                {attachedDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 rounded-lg border border-[#E5E9EF] hover:border-[#D5E2FF] bg-[#F7F8FA] flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Receipt className="w-5 h-5 text-[#3157D5] shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#202733] truncate">
                          {doc.fileName}
                        </div>
                        <div className="text-[11px] text-[#687385] flex items-center gap-2 mt-0.5">
                          <span>{doc.fileType}</span>
                          <span>·</span>
                          <span className="font-mono">{doc.fileSize}</span>
                          <span>·</span>
                          <span>Uploaded {formatDisplayDate(doc.uploadedAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setPreviewingDoc(doc)}
                        className="px-2.5 py-1 text-xs font-semibold text-[#3157D5] bg-white border border-[#D5E2FF] hover:bg-[#EEF3FF] rounded-md transition-colors shadow-2xs"
                      >
                        Preview
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Timeline & Support Contact */}
        <div className="space-y-6">
          {/* Timeline Card */}
          <div className="p-6 bg-white rounded-xl border border-[#E5E9EF] shadow-2xs space-y-4">
            <h2 className="text-sm font-semibold text-[#202733] border-b border-[#E5E9EF] pb-3">
              Warranty Timeline
            </h2>

            <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E5E9EF]">
              {/* Event 1: Purchase */}
              <div className="relative">
                <div className="absolute -left-[22px] top-0.5 w-3.5 h-3.5 rounded-full bg-[#18794E] border-2 border-white ring-2 ring-[#CDEED8]" />
                <div className="text-xs font-semibold text-[#202733]">
                  Product Purchased
                </div>
                <div className="text-[11px] text-[#687385] tabular-nums mt-0.5">
                  {formatDisplayDate(warranty.purchaseDate)}
                </div>
              </div>

              {/* Event 2: Warranty Start */}
              <div className="relative">
                <div className="absolute -left-[22px] top-0.5 w-3.5 h-3.5 rounded-full bg-[#3157D5] border-2 border-white ring-2 ring-[#D5E2FF]" />
                <div className="text-xs font-semibold text-[#202733]">
                  Warranty Registered
                </div>
                <div className="text-[11px] text-[#687385] tabular-nums mt-0.5">
                  {formatDisplayDate(warranty.warrantyStartDate)}
                </div>
              </div>

              {/* Event 3: 30-day reminder milestone */}
              <div className="relative">
                <div className={`absolute -left-[22px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                  remainingDays <= 30 ? 'bg-[#9A6700] ring-2 ring-[#FCE6A8]' : 'bg-[#E5E9EF]'
                }`} />
                <div className="text-xs font-semibold text-[#202733]">
                  30-Day Reminder
                </div>
                <div className="text-[11px] text-[#687385] mt-0.5">
                  {remainingDays <= 30 ? 'Dispatched' : 'Scheduled'}
                </div>
              </div>

              {/* Event 4: Expiration */}
              <div className="relative">
                <div className={`absolute -left-[22px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                  status === 'expired' 
                    ? 'bg-[#C03935] ring-2 ring-[#F9D0CE]' 
                    : 'bg-[#687385]'
                }`} />
                <div className="text-xs font-semibold text-[#202733]">
                  Warranty Expiry
                </div>
                <div className="text-[11px] text-[#687385] tabular-nums mt-0.5">
                  {formatDisplayDate(warranty.warrantyExpiryDate)}
                </div>
                <div className="text-[10px] text-[#9A6700] font-semibold mt-0.5">
                  {formatRemainingTime(remainingDays)}
                </div>
              </div>
            </div>
          </div>

          {/* Claim Contact Information */}
          <div className="p-6 bg-white rounded-xl border border-[#E5E9EF] shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E9EF] pb-3">
              <h2 className="text-sm font-semibold text-[#202733]">
                Official Claim Contact
              </h2>
              <button
                onClick={() => setIsClaimModalOpen(true)}
                className="text-xs text-[#3157D5] hover:underline font-semibold"
              >
                Claim Packet
              </button>
            </div>

            {warranty.claimContact ? (
              <div className="space-y-3 text-xs">
                {warranty.claimContact.phone && (
                  <div className="flex items-start gap-2.5">
                    <Phone className="w-4 h-4 text-[#687385] shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[#687385] block text-[11px]">Support Phone</span>
                      <a 
                        href={`tel:${warranty.claimContact.phone}`}
                        className="font-semibold text-[#3157D5] hover:underline"
                      >
                        {warranty.claimContact.phone}
                      </a>
                    </div>
                  </div>
                )}

                {warranty.claimContact.email && (
                  <div className="flex items-start gap-2.5">
                    <Mail className="w-4 h-4 text-[#687385] shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[#687385] block text-[11px]">Support Email</span>
                      <a 
                        href={`mailto:${warranty.claimContact.email}`}
                        className="font-medium text-[#202733] hover:underline break-all"
                      >
                        {warranty.claimContact.email}
                      </a>
                    </div>
                  </div>
                )}

                {warranty.claimContact.url && (
                  <div className="flex items-start gap-2.5">
                    <ExternalLink className="w-4 h-4 text-[#687385] shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[#687385] block text-[11px]">Support Portal</span>
                      <a 
                        href={warranty.claimContact.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#3157D5] hover:underline break-all"
                      >
                        {warranty.claimContact.url.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  </div>
                )}

                {warranty.claimContact.supportHours && (
                  <div className="flex items-start gap-2.5 pt-1">
                    <Clock className="w-4 h-4 text-[#687385] shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[#687385] block text-[11px]">Operating Hours</span>
                      <span className="text-[#202733]">{warranty.claimContact.supportHours}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-[#687385] italic">
                No direct contact details provided in the uploaded document.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Claim Packet Modal */}
      <ClaimPacketModal
        warranty={warranty}
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
      />

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Warranty"
          maxWidth="md"
        >
          <div className="space-y-4">
            <p className="text-xs text-[#C03935] leading-relaxed">
              Are you sure you want to permanently delete <strong>{warranty.productName}</strong>? All associated notifications and records will be removed.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E9EF]">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-[#687385] hover:text-[#202733]"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-medium text-white bg-[#C03935] hover:bg-[#a32f2b] rounded-lg transition-colors"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      <EditWarrantyModal
        warranty={warranty}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        document={previewingDoc}
        isOpen={!!previewingDoc}
        onClose={() => setPreviewingDoc(null)}
      />
    </div>
  );
};
