import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, 
  FileText, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  AlertCircle, 
  X, 
  Sparkles,
  FileCheck2,
  Loader2,
  Watch,
  Laptop,
  Wind
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useWarranties } from '../../context/WarrantyContext';
import { api } from '../../services/api';
import { SAMPLE_EXTRACTED_INVOICE } from '../../data/demoData';
import { addMonthsToDate, formatDisplayDate } from '../../utils/dateUtils';
import { WarrantyCategory } from '../../types';

interface AddInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: WarrantyCategory[] = [
  'Electronics',
  'Appliances',
  'Audio & Sound',
  'Computing',
  'Smart Home',
  'Personal Care',
  'Photography',
  'Other',
];

const SAMPLE_PRESETS = [
  {
    id: 'samsung',
    title: 'Samsung Galaxy Watch 6',
    brand: 'Samsung',
    category: 'Electronics' as const,
    seller: 'Amazon',
    invoiceNumber: 'INV-AMZ-994102-SAM',
    price: 379.99,
    duration: 24,
    date: '2026-09-10',
    fileName: 'Amazon_Invoice_GalaxyWatch6.pdf',
    icon: Watch,
  },
  {
    id: 'apple',
    title: 'MacBook Pro 14" M3 Pro',
    brand: 'Apple',
    category: 'Computing' as const,
    seller: 'Apple Store',
    invoiceNumber: 'INV-APL-882019',
    price: 1999.00,
    duration: 36,
    date: '2026-08-20',
    fileName: 'AppleStore_Receipt_MBP14.pdf',
    icon: Laptop,
  },
  {
    id: 'dyson',
    title: 'Dyson Purifier Hot+Cool HP07',
    brand: 'Dyson',
    category: 'Appliances' as const,
    seller: 'Best Buy',
    invoiceNumber: 'INV-BB-4491029',
    price: 649.99,
    duration: 24,
    date: '2026-07-15',
    fileName: 'BestBuy_Invoice_DysonHP07.pdf',
    icon: Wind,
  },
];

