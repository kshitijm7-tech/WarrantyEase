import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Warranty } from '../../types';
import { 
  CheckCircle2, 
  Copy, 
  Check, 
  Download, 
  FileText, 
  Phone, 
  Mail, 
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { formatDisplayDate } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/warrantyUtils';
import { useWarranties } from '../../context/WarrantyContext';

interface ClaimPacketModalProps {
  warranty: Warranty | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ClaimPacketModal: React.FC<ClaimPacketModalProps> = ({
  warranty,
  isOpen,
  onClose,
}) => {
  const { showToast } = useWarranties();
  const [issueDescription, setIssueDescription] = useState('Hardware component malfunction under normal operating conditions.');
  const [copied, setCopied] = useState(false);

  // Readiness Checklist State
  const [hasInvoice, setHasInvoice] = useState(true);
  const [hasSerialNumber, setHasSerialNumber] = useState(true);
  const [hasPhotos, setHasPhotos] = useState(false);
  const [hasPackedUnit, setHasPackedUnit] = useState(false);

  if (!warranty) return null;

  const checklistItems = [
    { id: 'inv', label: 'Proof of purchase invoice verified on file', state: hasInvoice, setter: setHasInvoice },
    { id: 'sn', label: `Chassis serial number verified (${warranty.serialNumber || 'Required'})`, state: hasSerialNumber, setter: setHasSerialNumber },
    { id: 'photo', label: 'Photographs of defect / damage captured', state: hasPhotos, setter: setHasPhotos },
    { id: 'pack', label: 'Unit and accessories ready for transit packaging', state: hasPackedUnit, setter: setHasPackedUnit },
  ];

  const readyCount = checklistItems.filter((i) => i.state).length;

  const claimEmailDraft = `Subject: Warranty Service Claim Request — ${warranty.productName} (Invoice: ${warranty.invoiceNumber})

Dear ${warranty.brand} Customer Support,

I am writing to formally request warranty evaluation and service for my ${warranty.productName}.

PRODUCT & PURCHASE RECORD:
---------------------------------------------
Product: ${warranty.productName}
Brand: ${warranty.brand}
Retailer / Seller: ${warranty.seller}
Invoice / Order Number: ${warranty.invoiceNumber}
Purchase Date: ${formatDisplayDate(warranty.purchaseDate)}
Original Price Paid: ${formatCurrency(warranty.purchasePrice, warranty.currency)}
Serial Number: ${warranty.serialNumber || 'Provided upon request'}
Warranty Expiration Date: ${formatDisplayDate(warranty.warrantyExpiryDate)}

REPORTED ISSUE / DEFECT:
---------------------------------------------
${issueDescription}

ATTACHMENTS ON FILE:
---------------------------------------------
- Original Store Purchase Invoice (${warranty.invoiceNumber})
- Photographs and diagnostics available upon request

Please advise on the next steps for RMA authorization, drop-off location, or pre-paid mail-in courier dispatch.

Thank you,
Registered Account Owner
Reference: WarrantyEase Dossier #${warranty.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(claimEmailDraft);
    setCopied(true);
    showToast('Claim draft copied to clipboard.', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadPacket = () => {
    const blob = new Blob([claimEmailDraft], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Warranty_Claim_Packet_${warranty.brand}_${warranty.invoiceNumber}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Downloaded claim packet text.', 'success');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Warranty Claim Assistant & Packet Generator"
      description="Prepare and export a verified claim dossier for the manufacturer or retailer."
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Readiness Score Strip */}
        <div className="p-4 rounded-xl border border-[#E5E9EF] bg-[#F7F8FA] space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#202733] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#3157D5]" />
              Claim Readiness Checklist
            </span>
            <span className="font-semibold tabular-nums text-[#3157D5]">
              {readyCount} of {checklistItems.length} steps completed
            </span>
          </div>

          <div className="w-full bg-[#E5E9EF] h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-[#3157D5] h-full transition-all duration-300"
              style={{ width: `${(readyCount / checklistItems.length) * 100}%` }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
            {checklistItems.map((item) => (
              <label 
                key={item.id} 
                className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-[#E5E9EF] hover:border-[#D5E2FF] transition-colors cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={item.state}
                  onChange={(e) => item.setter(e.target.checked)}
                  className="w-4 h-4 text-[#3157D5] rounded border-[#E5E9EF] focus:ring-[#3157D5]"
                />
                <span className={`text-[11px] leading-tight ${item.state ? 'text-[#202733] font-medium' : 'text-[#687385]'}`}>
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Issue Description Field */}
        <div>
          <label className="block text-xs font-semibold text-[#202733] mb-1">
            Describe the Defect or Malfunction
          </label>
          <textarea
            rows={3}
            value={issueDescription}
            onChange={(e) => setIssueDescription(e.target.value)}
            placeholder="e.g. Left audio driver has persistent static; device fails to power on when connected to certified adapter..."
            className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E9EF] focus:border-[#3157D5] focus:outline-hidden"
          />
          <p className="text-[11px] text-[#687385] mt-1">
            This will be formatted into your official support email draft below.
          </p>
        </div>

        {/* Generated Email Draft Preview */}
        <div className="rounded-xl border border-[#E5E9EF] bg-white overflow-hidden shadow-2xs">
          <div className="px-4 py-2.5 bg-[#F7F8FA] border-b border-[#E5E9EF] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-[#687385]">
              <FileText className="w-4 h-4 text-[#3157D5]" />
              <span className="font-semibold text-[#202733]">Generated Claim Email Draft</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-[#3157D5] bg-white border border-[#D5E2FF] hover:bg-[#EEF3FF] rounded-md transition-colors shadow-2xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#18794E]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy draft'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPacket}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-[#202733] bg-white border border-[#E5E9EF] hover:bg-[#F7F8FA] rounded-md transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download dossier</span>
              </button>
            </div>
          </div>

          <div className="p-4 bg-[#FCFDFE] max-h-52 overflow-y-auto font-mono text-[11px] text-[#202733] whitespace-pre-wrap leading-relaxed select-text border-t border-[#E5E9EF]">
            {claimEmailDraft}
          </div>
        </div>

        {/* Contact Links */}
        {warranty.claimContact && (
          <div className="p-3.5 rounded-lg border border-[#E5E9EF] bg-[#F7F8FA] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[#687385]">
              <Mail className="w-4 h-4 text-[#3157D5]" />
              <span>Send directly to:</span>
              <strong className="text-[#202733]">{warranty.claimContact.email || 'Authorized service desk'}</strong>
            </div>

            <div className="flex items-center gap-3">
              {warranty.claimContact.phone && (
                <a
                  href={`tel:${warranty.claimContact.phone}`}
                  className="inline-flex items-center gap-1 text-[#3157D5] hover:underline font-semibold"
                >
                  <Phone className="w-3 h-3" />
                  <span>Call {warranty.claimContact.phone}</span>
                </a>
              )}
              {warranty.claimContact.url && (
                <a
                  href={warranty.claimContact.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[#3157D5] hover:underline font-semibold"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Online Portal</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E9EF]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#687385] hover:text-[#202733]"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
