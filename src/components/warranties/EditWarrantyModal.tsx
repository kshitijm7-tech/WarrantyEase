import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Warranty, WarrantyCategory } from '../../types';
import { useWarranties } from '../../context/WarrantyContext';
import { addMonthsToDate } from '../../utils/dateUtils';
import { Check, X } from 'lucide-react';

interface EditWarrantyModalProps {
  warranty: Warranty | null;
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

export const EditWarrantyModal: React.FC<EditWarrantyModalProps> = ({
  warranty,
  isOpen,
  onClose,
}) => {
  const { updateWarranty } = useWarranties();

  const [productName, setProductName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<WarrantyCategory>('Electronics');
  const [seller, setSeller] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [currency, setCurrency] = useState('USD');
  const [warrantyDurationMonths, setWarrantyDurationMonths] = useState<number>(12);
  const [warrantyStartDate, setWarrantyStartDate] = useState('');
  const [warrantyExpiryDate, setWarrantyExpiryDate] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [coverageSummary, setCoverageSummary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (warranty) {
      setProductName(warranty.productName);
      setBrand(warranty.brand);
      setCategory(warranty.category);
      setSeller(warranty.seller);
      setInvoiceNumber(warranty.invoiceNumber);
      setPurchaseDate(warranty.purchaseDate);
      setPurchasePrice(warranty.purchasePrice);
      setCurrency(warranty.currency);
      setWarrantyDurationMonths(warranty.warrantyDurationMonths);
      setWarrantyStartDate(warranty.warrantyStartDate);
      setWarrantyExpiryDate(warranty.warrantyExpiryDate);
      setSerialNumber(warranty.serialNumber || '');
      setNotes(warranty.notes || '');
      setCoverageSummary(warranty.coverageSummary || '');
    }
  }, [warranty]);

  if (!warranty) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateWarranty(warranty.id, {
        productName: productName.trim(),
        brand: brand.trim(),
        category,
        seller: seller.trim(),
        invoiceNumber: invoiceNumber.trim(),
        purchaseDate,
        purchasePrice: Number(purchasePrice) || 0,
        currency,
        warrantyDurationMonths: Number(warrantyDurationMonths) || 12,
        warrantyStartDate,
        warrantyExpiryDate,
        serialNumber: serialNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        coverageSummary: coverageSummary.trim() || undefined,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Warranty — ${warranty.productName}`}
      description="Update purchase terms, coverage duration, or retailer records."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#202733] mb-1">
              Category
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
              onChange={(e) => setPurchaseDate(e.target.value)}
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
            <label className="block text-xs font-medium text-[#202733] mb-1">
              Duration (Months)
            </label>
            <input
              type="number"
              min="1"
              value={warrantyDurationMonths}
              onChange={(e) => setWarrantyDurationMonths(parseInt(e.target.value, 10) || 12)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E9EF] focus:border-[#3157D5] focus:outline-hidden tabular-nums"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#202733] mb-1">
              Warranty Expiry Date <span className="text-[#C03935]">*</span>
            </label>
            <input
              type="date"
              required
              value={warrantyExpiryDate}
              onChange={(e) => setWarrantyExpiryDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E9EF] focus:border-[#3157D5] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#202733] mb-1">
              Serial Number
            </label>
            <input
              type="text"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E9EF] focus:border-[#3157D5] focus:outline-hidden font-mono"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#202733] mb-1">
              Coverage Summary
            </label>
            <textarea
              rows={2}
              value={coverageSummary}
              onChange={(e) => setCoverageSummary(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5E9EF] focus:border-[#3157D5] focus:outline-hidden"
              placeholder="Summary of manufacturer coverage and terms..."
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E9EF]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#687385] hover:text-[#202733]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#3157D5] rounded-lg hover:bg-[#2648B8] transition-colors shadow-2xs"
          >
            <Check className="w-3.5 h-3.5" />
            {isSubmitting ? 'Saving changes...' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