export const AddInvoiceModal: React.FC<AddInvoiceModalProps> = ({ isOpen, onClose }) => {
  const { createWarranty, createDocument } = useWarranties();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activePresetId, setActivePresetId] = useState<string>('samsung');
  const [sampleFileName, setSampleFileName] = useState<string>('');
  
  // Simulated Scanning Animation State
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanMessage, setScanMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [productName, setProductName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<WarrantyCategory>('Electronics');
  const [seller, setSeller] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('2026-09-10');
  const [purchasePrice, setPurchasePrice] = useState<number>(379.99);
  const [currency, setCurrency] = useState('USD');
  const [warrantyDurationMonths, setWarrantyDurationMonths] = useState<number>(24);
  const [warrantyStartDate, setWarrantyStartDate] = useState('2026-09-10');
  const [warrantyExpiryDate, setWarrantyExpiryDate] = useState('2028-09-10');
  const [isExpiryManuallyEdited, setIsExpiryManuallyEdited] = useState(false);
  const [serialNumber, setSerialNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [coverageSummary, setCoverageSummary] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedFile(null);
      setSampleFileName('');
      setErrorMessage(null);
      setIsScanning(false);
      setScanProgress(0);
      setIsExpiryManuallyEdited(false);
    }
  }, [isOpen]);

  // Recalculate expiry date if start date or duration changes, UNLESS manually edited
  useEffect(() => {
    if (!isExpiryManuallyEdited && warrantyStartDate && warrantyDurationMonths) {
      const calculated = addMonthsToDate(warrantyStartDate, warrantyDurationMonths);
      setWarrantyExpiryDate(calculated);
    }
  }, [warrantyStartDate, warrantyDurationMonths, isExpiryManuallyEdited]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validExtensions = ['pdf', 'png', 'jpg', 'jpeg'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!validExtensions.includes(ext)) {
      setErrorMessage(`Unsupported format (.${ext}). Please upload a PDF, PNG, or JPG file.`);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 10 MB maximum demo limit.');
      return;
    }
    setSelectedFile(file);
    setSampleFileName('');
    setErrorMessage(null);
  };

  const runScanningSimulation = (callback: () => void) => {
    setIsScanning(true);
    setScanProgress(15);
    setScanMessage('Parsing invoice document structure...');

    setTimeout(() => {
      setScanProgress(55);
      setScanMessage('Extracting retailer, invoice number, and dates...');
    }, 220);

    setTimeout(() => {
      setScanProgress(90);
      setScanMessage('Validating warranty duration and serial identifiers...');
    }, 450);

    setTimeout(() => {
      setScanProgress(100);
      setIsScanning(false);
      callback();
    }, 650);
  };

  const handleSelectPreset = (preset: typeof SAMPLE_PRESETS[0]) => {
    setSelectedFile(null);
    setActivePresetId(preset.id);
    setSampleFileName(preset.fileName);
    setErrorMessage(null);

    runScanningSimulation(() => {
      setProductName(preset.title);
      setBrand(preset.brand);
      setCategory(preset.category);
      setSeller(preset.seller);
      setInvoiceNumber(preset.invoiceNumber);
      setPurchaseDate(preset.date);
      setPurchasePrice(preset.price);
      setCurrency('USD');
      setWarrantyDurationMonths(preset.duration);
      setWarrantyStartDate(preset.date);
      setWarrantyExpiryDate(addMonthsToDate(preset.date, preset.duration));
      setSerialNumber(`SN-${Math.floor(1000000 + Math.random() * 9000000)}`);
      setNotes(`Demo extraction from ${preset.fileName}`);
      setCoverageSummary(`${preset.brand} limited manufacturer parts and labor warranty.`);
      setIsExpiryManuallyEdited(false);
      setStep(2);
    });
  };

  const handleProcessUploadedFile = async () => {
    if (!selectedFile && !sampleFileName) {
      setErrorMessage('Please upload a file or choose one of the quick sample presets below.');
      return;
    }

    if (sampleFileName) {
      setStep(2);
      return;
    }

    if (selectedFile) {
      runScanningSimulation(async () => {
        try {
          const extracted = await api.uploadInvoice(selectedFile);
          setProductName(extracted.productName);
          setBrand(extracted.brand);
          setCategory(extracted.category);
          setSeller(extracted.seller);
          setInvoiceNumber(extracted.invoiceNumber);
          setPurchaseDate(extracted.purchaseDate);
          setPurchasePrice(extracted.purchasePrice);
          setCurrency(extracted.currency);
          setWarrantyDurationMonths(extracted.warrantyDurationMonths);
          setWarrantyStartDate(extracted.warrantyStartDate);
          setWarrantyExpiryDate(extracted.warrantyExpiryDate);
          setSerialNumber(extracted.serialNumber || '');
          setNotes(extracted.notes || '');
          setCoverageSummary(SAMPLE_EXTRACTED_INVOICE.coverageSummary);
          setIsExpiryManuallyEdited(false);
          setStep(2);
        } catch (err: any) {
          setErrorMessage(err.message || 'Error processing document.');
        }
      });
    }
  };

  const handleSaveWarranty = async () => {
    if (!productName.trim() || !brand.trim() || !seller.trim() || !invoiceNumber.trim()) {
      setErrorMessage('Please fill in required product, brand, seller, and invoice fields.');
      setStep(2);
      return;
    }

    try {
      const activeDocName = selectedFile ? selectedFile.name : (sampleFileName || 'Invoice_Document.pdf');
      const activeDocSize = selectedFile 
        ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` 
        : '1.4 MB';

      // 1. Create document record
      const createdDoc = await createDocument({
        fileName: activeDocName,
        fileType: 'Invoice',
        fileSize: activeDocSize,
        productName: productName.trim(),
        isSample: !selectedFile,
        rawTextExcerpt: `INVOICE / RECEIPT: ${productName}\nBrand: ${brand}\nInvoice #: ${invoiceNumber}\nSeller: ${seller}\nPurchase Date: ${purchaseDate}\nPrice: ${purchasePrice} ${currency}\nWarranty Expiry: ${warrantyExpiryDate}`,
      });

      // 2. Create warranty record
      const created = await createWarranty({
        userId: 'user-demo-1',
        productName: productName.trim(),
        brand: brand.trim(),
        category,
        seller: seller.trim(),
        invoiceNumber: invoiceNumber.trim(),
        purchaseDate,
        purchasePrice: Number(purchasePrice) || 0,
        currency,
        warrantyStartDate,
        warrantyDurationMonths: Number(warrantyDurationMonths) || 12,
        warrantyExpiryDate,
        serialNumber: serialNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        coverageSummary: coverageSummary || `${brand} manufacturer limited parts & labor warranty.`,
        exclusions: [
          'Damage from unauthorized repairs or disassembly',
          'Accidental drops or liquid ingress (unless specified in extended coverage)',
          'Cosmetic wear from everyday usage',
        ],
        claimRequirements: [
          `Original invoice (${invoiceNumber})`,
          'Verification of product serial number',
          'Contact authorized manufacturer service center prior to dispatch',
        ],
        claimContact: {
          phone: '1-800-555-0199',
          email: `support@${brand.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
          url: `https://${brand.toLowerCase().replace(/[^a-z0-9]/g, '')}.com/support`,
          supportHours: 'Mon-Fri 9:00 AM - 6:00 PM',
        },
        documentIds: [createdDoc.id],
      });

      onClose();
      navigate(`/warranties/${created.id}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save warranty.');
    }
  };

  const activeDocName = selectedFile ? selectedFile.name : sampleFileName;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Invoice & Warranty"
      description="Register purchase documents, extract warranty conditions, and track expiry reminders."
      maxWidth="2xl"
    >
      {/* Step Indicator */}
      <div className="mb-6 flex items-center justify-between border-b border-[#E5E9EF] pb-4">
        {[
          { num: 1, label: 'Upload document' },
          { num: 2, label: 'Review details' },
          { num: 3, label: 'Save warranty' },
        ].map((s) => {
          const isActive = step === s.num;
          const isDone = step > s.num;
          return (
            <div key={s.num} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  isActive
                    ? 'bg-[#3157D5] text-white'
                    : isDone
                    ? 'bg-[#EAF7EF] text-[#18794E]'
                    : 'bg-[#F7F8FA] text-[#687385] border border-[#E5E9EF]'
                }`}
              >
                {isDone ? <Check className="w-3.5 h-3.5" /> : s.num}
              </div>
              <span
                className={`text-xs font-medium ${
                  isActive ? 'text-[#202733]' : 'text-[#687385]'
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 rounded-lg bg-[#FDECEC] border border-[#F9D0CE] flex items-start gap-2.5 text-xs text-[#C03935]">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMessage}</div>
          <button onClick={() => setErrorMessage(null)} className="p-0.5">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* STEP 1: Upload Document */}
      {step === 1 && (
        <div className="space-y-5">
          {/* Scanning Progress Overlay if scanning */}
          {isScanning ? (
            <div className="border border-[#D5E2FF] bg-[#EEF3FF]/40 rounded-xl p-10 text-center space-y-4 animate-in fade-in">
              <Loader2 className="w-8 h-8 text-[#3157D5] animate-spin mx-auto" />
              <div>
                <h4 className="text-sm font-semibold text-[#202733] mb-1">
                  Scanning Document...
                </h4>
                <p className="text-xs text-[#687385]">{scanMessage}</p>
              </div>

              <div className="w-full max-w-xs mx-auto bg-[#E5E9EF] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-[#3157D5] h-full transition-all duration-300"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    validateAndSetFile(e.dataTransfer.files[0]);
                  }
                }}
                className={`border-2 border-dashed rounded-xl p-7 text-center transition-colors ${
                  selectedFile || sampleFileName
                    ? 'border-[#3157D5] bg-[#EEF3FF]/30'
                    : 'border-[#E5E9EF] hover:border-[#3157D5] bg-white'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-[#EEF3FF] text-[#3157D5] mx-auto flex items-center justify-center mb-3">
                  <Upload className="w-5 h-5 stroke-[1.8]" />
                </div>

                <div className="text-sm font-semibold text-[#202733] mb-1">
                  Drag and drop your invoice or receipt
                </div>
                <p className="text-xs text-[#687385] max-w-sm mx-auto mb-4">
                  Supports PDF, PNG, or JPG files (up to 10 MB). Key warranty fields are extracted for your review.
                </p>

                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-[#E5E9EF] text-xs font-medium text-[#202733] hover:bg-[#F7F8FA] cursor-pointer shadow-2xs transition-colors">
                  <span>Browse local files</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileChange}
                  />
                </label>
              </div>

              {/* Selected File Card */}
              {selectedFile && (
                <div className="p-3.5 rounded-lg border border-[#E5E9EF] bg-[#F7F8FA] flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-5 h-5 text-[#3157D5] shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#202733] truncate">
                        {selectedFile.name}
                      </div>
                      <div className="text-[11px] text-[#687385]">
                        {(selectedFile.size / 1024).toFixed(0)} KB · Ready to scan
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-xs text-[#C03935] hover:underline px-2 py-1"
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* Interactive Demo Presets Picker */}
              <div className="pt-2 border-t border-[#E5E9EF] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#202733] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#3157D5]" />
                    Try with interactive sample documents:
                  </span>
                  <span className="text-[11px] text-[#687385]">1-click simulation</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {SAMPLE_PRESETS.map((preset) => {
                    const Icon = preset.icon;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className="p-3 rounded-lg border border-[#E5E9EF] hover:border-[#3157D5] hover:bg-[#EEF3FF]/40 bg-white transition-all text-left group"
                      >
                        <div className="flex items-center gap-2 mb-1.5 text-[#3157D5]">
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#687385] group-hover:text-[#3157D5]">
                            {preset.brand}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-[#202733] truncate">
                          {preset.title}
                        </div>
                        <div className="text-[11px] text-[#687385] mt-1 tabular-nums">
                          ${preset.price} · {preset.duration} mo
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E9EF]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-[#687385] hover:text-[#202733]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedFile && !sampleFileName}
                  onClick={handleProcessUploadedFile}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#3157D5] rounded-lg hover:bg-[#2648B8] disabled:opacity-50 transition-colors shadow-2xs"
                >
                  <span>Continue to review</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* STEP 2: Review Extracted Details */}
      {step === 2 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setStep(3);
          }}
          className="space-y-4"
        >
          {/* Extraction Banner */}
          <div className="p-3 rounded-lg border border-[#D5E2FF] bg-[#EEF3FF] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-[#3157D5]" />
              <span className="text-[#202733] font-medium truncate">
                Extracted from: <span className="font-semibold">{activeDocName || 'Invoice'}</span>
              </span>
            </div>
            <span className="text-[11px] text-[#18794E] font-semibold bg-[#EAF7EF] px-2 py-0.5 rounded border border-[#CDEED8]">
              98% OCR Match
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-[#202733] mb-1">
                Product Name <span className="text-[#C03935]">*</span>
              </label>
              <input
                type="text"
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E9EF] focus:border-[#3157D5] focus:outline-hidden"
                placeholder="e.g. Sony WH-1000XM5"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#202733] mb-1">
                Brand / Manufacturer <span className="text-[#C03935]">*</span>
              </label>
              <input
                type="text"
                required
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E9EF] focus:border-[#3157D5] focus:outline-hidden"
                placeholder="e.g. Sony"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#202733] mb-1">
                Category <span className="text-[#C03935]">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as WarrantyCategory)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E9EF] focus:border-[#3157D5] focus:outline-hidden bg-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#202733] mb-1">
                Seller or Retailer <span className="text-[#C03935]">*</span>
              </label>
              <input
                type="text"
                required
                value={seller}
                onChange={(e) => setSeller(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E9EF] focus:border-[#3157D5] focus:outline-hidden"
                placeholder="e.g. Best Buy, Amazon, Apple Store"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#202733] mb-1">
                Invoice / Order Number <span className="text-[#C03935]">*</span>
              </label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E9EF] focus:border-[#3157D5] focus:outline-hidden font-mono"
                placeholder="INV-991823"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#202733] mb-1">
                Purchase Date <span className="text-[#C03935]">*</span>
              </label>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => {
                  setPurchaseDate(e.target.value);
                  if (!isExpiryManuallyEdited) {
                    setWarrantyStartDate(e.target.value);
                  }
                }}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E9EF] focus:border-[#3157D5] focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-[#202733] mb-1">
                  Price Paid
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E9EF] focus:border-[#3157D5] focus:outline-hidden tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#202733] mb-1">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E9EF] focus:border-[#3157D5] focus:outline-hidden bg-white"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="AUD">AUD ($)</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-[#202733]">
                  Duration
                </label>
                <div className="flex items-center gap-1">
                  {[12, 24, 36].map((months) => (
                    <button
                      key={months}
                      type="button"
                      onClick={() => setWarrantyDurationMonths(months)}
                      className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                        warrantyDurationMonths === months
                          ? 'bg-[#3157D5] text-white border-[#3157D5]'
                          : 'bg-[#F7F8FA] text-[#687385] border-[#E5E9EF] hover:border-[#3157D5]'
                      }`}
                    >
                      {months}m
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="number"
                min="1"
                max="120"
                value={warrantyDurationMonths}
                onChange={(e) => setWarrantyDurationMonths(parseInt(e.target.value, 10) || 12)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E9EF] focus:border-[#3157D5] focus:outline-hidden tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#202733] mb-1">
                Warranty Start Date
              </label>
              <input
                type="date"
                value={warrantyStartDate}
                onChange={(e) => setWarrantyStartDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E9EF] focus:border-[#3157D5] focus:outline-hidden"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-[#202733]">
                  Warranty Expiry Date <span className="text-[#C03935]">*</span>
                </label>
                {isExpiryManuallyEdited && (
                  <span className="text-[10px] text-[#9A6700]">Custom override</span>
                )}
              </div>
              <input
                type="date"
                required
                value={warrantyExpiryDate}
                onChange={(e) => {
                  setWarrantyExpiryDate(e.target.value);
                  setIsExpiryManuallyEdited(true);
                }}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E9EF] focus:border-[#3157D5] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#202733] mb-1">
                Serial Number <span className="text-[#687385] font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E9EF] focus:border-[#3157D5] focus:outline-hidden font-mono"
                placeholder="e.g. SN-88401928"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#202733] mb-1">
                Internal Notes <span className="text-[#687385] font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E9EF] focus:border-[#3157D5] focus:outline-hidden"
                placeholder="e.g. Bought with extended Care plan"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#E5E9EF]">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#687385] hover:text-[#202733]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to document
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#3157D5] rounded-lg hover:bg-[#2648B8] transition-colors shadow-2xs"
            >
              Continue to summary
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: Save Warranty Summary */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="p-4 rounded-xl border border-[#E5E9EF] bg-[#F7F8FA] space-y-3">
            <div className="flex items-start justify-between border-b border-[#E5E9EF] pb-3">
              <div>
                <span className="text-xs font-semibold text-[#687385] uppercase tracking-wider">
                  Product Overview
                </span>
                <h3 className="text-base font-bold text-[#202733] mt-0.5">
                  {productName}
                </h3>
                <div className="flex items-center gap-2 text-xs text-[#687385] mt-1">
                  <span>{brand}</span>
                  <span>·</span>
                  <span>{category}</span>
                  <span>·</span>
                  <span>Sold by {seller}</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-bold text-[#202733] tabular-nums">
                  ${purchasePrice.toFixed(2)} {currency}
                </div>
                <div className="text-[11px] text-[#687385]">
                  Invoice: {invoiceNumber}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div>
                <span className="text-[#687385] block mb-0.5">Purchase Date</span>
                <span className="font-medium text-[#202733]">
                  {formatDisplayDate(purchaseDate)}
                </span>
              </div>
              <div>
                <span className="text-[#687385] block mb-0.5">Warranty Expiry</span>
                <span className="font-semibold text-[#3157D5]">
                  {formatDisplayDate(warrantyExpiryDate)}
                </span>
              </div>
              <div>
                <span className="text-[#687385] block mb-0.5">Duration</span>
                <span className="font-medium text-[#202733]">
                  {warrantyDurationMonths} Months
                </span>
              </div>
              <div>
                <span className="text-[#687385] block mb-0.5">Serial Number</span>
                <span className="font-mono text-[#202733]">
                  {serialNumber || 'None specified'}
                </span>
              </div>
              <div>
                <span className="text-[#687385] block mb-0.5">Attached File</span>
                <span className="font-medium text-[#202733] truncate block">
                  {activeDocName || 'Invoice.pdf'}
                </span>
              </div>
              <div>
                <span className="text-[#687385] block mb-0.5">Reminders</span>
                <span className="text-[#18794E] font-medium">30d, 7d, 1d Active</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#E5E9EF]">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#687385] hover:text-[#202733]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to edit
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-xs font-medium text-[#687385] hover:text-[#202733]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveWarranty}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-medium text-white bg-[#3157D5] rounded-lg hover:bg-[#2648B8] transition-colors shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save warranty</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
