import React from 'react';
import { Modal } from '../ui/Modal';
import { WarrantyDocument } from '../../types';
import { FileText, Download, CheckCircle, Shield, Calendar, HardDrive } from 'lucide-react';
import { formatDisplayDate } from '../../utils/dateUtils';

interface DocumentPreviewModalProps {
  document: WarrantyDocument | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document,
  isOpen,
  onClose,
}) => {
  if (!document) return null;

  const handleDownload = () => {
    // Create text blob for download demonstration
    const content = `WARRANTYEASE DOCUMENT EXPORT\n==========================\nFile: ${document.fileName}\nType: ${document.fileType}\nUploaded: ${document.uploadedAt}\nProduct: ${document.productName || 'N/A'}\n\nCONTENT / EXTRACTED TEXT:\n--------------------------\n${document.rawTextExcerpt || 'No raw text extract available.'}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = document.fileName.replace(/\.pdf$/i, '.txt');
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={document.fileName}
      description={`Stored ${document.fileType.toLowerCase()} attached to ${document.productName || 'warranty record'}`}
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Document Metadata Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg border border-[#E5E9EF] bg-[#F7F8FA] text-xs">
          <div>
            <span className="text-[#687385] block mb-0.5">Document Type</span>
            <span className="font-semibold text-[#202733]">{document.fileType}</span>
          </div>
          <div>
            <span className="text-[#687385] block mb-0.5">Date Added</span>
            <span className="font-medium text-[#202733] tabular-nums">
              {formatDisplayDate(document.uploadedAt)}
            </span>
          </div>
          <div>
            <span className="text-[#687385] block mb-0.5">File Size</span>
            <span className="font-mono text-[#202733]">{document.fileSize}</span>
          </div>
          <div>
            <span className="text-[#687385] block mb-0.5">Status</span>
            <span className="text-[#18794E] font-medium inline-flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Verified
            </span>
          </div>
        </div>

        {/* Document Simulation Viewer */}
        <div className="rounded-xl border border-[#E5E9EF] bg-white overflow-hidden shadow-2xs">
          <div className="px-4 py-2.5 bg-[#F7F8FA] border-b border-[#E5E9EF] flex items-center justify-between text-xs text-[#687385]">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#3157D5]" />
              <span className="font-mono text-[11px] text-[#202733]">{document.fileName}</span>
            </div>
            <span className="text-[11px] bg-white px-2 py-0.5 rounded border border-[#E5E9EF]">
              OCR Text Layer Preview
            </span>
          </div>

          <div className="p-6 bg-[#FCFDFE] min-h-[220px] max-h-[340px] overflow-y-auto">
            {document.rawTextExcerpt ? (
              <pre className="font-mono text-xs text-[#202733] whitespace-pre-wrap leading-relaxed select-text">
                {document.rawTextExcerpt}
              </pre>
            ) : (
              <div className="text-center py-10 text-xs text-[#687385]">
                Binary document file uploaded ({document.fileSize}). Extracted text preview will be generated upon backend processing.
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-[#E5E9EF]">
          <span className="text-[11px] text-[#687385]">
            Document stored in local demo sandbox
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#202733] bg-[#F7F8FA] hover:bg-[#E5E9EF] rounded-lg transition-colors border border-[#E5E9EF]"
            >
              <Download className="w-3.5 h-3.5" />
              Download copy
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-[#3157D5] hover:bg-[#2648B8] rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
