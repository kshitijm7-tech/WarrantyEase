import React from 'react';
import { WarrantyStatus } from '../../types';
import { getStatusLabel } from '../../utils/warrantyUtils';

interface StatusBadgeProps {
  status: WarrantyStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const label = getStatusLabel(status);

  const styleMap = {
    active: 'bg-[#EAF7EF] text-[#18794E] border-[#CDEED8]',
    expiring_soon: 'bg-[#FFF5D9] text-[#9A6700] border-[#FCE6A8]',
    expired: 'bg-[#FDECEC] text-[#C03935] border-[#F9D0CE]',
  };

  const dotColorMap = {
    active: 'bg-[#18794E]',
    expiring_soon: 'bg-[#9A6700]',
    expired: 'bg-[#C03935]',
  };

  const sizeClasses = size === 'sm' 
    ? 'text-xs px-2 py-0.5' 
    : 'text-xs px-2.5 py-1 font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border ${styleMap[status]} ${sizeClasses} whitespace-nowrap`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColorMap[status]} shrink-0`} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
};
