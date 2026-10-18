import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Upload, 
  Download, 
  Trash2, 
  Eye, 
  Filter, 
  Receipt, 
  CheckCircle2, 
  FolderArchive,
  AlertTriangle,
  Plus
} from 'lucide-react';
import { useWarranties } from '../context/WarrantyContext';
import { DocumentPreviewModal } from '../components/documents/DocumentPreviewModal';
import { Modal } from '../components/ui/Modal';
import { formatDisplayDate } from '../utils/dateUtils';
import { WarrantyDocument, DocumentType } from '../types';

export const DocumentsPage: React.FC = () => {
  const { documents, warranties, createDocument, deleteDocument } = useWarranties();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [previewingDoc, setPreviewingDoc] = useState<WarrantyDocument | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<WarrantyDocument | null>(null);

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [newDocFile, setNewDocFile] = useState<File | null>(null);
  const [newDocType, setNewDocType] = useState<DocumentType>('Invoice');
  const [associatedWarrantyId, setAssociatedWarrantyId] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // 1. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = doc.fileName.toLowerCase().includes(q);
        const matchProduct = doc.productName?.toLowerCase().includes(q);
        if (!matchName && !matchProduct) return false;
      }

      // 2. Type filter
      if (typeFilter !== 'all' && doc.fileType !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [documents, searchQuery, typeFilter]);

  const handleDownload = (doc: WarrantyDocument) => {
    const content = `WARRANTEASE DOCUMENT EXPORT\n==========================\nFile: ${doc.fileName}\nType: ${doc.fileType}\nUploaded: ${doc.uploadedAt}\nProduct: ${doc.productName || 'N/A'}\n\nCONTENT / EXTRACTED TEXT:\n--------------------------\n${doc.rawTextExcerpt || 'No raw text extract available.'}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = doc.fileName.replace(/\.pdf$/i, '.txt');
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleConfirmDelete = async () => {
    if (!deletingDoc) return;
    await deleteDocument(deletingDoc.id);
    setDeletingDoc(null);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    if (!newDocFile) {
      setUploadError('Please choose a file to upload.');
      return;
    }

    const matchedWarranty = warranties.find((w) => w.id === associatedWarrantyId);

    const fileSizeFormatted = newDocFile.size > 1024 * 1024
      ? `${(newDocFile.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(newDocFile.size / 1024)} KB`;

    await createDocument({
      fileName: newDocFile.name,
      fileType: newDocType,
      fileSize: fileSizeFormatted,
      warrantyId: associatedWarrantyId || undefined,
      productName: matchedWarranty?.productName || 'General Document',
      rawTextExcerpt: `DOCUMENT: ${newDocFile.name}\nType: ${newDocType}\nAttached to: ${matchedWarranty?.productName || 'Standalone'}\nAdded on: ${new Date().toISOString()}`,
    });

    setIsUploadModalOpen(false);
    setNewDocFile(null);
    setAssociatedWarrantyId('');
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Upload Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#202733]">
            Documents
          </h1>
          <p className="text-sm text-[#687385] mt-1">
            Centralized archive of purchase invoices, certificates, and receipts.
          </p>
        </div>

        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#3157D5] hover:bg-[#2648B8] rounded-lg transition-colors shadow-2xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.2]" />
          <span>Upload document</span>
        </button>
      </div>

      {/* Persistence Note Banner */}
      <div className="p-3.5 rounded-xl border border-[#E5E9EF] bg-white flex items-center justify-between text-xs text-[#687385] shadow-2xs">
        <div className="flex items-center gap-2.5">
          <FolderArchive className="w-4 h-4 text-[#3157D5] shrink-0" />
          <span>
            Document metadata & text excerpts are stored in your browser workspace. In production, binary files are uploaded to private AWS S3 buckets with encryption at rest.
          </span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E5E9EF] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#687385] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by file name or product..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#E5E9EF] focus:border-[#3157D5] focus:outline-hidden bg-[#F7F8FA] focus:bg-white transition-colors"
          />
        </div>

        {/* Type Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-0.5">
          {['all', 'Invoice', 'Warranty certificate', 'Receipt', 'Other'].map((type) => {
            const isSelected = typeFilter === type;
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'bg-[#EEF3FF] text-[#3157D5] font-semibold'
                    : 'text-[#687385] hover:text-[#202733] hover:bg-[#F7F8FA]'
                }`}
              >
                {type === 'all' ? 'All Types' : type}
              </button>
            );
          })}
        </div>
      </div>

      {/* Documents Table */}
      {filteredDocuments.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E9EF] p-12 text-center shadow-2xs">
          <FileText className="w-10 h-10 text-[#687385] mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-[#202733] mb-1">
            No documents found
          </h3>
          <p className="text-xs text-[#687385] max-w-sm mx-auto mb-4">
            No files matched your search or selected document type.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setTypeFilter('all');
            }}
            className="px-3 py-1.5 text-xs font-medium text-[#3157D5] hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E5E9EF] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E9EF] bg-[#F7F8FA] text-[11px] font-semibold text-[#687385] uppercase tracking-wider">
                  <th className="py-3 px-5">Document Name</th>
                  <th className="py-3 px-4">Associated Product</th>
                  <th className="py-3 px-4">Document Type</th>
                  <th className="py-3 px-4">Upload Date</th>
                  <th className="py-3 px-4">File Size</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E9EF] text-xs">
                {filteredDocuments.map((doc) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-[#F7F8FA] transition-colors group cursor-pointer"
                    onClick={() => setPreviewingDoc(doc)}
                  >
                    <td className="py-3 px-5 font-medium text-[#202733]">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-[#3157D5] shrink-0" />
                        <span className="truncate max-w-xs group-hover:text-[#3157D5] transition-colors">
                          {doc.fileName}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-[#687385]">
                      <span className="truncate max-w-xs block font-normal text-[#202733]">
                        {doc.productName || 'Unassigned'}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-xs text-[#202733] font-medium bg-[#F7F8FA] px-2 py-0.5 rounded border border-[#E5E9EF]">
                        {doc.fileType}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-[#687385] tabular-nums">
                      {formatDisplayDate(doc.uploadedAt)}
                    </td>

                    <td className="py-3 px-4 font-mono text-[#687385]">
                      {doc.fileSize}
                    </td>

                    <td className="py-3 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setPreviewingDoc(doc)}
                          className="p-1.5 rounded-md text-[#687385] hover:text-[#3157D5] hover:bg-[#EEF3FF] transition-colors"
                          title="Preview document text"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(doc)}
                          className="p-1.5 rounded-md text-[#687385] hover:text-[#202733] hover:bg-[#E5E9EF] transition-colors"
                          title="Download document copy"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingDoc(doc)}
                          className="p-1.5 rounded-md text-[#687385] hover:text-[#C03935] hover:bg-[#FDECEC] transition-colors"
                          title="Delete document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {isUploadModalOpen && (
        <Modal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          title="Upload Document"
          description="Attach an invoice, receipt, or warranty certificate to your workspace."
          maxWidth="md"
        >
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            {uploadError && (
              <div className="p-3 rounded-lg bg-[#FDECEC] border border-[#F9D0CE] text-xs text-[#C03935]">
                {uploadError}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#202733] mb-1">
                Select File (.pdf, .png, .jpg) <span className="text-[#C03935]">*</span>
              </label>
              <input
                type="file"
                required
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setNewDocFile(e.target.files ? e.target.files[0] : null)}
                className="w-full text-xs text-[#202733] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#EEF3FF] file:text-[#3157D5] hover:file:bg-[#D5E2FF] cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#202733] mb-1">
                Document Type
              </label>
              <select
                value={newDocType}
                onChange={(e) => setNewDocType(e.target.value as DocumentType)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E9EF] bg-white text-[#202733] focus:border-[#3157D5] focus:outline-hidden"
              >
                <option value="Invoice">Invoice</option>
                <option value="Warranty certificate">Warranty certificate</option>
                <option value="Receipt">Receipt</option>
                <option value="Other">Other supporting document</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#202733] mb-1">
                Associated Registered Product <span className="text-[#687385] font-normal">(optional)</span>
              </label>
              <select
                value={associatedWarrantyId}
                onChange={(e) => setAssociatedWarrantyId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E9EF] bg-white text-[#202733] focus:border-[#3157D5] focus:outline-hidden"
              >
                <option value="">Unassigned (General Document)</option>
                {warranties.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.productName} ({w.brand})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E9EF]">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-[#687385] hover:text-[#202733]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#3157D5] hover:bg-[#2648B8] rounded-lg transition-colors shadow-2xs"
              >
                Save document
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Document Modal */}
      {deletingDoc && (
        <Modal
          isOpen={!!deletingDoc}
          onClose={() => setDeletingDoc(null)}
          title="Delete Document"
          maxWidth="md"
        >
          <div className="space-y-4">
            <p className="text-xs text-[#C03935] leading-relaxed">
              Are you sure you want to delete <strong>{deletingDoc.fileName}</strong>? This action will remove the document reference from your workspace.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E9EF]">
              <button
                onClick={() => setDeletingDoc(null)}
                className="px-4 py-2 text-xs font-medium text-[#687385] hover:text-[#202733]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-medium text-white bg-[#C03935] hover:bg-[#a32f2b] rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        document={previewingDoc}
        isOpen={!!previewingDoc}
        onClose={() => setPreviewingDoc(null)}
      />
    </div>
  );
};
