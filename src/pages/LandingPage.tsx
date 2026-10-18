import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  ArrowRight, 
  FileText, 
  Bell, 
  Bot, 
  CheckCircle2, 
  Clock, 
  Download, 
  Sparkles, 
  ChevronRight,
  ChevronDown,
  Lock,
  Calendar,
  ExternalLink,
  Laptop,
  Watch,
  Wind,
  Check,
  UserCheck,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';

// Pre-generated High-Fidelity Assets
const HERO_IMAGE = '/src/assets/images/hero_warrantease_dashboard_1792334336765.jpg';
const SCANNER_IMAGE = '/src/assets/images/feature_invoice_scanner_1792334336866.jpg';
const PROTECTION_IMAGE = '/src/assets/images/feature_claim_protection_1792334336248.jpg';

interface FAQItem {
  question: string;
  answer: string;
  category: 'Security & Privacy' | 'Warranty & Claims';
}

const FAQ_DATA: FAQItem[] = [
  {
    category: 'Security & Privacy',
    question: 'Where are my uploaded invoices, receipts, and personal documents stored?',
    answer: 'In this client preview, all document text excerpts and warranty metadata are stored strictly in your browser\'s secure local sandbox. In production, documents are encrypted at rest with AES-256 in private AWS S3 buckets and transmitted over TLS 1.3 with strict identity isolation.',
  },
  {
    category: 'Security & Privacy',
    question: 'Does WarrantyEase share, analyze, or sell my purchase data to advertisers or data brokers?',
    answer: 'Never. WarrantyEase has a zero-data-broker and zero-advertising model. We do not place marketing pixels, behavioral telemetry, or commercial trackers in the app. Your receipts and purchase histories exist solely for your own records and claims.',
  },
  {
    category: 'Security & Privacy',
    question: 'What happens to my data if I cancel or want to export my records?',
    answer: 'You maintain 100% data portability at all times. With one click, you can export your entire warranty register to a formatted CSV spreadsheet. You can also delete any individual document or reset your account to permanently purge all stored data.',
  },
  {
    category: 'Warranty & Claims',
    question: 'How does the Warranty Assistant answer questions without making up policies?',
    answer: 'The assistant uses strict grounded retrieval. It only references clauses explicitly present in your indexed purchase invoice, certificate, or warranty terms. If a condition (such as accidental water submersion) is not specified in your uploaded paperwork, it clearly tells you so rather than guessing.',
  },
  {
    category: 'Warranty & Claims',
    question: 'Can WarrantyEase guarantee that my warranty claim will be accepted by the manufacturer?',
    answer: 'No software can legally guarantee claim approval, as final determinations rest with manufacturer service centers. However, WarrantyEase equips you with a verified paper trail, serial verification, proof-of-purchase records, and pre-formatted claim emails that eliminate paperwork rejection hurdles.',
  },
  {
    category: 'Warranty & Claims',
    question: 'What file formats and file sizes are supported for invoice uploads?',
    answer: 'WarrantyEase accepts PDF, PNG, and JPG documents up to 10 MB per file. The built-in scanner parses the retailer, purchase date, invoice number, and calculated duration while giving you full control to inspect and edit every field before saving.',
  },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  // Interactive Demo Simulator State on Landing Page
  const [activeTab, setActiveTab] = useState<'watch' | 'laptop' | 'vacuum'>('watch');

  // FAQ Accordion State (open question indices)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const demoItems = {
    watch: {
      name: 'Samsung Galaxy Watch 6 Classic',
      retailer: 'Amazon',
      invoice: 'INV-AMZ-994102',
      purchaseDate: 'Sep 10, 2026',
      expiryDate: 'Sep 10, 2028',
      duration: '24 Months',
      status: 'Active Coverage',
      statusColor: 'text-[#18794E] bg-[#EAF7EF] border-[#CDEED8]',
      coverage: 'Motherboard, AMOLED panel, BioActive heart rate sensor, rotating bezel mechanism.',
      claimStep: 'Walk-in service at Samsung Experience Store or postal repair kit.',
    },
    laptop: {
      name: 'MacBook Pro 16" M3 Max',
      retailer: 'Apple Store',
      invoice: 'INV-APL-901823',
      purchaseDate: 'Nov 15, 2024',
      expiryDate: 'Nov 15, 2027',
      duration: '36 Months',
      status: 'Active Coverage',
      statusColor: 'text-[#18794E] bg-[#EAF7EF] border-[#CDEED8]',
      coverage: 'Complete hardware diagnostics, battery replacement (<80% health), power brick replacement.',
      claimStep: 'Direct appointment at Apple Genius Bar or mail-in carton dispatch.',
    },
    vacuum: {
      name: 'Bosch Series 6 Front Load Washer',
      retailer: 'The Home Depot',
      invoice: 'INV-HD-88492019',
      purchaseDate: 'Nov 02, 2024',
      expiryDate: 'Nov 02, 2026',
      duration: '24 Months',
      status: 'Expiring in 15 days',
      statusColor: 'text-[#9A6700] bg-[#FFF5D9] border-[#FCE6A8]',
      coverage: 'Wash drum bearings, water inlet solenoid valves, drainage pump assembly, touch controls.',
      claimStep: 'Official certified plumber dispatch with Home Depot delivery slip on file.',
    },
  };

  const activeDemo = demoItems[activeTab];

  const toggleFaq = (index: number) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#202733] flex flex-col font-sans">
      {/* 1. Strict Top Bar Contract: Brand — 5 single-line links — Actions */}
      <header className="h-16 bg-white border-b border-[#E5E9EF] px-6 lg:px-12 flex items-center justify-between gap-8 sticky top-0 z-50">
        {/* Zone 1: Single text element wordmark */}
        <Link 
          to="/" 
          className="flex items-center gap-2.5 text-[#202733] font-bold text-lg tracking-tight whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-[#3157D5] flex items-center justify-center text-white shadow-xs">
            <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span>WarrantyEase</span>
        </Link>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-[#687385]">
          <a href="#features" className="hover:text-[#202733] transition-colors whitespace-nowrap shrink-0">Features</a>
          <a href="#simulator" className="hover:text-[#202733] transition-colors whitespace-nowrap shrink-0">Interactive Demo</a>
          <a href="#security" className="hover:text-[#202733] transition-colors whitespace-nowrap shrink-0">Security</a>
          <a href="#pricing" className="hover:text-[#202733] transition-colors whitespace-nowrap shrink-0">Pricing</a>
          <a href="#faq" className="hover:text-[#202733] transition-colors whitespace-nowrap shrink-0">FAQ</a>
        </nav>

        {/* Zone 3: Actions (Sign In + Launch Dashboard) */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/auth"
            className="hidden sm:inline-flex px-3 py-1.5 text-xs font-semibold text-[#687385] hover:text-[#202733] transition-colors"
          >
            Sign In
          </Link>

          <Link
            to="/auth"
            className="px-4 py-2 text-xs font-semibold text-white bg-[#3157D5] hover:bg-[#2648B8] rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-2xs"
          >
            Launch Dashboard
          </Link>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="pt-12 sm:pt-20 pb-16 px-6 lg:px-12 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Hero Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#EEF3FF] border border-[#D5E2FF] text-xs font-semibold text-[#3157D5]">
              <span>Personal Warranty & Document Management SaaS</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-5xl font-bold tracking-tight text-[#202733] leading-[1.15]" style={{ textWrap: 'balance' }}>
              Never lose another warranty claim or purchase receipt.
            </h1>

            <p className="text-sm sm:text-base text-[#687385] leading-relaxed max-w-xl">
              Keep every purchase invoice organized, track manufacturer expiration dates with automated alerts, and generate verified claim packets without searching through paperwork.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#3157D5] hover:bg-[#2648B8] rounded-lg transition-colors shadow-xs"
              >
                <span>Try Demo Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <a
                href="#simulator"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#202733] bg-white border border-[#E5E9EF] hover:bg-[#F7F8FA] rounded-lg transition-colors shadow-2xs"
              >
                <span>Test Interactive Scanner</span>
              </a>
            </div>

            {/* Claim-to-Proof Metric Strip */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[#E5E9EF] text-xs">
              <div>
                <div className="text-lg sm:text-xl font-bold text-[#202733] tabular-nums">$14,200+</div>
                <div className="text-[#687385] text-[11px] mt-0.5">Hardware value indexed</div>
              </div>
              <div>
                <div className="text-lg sm:text-xl font-bold text-[#18794E] tabular-nums">100% On-Time</div>
                <div className="text-[#687385] text-[11px] mt-0.5">Expiry reminder rate</div>
              </div>
              <div>
                <div className="text-lg sm:text-xl font-bold text-[#3157D5] tabular-nums">4-Minute</div>
                <div className="text-[#687385] text-[11px] mt-0.5">Average claim prep time</div>
              </div>
            </div>
          </div>

          {/* Right Hero Visual Column (High-Fidelity 16:9 Asset with fallback) */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl border border-[#E5E9EF] overflow-hidden shadow-lg bg-white group">
              <img
                src={HERO_IMAGE}
                alt="WarrantyEase organized workstation with purchase invoices and protected devices"
                referrerPolicy="no-referrer"
                className="w-full h-auto object-cover aspect-16/9 group-hover:scale-[1.01] transition-transform duration-300"
              />
              <div className="p-4 bg-white border-t border-[#E5E9EF] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-[#202733] font-semibold">
                  <ShieldCheck className="w-4 h-4 text-[#3157D5]" />
                  <span>WarrantyEase Production Client</span>
                </div>
                <span className="text-[#687385] font-mono text-[11px]">12 Active Records</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Bento Grid: Core Capabilities */}
      <section id="features" className="py-16 px-6 lg:px-12 bg-white border-y border-[#E5E9EF]">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="max-w-xl space-y-2">
            <div className="text-xs font-semibold text-[#3157D5] uppercase tracking-wider">
              Core Capabilities
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#202733]">
              Built for people who value their appliances and tech.
            </h2>
            <p className="text-xs sm:text-sm text-[#687385]">
              Everything you need to safeguard purchase investments, manage documents, and hold manufacturers accountable.
            </p>
          </div>

          {/* Asymmetric Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bento Card 1 (Span 2) */}
            <div className="md:col-span-2 p-6 sm:p-8 rounded-xl border border-[#E5E9EF] bg-[#F7F8FA] flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="text-xs font-mono font-semibold text-[#3157D5]">01. AUTOMATED INVOICE PARSING</div>
                <h3 className="text-xl font-bold text-[#202733]">
                  Drop any receipt or invoice. Review extracted dates instantly.
                </h3>
                <p className="text-xs sm:text-sm text-[#687385] leading-relaxed max-w-lg">
                  Upload PDF invoices or camera receipts from Amazon, Best Buy, Apple, Costco, and Home Depot. WarrantyEase extracts the retailer, order number, purchase price, and calculated warranty period with full manual editing control.
                </p>
              </div>

              <div className="rounded-xl border border-[#E5E9EF] overflow-hidden shadow-2xs bg-white">
                <img
                  src={SCANNER_IMAGE}
                  alt="Invoice OCR scanner tablet demonstration"
                  referrerPolicy="no-referrer"
                  className="w-full h-56 object-cover object-center"
                />
              </div>
            </div>

            {/* Bento Card 2 (Span 1) */}
            <div className="p-6 sm:p-8 rounded-xl border border-[#E5E9EF] bg-white flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="text-xs font-mono font-semibold text-[#3157D5]">02. TIMELY EXPIRY REMINDERS</div>
                <h3 className="text-xl font-bold text-[#202733]">
                  30-day, 7-day, and 1-day alerts.
                </h3>
                <p className="text-xs sm:text-sm text-[#687385] leading-relaxed">
                  Never discover a broken appliance one week after the warranty expired. Scheduled alerts notify you in advance so you can request service while you still have coverage.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-[#E5E9EF] bg-[#F7F8FA] space-y-2 text-xs">
                <div className="flex items-center gap-2 text-[#9A6700] font-semibold">
                  <Clock className="w-4 h-4" />
                  <span>Sony WH-1000XM5</span>
                </div>
                <div className="text-[#202733]">Coverage expiring in 6 days</div>
                <div className="text-[11px] text-[#687385]">Reminder dispatched on Oct 18, 2026</div>
              </div>
            </div>

            {/* Bento Card 3 (Span 1) */}
            <div className="p-6 sm:p-8 rounded-xl border border-[#E5E9EF] bg-white flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="text-xs font-mono font-semibold text-[#3157D5]">03. GROUNDED ASSISTANT</div>
                <h3 className="text-xl font-bold text-[#202733]">
                  Answers based solely on your documents.
                </h3>
                <p className="text-xs sm:text-sm text-[#687385] leading-relaxed">
                  No hallucinated terms or fake guarantees. Ask whether accidental drops are covered, and receive answers citing exact clauses from your stored manufacturer documentation.
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-[#D5E2FF] bg-[#EEF3FF] text-xs space-y-1">
                <div className="font-semibold text-[#3157D5] flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5" />
                  <span>Verified Document Citation</span>
                </div>
                <p className="text-[11px] text-[#202733] italic">
                  &ldquo;Source: Warranty terms — Coverage section (INV-APL-901823)&rdquo;
                </p>
              </div>
            </div>

            {/* Bento Card 4 (Span 2) */}
            <div className="md:col-span-2 p-6 sm:p-8 rounded-xl border border-[#E5E9EF] bg-[#F7F8FA] flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="text-xs font-mono font-semibold text-[#3157D5]">04. 1-CLICK CLAIM PACKET GENERATOR</div>
                <h3 className="text-xl font-bold text-[#202733]">
                  Generate verified support dossiers in seconds.
                </h3>
                <p className="text-xs sm:text-sm text-[#687385] leading-relaxed max-w-lg">
                  When a device malfunctions, click &quot;Prepare Claim Packet&quot;. WarrantyEase pulls the serial number, order invoice, proof of purchase, and creates a ready-to-send support email draft directly to authorized customer care.
                </p>
              </div>

              <div className="rounded-xl border border-[#E5E9EF] overflow-hidden shadow-2xs bg-white">
                <img
                  src={PROTECTION_IMAGE}
                  alt="Protected consumer electronics showcase"
                  referrerPolicy="no-referrer"
                  className="w-full h-56 object-cover object-center"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Interactive Live Simulator Section */}
      <section id="simulator" className="py-16 px-6 lg:px-12 max-w-7xl mx-auto w-full space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="text-xs font-semibold text-[#3157D5] uppercase tracking-wider">
            Interactive Product Simulator
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#202733]">
            Experience WarrantyEase in action right now.
          </h2>
          <p className="text-xs sm:text-sm text-[#687385]">
            Select any sample item below to see how WarrantyEase extracts paperwork metadata, computes remaining days, and structures claim terms.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center justify-center gap-2">
          {[
            { id: 'watch', label: 'Samsung Smartwatch', icon: Watch },
            { id: 'laptop', label: 'Apple MacBook Pro', icon: Laptop },
            { id: 'vacuum', label: 'Bosch Washing Machine', icon: Wind },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all border ${
                  isSelected
                    ? 'bg-[#3157D5] text-white border-[#3157D5] shadow-2xs'
                    : 'bg-white text-[#687385] border-[#E5E9EF] hover:border-[#3157D5] hover:text-[#202733]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Interactive Simulated Product Card */}
        <div className="max-w-3xl mx-auto p-6 sm:p-8 bg-white rounded-2xl border border-[#E5E9EF] shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E9EF] pb-5">
            <div>
              <span className="text-[11px] font-semibold text-[#687385] uppercase tracking-wider">
                Extracted Record
              </span>
              <h3 className="text-xl font-bold text-[#202733] mt-0.5">
                {activeDemo.name}
              </h3>
              <div className="text-xs text-[#687385] mt-1 flex items-center gap-2">
                <span>Sold by {activeDemo.retailer}</span>
                <span>·</span>
                <span className="font-mono">Invoice #{activeDemo.invoice}</span>
              </div>
            </div>

            <div className={`px-3 py-1 rounded-md border text-xs font-semibold self-start sm:self-auto ${activeDemo.statusColor}`}>
              {activeDemo.status}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[#687385] block mb-0.5">Purchase Date</span>
              <span className="font-semibold text-[#202733]">{activeDemo.purchaseDate}</span>
            </div>
            <div>
              <span className="text-[#687385] block mb-0.5">Coverage Expiration</span>
              <span className="font-semibold text-[#3157D5]">{activeDemo.expiryDate}</span>
            </div>
            <div>
              <span className="text-[#687385] block mb-0.5">Duration</span>
              <span className="font-semibold text-[#202733]">{activeDemo.duration}</span>
            </div>
            <div>
              <span className="text-[#687385] block mb-0.5">Document</span>
              <span className="text-[#18794E] font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F8FA] border border-[#E5E9EF] space-y-2 text-xs">
            <div className="font-semibold text-[#202733]">Covered Components:</div>
            <p className="text-[#687385] leading-relaxed">
              {activeDemo.coverage}
            </p>
            <div className="font-semibold text-[#202733] pt-2">Recommended Claim Workflow:</div>
            <p className="text-[#687385] leading-relaxed">
              {activeDemo.claimStep}
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-[#687385]">
              Ready to explore all 12 demo products?
            </span>
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#3157D5] hover:bg-[#2648B8] rounded-lg transition-colors shadow-2xs"
            >
              <span>Explore Full Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 5. Security & Privacy Architecture */}
      <section id="security" className="py-16 px-6 lg:px-12 bg-white border-y border-[#E5E9EF]">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="max-w-xl space-y-2">
            <div className="text-xs font-semibold text-[#3157D5] uppercase tracking-wider">
              Privacy & Security
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#202733]">
              Your receipts are your private business.
            </h2>
            <p className="text-xs sm:text-sm text-[#687385]">
              Built with strict security guardrails. No advertising telemetry or third-party marketing trackers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl border border-[#E5E9EF] bg-[#F7F8FA] space-y-3">
              <div className="w-8 h-8 rounded-lg bg-[#EEF3FF] text-[#3157D5] flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-[#202733]">Local Browser Sandbox</h4>
              <p className="text-xs text-[#687385] leading-relaxed">
                Demo records and OCR excerpts are maintained client-side in your secure storage sandbox, ready to connect to your private AWS Cloud backend.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-[#E5E9EF] bg-[#F7F8FA] space-y-3">
              <div className="w-8 h-8 rounded-lg bg-[#EAF7EF] text-[#18794E] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-[#202733]">Strict Grounding</h4>
              <p className="text-xs text-[#687385] leading-relaxed">
                The warranty assistant never fabricates legal terms. If an exclusion or clause is missing from your paperwork, it explicitly states so.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-[#E5E9EF] bg-[#F7F8FA] space-y-3">
              <div className="w-8 h-8 rounded-lg bg-[#FFF5D9] text-[#9A6700] flex items-center justify-center">
                <Download className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-[#202733]">Complete Data Portability</h4>
              <p className="text-xs text-[#687385] leading-relaxed">
                Export your entire warranty catalog and purchase logs into CSV spreadsheets or formatted claim dossier text files anytime with one click.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Professional Frequently Asked Questions (FAQ) Section */}
      <section id="faq" className="py-20 px-6 lg:px-12 max-w-5xl mx-auto w-full space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="text-xs font-semibold text-[#3157D5] uppercase tracking-wider">
            Security & Data Protection
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#202733]">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-[#687385]">
            Everything you need to know about our privacy architecture, data retention, and how your documents are protected.
          </p>
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-3.5">
          {FAQ_DATA.map((item, idx) => {
            const isOpen = openFaqIndex === idx;

            return (
              <div
                key={idx}
                className="bg-white rounded-xl border border-[#E5E9EF] overflow-hidden transition-all shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-[#F7F8FA] transition-colors cursor-pointer select-none"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-[#3157D5] bg-[#EEF3FF] px-2 py-0.5 rounded border border-[#D5E2FF] whitespace-nowrap">
                      {item.category}
                    </span>
                    <span className="text-sm font-semibold text-[#202733]">
                      {item.question}
                    </span>
                  </div>

                  <ChevronDown
                    className={`w-4 h-4 text-[#687385] shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-[#3157D5]' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs text-[#687385] leading-relaxed border-t border-[#E5E9EF]/60 bg-[#FCFDFE]">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Security Assurance Card */}
        <div className="p-6 rounded-xl border border-[#E5E9EF] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#EAF7EF] text-[#18794E] flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-[#202733]">
                Have a specific compliance or enterprise security question?
              </div>
              <p className="text-[#687385] mt-0.5">
                Our architecture team can provide custom data isolation agreements and on-premise deployment guidance.
              </p>
            </div>
          </div>

          <Link
            to="/auth"
            className="px-4 py-2 text-xs font-semibold text-[#202733] bg-[#F7F8FA] hover:bg-[#E5E9EF] rounded-lg transition-colors border border-[#E5E9EF] whitespace-nowrap self-start sm:self-auto"
          >
            Access Security Sandbox
          </Link>
        </div>
      </section>

      {/* 7. Transparent Pricing Plans */}
      <section id="pricing" className="py-16 px-6 lg:px-12 bg-white border-t border-[#E5E9EF] w-full space-y-12">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <div className="text-xs font-semibold text-[#3157D5] uppercase tracking-wider">
              Pricing Plans
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#202733]">
              Simple, honest pricing.
            </h2>
            <p className="text-xs sm:text-sm text-[#687385]">
              Start free with demo data or upgrade for unlimited receipts and automated AWS email dispatch.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Free Tier */}
            <div className="p-6 sm:p-8 rounded-xl border border-[#E5E9EF] bg-white flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-base font-bold text-[#202733]">Personal Starter</h4>
                  <p className="text-xs text-[#687385] mt-1">For students and individual buyers.</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-[#202733] tabular-nums">$0</span>
                  <span className="text-xs text-[#687385]">/ forever</span>
                </div>

                <ul className="space-y-2 text-xs text-[#687385]">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#18794E]" />
                    <span>Up to 15 registered warranties</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#18794E]" />
                    <span>In-app expiry notifications</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#18794E]" />
                    <span>Interactive Warranty Assistant</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#18794E]" />
                    <span>Standard CSV data export</span>
                  </li>
                </ul>
              </div>

              <Link
                to="/auth?mode=signup"
                className="w-full text-center py-2 text-xs font-semibold text-[#202733] bg-[#F7F8FA] hover:bg-[#E5E9EF] rounded-lg transition-colors border border-[#E5E9EF]"
              >
                Create Free Account
              </Link>
            </div>

            {/* Pro Tier (Featured) */}
            <div className="p-6 sm:p-8 rounded-xl border-2 border-[#3157D5] bg-white flex flex-col justify-between space-y-6 relative shadow-md">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-[#202733]">Pro Household</h4>
                  <span className="text-[10px] font-semibold text-[#3157D5] bg-[#EEF3FF] px-2 py-0.5 rounded-full">
                    Most Popular
                  </span>
                </div>
                <p className="text-xs text-[#687385] mt-1">For active tech collectors and homeowners.</p>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-[#202733] tabular-nums">$6</span>
                  <span className="text-xs text-[#687385]">/ month</span>
                </div>

                <ul className="space-y-2 text-xs text-[#202733]">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#18794E]" />
                    <span className="font-semibold">Unlimited registered warranties</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#18794E]" />
                    <span>Automated AWS SES email alerts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#18794E]" />
                    <span>1-Click Claim Packet Generator</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#18794E]" />
                    <span>Priority optical document scanner</span>
                  </li>
                </ul>
              </div>

              <Link
                to="/auth?mode=signup"
                className="w-full text-center py-2 text-xs font-semibold text-white bg-[#3157D5] hover:bg-[#2648B8] rounded-lg transition-colors shadow-2xs"
              >
                Get Started with Pro
              </Link>
            </div>

            {/* Family / Small Fleet */}
            <div className="p-6 sm:p-8 rounded-xl border border-[#E5E9EF] bg-white flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-base font-bold text-[#202733]">Family & Office</h4>
                  <p className="text-xs text-[#687385] mt-1">Multi-user household and company assets.</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-[#202733] tabular-nums">$14</span>
                  <span className="text-xs text-[#687385]">/ month</span>
                </div>

                <ul className="space-y-2 text-xs text-[#687385]">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#18794E]" />
                    <span>Up to 5 family member profiles</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#18794E]" />
                    <span>Shared document drive</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-[#18794E]" />
                    <span>Dedicated concierge support contact</span>
                  </li>
                </ul>
              </div>

              <Link
                to="/auth?mode=signup"
                className="w-full text-center py-2 text-xs font-semibold text-[#202733] bg-[#F7F8FA] hover:bg-[#E5E9EF] rounded-lg transition-colors border border-[#E5E9EF]"
              >
                Contact Team
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Conversion CTA Banner */}
      <section className="py-16 px-6 lg:px-12 bg-[#202733] text-white">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
            Take control of your purchase paperwork today.
          </h2>
          <p className="text-xs sm:text-sm text-[#E5E9EF]/80 max-w-xl mx-auto leading-relaxed">
            Join thousands of professionals, homeowners, and tech buyers who rely on WarrantyEase for organized warranties and on-time claims.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 px-6 py-3 text-xs sm:text-sm font-semibold text-[#202733] bg-white hover:bg-[#F7F8FA] rounded-lg transition-colors shadow-lg"
            >
              <span>Launch Demo Workspace</span>
              <ArrowRight className="w-4 h-4 text-[#3157D5]" />
            </Link>
            <Link
              to="/auth?mode=signup"
              className="inline-flex items-center gap-2 px-6 py-3 text-xs sm:text-sm font-semibold text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors border border-white/20"
            >
              <span>Sign Up with Email</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 9. Quiet Footer */}
      <footer className="bg-white border-t border-[#E5E9EF] py-12 px-6 lg:px-12 text-xs text-[#687385]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[#202733] font-bold text-sm tracking-tight">
              <div className="w-6 h-6 rounded-md bg-[#3157D5] flex items-center justify-center text-white">
                <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
              </div>
              <span>WarrantyEase</span>
            </div>
            <p className="text-xs leading-relaxed">
              Personal warranty and purchase document management SaaS platform.
            </p>
            <div className="text-[11px] text-[#687385]">
              © {new Date().getFullYear()} WarrantyEase Inc. All rights reserved.
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-semibold text-[#202733] uppercase text-[11px] tracking-wider">Product</div>
            <ul className="space-y-1.5">
              <li><Link to="/app/overview" className="hover:text-[#202733] transition-colors">Overview Dashboard</Link></li>
              <li><Link to="/app/warranties" className="hover:text-[#202733] transition-colors">My Warranties</Link></li>
              <li><Link to="/app/documents" className="hover:text-[#202733] transition-colors">Document Archive</Link></li>
              <li><Link to="/app/assistant" className="hover:text-[#202733] transition-colors">Warranty Assistant</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="font-semibold text-[#202733] uppercase text-[11px] tracking-wider">Resources</div>
            <ul className="space-y-1.5">
              <li><a href="#simulator" className="hover:text-[#202733] transition-colors">Invoice Simulator</a></li>
              <li><a href="#faq" className="hover:text-[#202733] transition-colors">Security & Privacy FAQ</a></li>
              <li><a href="#pricing" className="hover:text-[#202733] transition-colors">Pricing & Plans</a></li>
              <li><Link to="/auth" className="hover:text-[#202733] transition-colors">Sign In / Demo Access</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="font-semibold text-[#202733] uppercase text-[11px] tracking-wider">System</div>
            <div className="p-3 rounded-lg bg-[#F7F8FA] border border-[#E5E9EF] space-y-1 text-[11px]">
              <div className="flex items-center justify-between">
                <span>Frontend:</span>
                <span className="font-mono text-[#202733]">React 19 SPA</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Backend Target:</span>
                <span className="font-mono text-[#202733]">Python / AWS</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Security:</span>
                <span className="text-[#18794E] font-medium">Zero-Broker Policy</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
