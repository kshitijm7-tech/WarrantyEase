import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Bot, 
  Send, 
  Sparkles, 
  ShieldCheck, 
  FileText, 
  RotateCcw, 
  CheckCircle, 
  AlertCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  Phone,
  Receipt,
  FileCheck2
} from 'lucide-react';
import { useWarranties } from '../context/WarrantyContext';
import { api } from '../services/api';
import { AssistantMessage, WarrantyDocument } from '../types';
import { formatDisplayDate } from '../utils/dateUtils';
import { DocumentPreviewModal } from '../components/documents/DocumentPreviewModal';
import { ClaimPacketModal } from '../components/warranties/ClaimPacketModal';

const SUGGESTED_QUESTIONS = [
  'Is accidental damage covered?',
  'When does my warranty expire?',
  'What documents do I need for a claim?',
  'Does my warranty cover repairs?',
  'How do I contact the seller or support?',
];

export const WarrantyAssistantPage: React.FC = () => {
  const { warranties, documents } = useWarranties();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Selected product state
  const initialProductId = searchParams.get('productId') || (warranties[0]?.id ?? '');
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId);

  // Conversation state
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Modals for interactive actions
  const [previewingDoc, setPreviewingDoc] = useState<WarrantyDocument | null>(null);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);

  // Sync if URL search param changes
  useEffect(() => {
    const pId = searchParams.get('productId');
    if (pId && pId !== selectedProductId) {
      setSelectedProductId(pId);
    }
  }, [searchParams]);

  // Set default initial greeting whenever product changes
  useEffect(() => {
    const selectedProduct = warranties.find((w) => w.id === selectedProductId);
    if (selectedProduct) {
      const greeting: AssistantMessage = {
        id: `greeting-${selectedProduct.id}`,
        sender: 'assistant',
        productId: selectedProduct.id,
        productName: selectedProduct.productName,
        text: `Hello! I have indexed the purchase invoice and warranty documentation for **${selectedProduct.productName}** (${selectedProduct.brand}).\n\nAsk me any question regarding your coverage period, claim process, exclusions, or repair terms.`,
        timestamp: new Date().toISOString(),
        sourceCitation: `Source: Uploaded document records (${selectedProduct.invoiceNumber})`,
      };
      setMessages([greeting]);
    }
  }, [selectedProductId, warranties]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleProductChange = (newId: string) => {
    setSelectedProductId(newId);
    searchParams.set('productId', newId);
    setSearchParams(searchParams);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isLoading) return;

    const selectedProduct = warranties.find((w) => w.id === selectedProductId);
    if (!selectedProduct) return;

    const userMsg: AssistantMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      productId: selectedProduct.id,
      productName: selectedProduct.productName,
      text: query,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const botResponse = await api.askWarrantyQuestion(selectedProduct.id, query);
      setMessages((prev) => [...prev, botResponse]);
    } catch (err) {
      console.error(err);
      const errorMsg: AssistantMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: 'An error occurred while inspecting warranty documents. Please try again.',
        timestamp: new Date().toISOString(),
        isUncertain: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedProduct = warranties.find((w) => w.id === selectedProductId);
  const matchedDoc = documents.find((d) => d.warrantyId === selectedProduct?.id);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#202733]">
          Warranty Assistant
        </h1>
        <p className="text-sm text-[#687385] mt-1">
          Understand your warranty terms using your saved documents.
        </p>
      </div>

      {/* Demo Assistant Notice */}
      <div className="p-3.5 rounded-xl border border-[#D5E2FF] bg-[#EEF3FF] flex items-center justify-between text-xs text-[#202733] shadow-2xs">
        <div className="flex items-center gap-2.5">
          <Bot className="w-4 h-4 text-[#3157D5] shrink-0" />
          <span>
            <strong className="font-semibold text-[#3157D5]">Grounded Demo Assistant:</strong> Answers are retrieved strictly from your saved invoice and warranty records. If a term is not in your uploaded files, the assistant will inform you rather than guessing.
          </span>
        </div>
      </div>

      {/* Product Selector Bar */}
      <div className="p-4 bg-white rounded-xl border border-[#E5E9EF] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#3157D5] shrink-0" />
          <span className="text-xs font-semibold text-[#202733]">
            Active Product Context:
          </span>
        </div>

        <div className="flex items-center gap-2 flex-1 sm:max-w-md">
          <select
            value={selectedProductId}
            onChange={(e) => handleProductChange(e.target.value)}
            className="w-full text-xs px-3 py-1.5 rounded-lg border border-[#E5E9EF] bg-white text-[#202733] focus:border-[#3157D5] focus:outline-hidden font-medium"
          >
            {warranties.map((w) => (
              <option key={w.id} value={w.id}>
                {w.productName} ({w.brand}) — Invoice: {w.invoiceNumber}
              </option>
            ))}
          </select>
          
          <button
            onClick={() => {
              if (selectedProduct) {
                setMessages([
                  {
                    id: `greeting-${Date.now()}`,
                    sender: 'assistant',
                    productId: selectedProduct.id,
                    productName: selectedProduct.productName,
                    text: `Conversation cleared. Asking about **${selectedProduct.productName}**.\n\nAsk me about expiration dates, accidental damage coverage, claim forms, or repairs.`,
                    timestamp: new Date().toISOString(),
                    sourceCitation: `Source: ${selectedProduct.seller} invoice`,
                  },
                ]);
              }
            }}
            className="p-1.5 rounded-lg text-[#687385] hover:text-[#202733] hover:bg-[#F7F8FA] border border-[#E5E9EF]"
            title="Reset conversation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Suggested Questions */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-semibold text-[#687385] uppercase tracking-wider">
          Suggested Questions for {selectedProduct?.brand || 'Product'}
        </div>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => handleSendMessage(q)}
              disabled={isLoading}
              className="text-xs px-3 py-1.5 rounded-lg bg-white border border-[#E5E9EF] text-[#202733] hover:border-[#3157D5] hover:bg-[#EEF3FF] transition-all text-left shadow-2xs disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Conversation Panel */}
      <div className="bg-white rounded-xl border border-[#E5E9EF] shadow-2xs overflow-hidden flex flex-col h-[520px]">
        {/* Messages list */}
        <div className="flex-1 p-5 overflow-y-auto space-y-5">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            const isClaimRelated = msg.text.toLowerCase().includes('claim') || msg.text.toLowerCase().includes('document');
            const isContactRelated = msg.text.toLowerCase().includes('phone') || msg.text.toLowerCase().includes('contact');

            return (
              <div
                key={msg.id}
                className={`flex gap-3 text-xs leading-relaxed ${
                  isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-[#3157D5] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className="max-w-[85%] sm:max-w-[75%] space-y-2">
                  <div
                    className={`p-3.5 rounded-xl border ${
                      isUser
                        ? 'bg-[#3157D5] text-white border-[#2648B8]'
                        : msg.isUncertain
                        ? 'bg-[#FFF5D9] text-[#202733] border-[#FCE6A8]'
                        : 'bg-[#F7F8FA] text-[#202733] border-[#E5E9EF]'
                    }`}
                  >
                    <div className="whitespace-pre-wrap font-normal">
                      {msg.text}
                    </div>
                  </div>

                  {/* Interactive Action Shortcuts directly under assistant bubbles */}
                  {!isUser && (
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      {/* Document Preview Trigger */}
                      {matchedDoc && (
                        <button
                          type="button"
                          onClick={() => setPreviewingDoc(matchedDoc)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-[#3157D5] bg-[#EEF3FF] hover:bg-[#E0EBFF] border border-[#D5E2FF] transition-colors"
                        >
                          <Receipt className="w-3 h-3" />
                          <span>View {matchedDoc.fileType}</span>
                        </button>
                      )}

                      {/* Claim Assistant Trigger */}
                      {isClaimRelated && selectedProduct && (
                        <button
                          type="button"
                          onClick={() => setIsClaimModalOpen(true)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-[#18794E] bg-[#EAF7EF] hover:bg-[#d5f1df] border border-[#CDEED8] transition-colors"
                        >
                          <FileCheck2 className="w-3 h-3" />
                          <span>Open Claim Packet</span>
                        </button>
                      )}

                      {/* Phone contact trigger */}
                      {isContactRelated && selectedProduct?.claimContact?.phone && (
                        <a
                          href={`tel:${selectedProduct.claimContact.phone}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-[#202733] bg-white hover:bg-[#F7F8FA] border border-[#E5E9EF] transition-colors"
                        >
                          <Phone className="w-3 h-3 text-[#3157D5]" />
                          <span>Call Support</span>
                        </a>
                      )}

                      {/* Details link */}
                      {selectedProduct && (
                        <button
                          type="button"
                          onClick={() => navigate(`/warranties/${selectedProduct.id}`)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-[#687385] hover:text-[#202733] transition-colors"
                        >
                          <span>Full Overview</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Source Citation */}
                  {!isUser && msg.sourceCitation && (
                    <div className="text-[11px] text-[#687385] flex items-center gap-1.5 px-1">
                      <FileText className="w-3 h-3 text-[#3157D5]" />
                      <span>{msg.sourceCitation}</span>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-[#202733] text-white flex items-center justify-center shrink-0 text-xs font-semibold">
                    DU
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 text-xs text-[#687385]">
              <div className="w-7 h-7 rounded-lg bg-[#3157D5] text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-3 rounded-xl bg-[#F7F8FA] border border-[#E5E9EF] text-xs text-[#687385] flex items-center gap-2">
                <span>Checking warranty document terms...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-[#E5E9EF]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Ask a question about ${selectedProduct?.productName || 'your warranty'}...`}
              disabled={isLoading}
              className="flex-1 px-3.5 py-2 text-xs rounded-lg border border-[#E5E9EF] focus:border-[#3157D5] focus:outline-hidden bg-[#F7F8FA] focus:bg-white transition-colors"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#3157D5] hover:bg-[#2648B8] disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <span>Ask</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#687385] px-1">
            <span>Powered by your saved paperwork</span>
            <span>Does not replace legal or manufacturer advice</span>
          </div>
        </div>
      </div>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        document={previewingDoc}
        isOpen={!!previewingDoc}
        onClose={() => setPreviewingDoc(null)}
      />

      {/* Claim Packet Modal */}
      {selectedProduct && (
        <ClaimPacketModal
          warranty={selectedProduct}
          isOpen={isClaimModalOpen}
          onClose={() => setIsClaimModalOpen(false)}
        />
      )}
    </div>
  );
};
