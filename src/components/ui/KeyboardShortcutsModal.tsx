import React from 'react';
import { Modal } from './Modal';
import { Command } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const shortcuts = [
    { key: '⌘ K', desc: 'Open Command Palette & Search' },
    { key: 'N', desc: 'Open Add Invoice modal' },
    { key: 'G then O', desc: 'Go to Overview' },
    { key: 'G then W', desc: 'Go to My Warranties' },
    { key: 'G then D', desc: 'Go to Documents' },
    { key: 'G then A', desc: 'Go to Warranty Assistant' },
    { key: 'G then N', desc: 'Go to Notifications' },
    { key: 'G then S', desc: 'Go to Settings' },
    { key: '?', desc: 'Show this keyboard shortcuts guide' },
    { key: 'ESC', desc: 'Close dialog or modal' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard Shortcuts"
      description="Quick navigation shortcuts across WarrantyEase."
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="divide-y divide-[#E5E9EF] text-xs">
          {shortcuts.map((sc, i) => (
            <div key={i} className="py-2.5 flex items-center justify-between">
              <span className="text-[#202733] font-medium">{sc.desc}</span>
              <kbd className="px-2 py-1 rounded bg-[#F7F8FA] border border-[#E5E9EF] font-mono text-[11px] text-[#687385] font-semibold shadow-2xs">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end pt-3 border-t border-[#E5E9EF]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-[#3157D5] hover:bg-[#2648B8] rounded-lg transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </Modal>
  );
};
