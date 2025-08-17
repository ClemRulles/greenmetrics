/**
 * CertificateCard - Display certificate information with status
 */
import React from 'react';
import { motion } from 'framer-motion';
import { variants, transitionClasses } from '@/lib/ui/motion';

interface CertificateInfo {
  id: string;
  title: string;
  issuer: string;
  status: 'valid' | 'pending' | 'expired' | 'revoked';
  issuedAt: Date;
  expiresAt?: Date;
  scope?: string;
  grade?: 'A' | 'B' | 'C' | 'D' | 'F';
}

interface CertificateCardProps {
  certificate: CertificateInfo;
  showDetails?: boolean;
  className?: string;
  animate?: boolean;
  onClick?: () => void;
  onDownload?: () => void;
}

const statusConfig = {
  valid: {
    color: 'text-green',
    bg: 'bg-green/10',
    border: 'border-green/20',
    icon: '✓',
    label: 'Valid',
  },
  pending: {
    color: 'text-amber',
    bg: 'bg-amber/10', 
    border: 'border-amber/20',
    icon: '⏳',
    label: 'Pending',
  },
  expired: {
    color: 'text-red',
    bg: 'bg-red/10',
    border: 'border-red/20',
    icon: '⚠',
    label: 'Expired',
  },
  revoked: {
    color: 'text-red',
    bg: 'bg-red/10',
    border: 'border-red/20',
    icon: '✕',
    label: 'Revoked',
  },
};

const gradeConfig = {
  A: { color: 'text-green', bg: 'bg-green/10' },
  B: { color: 'text-emerald', bg: 'bg-emerald/10' },
  C: { color: 'text-amber', bg: 'bg-amber/10' },
  D: { color: 'text-red', bg: 'bg-red/10' },
  F: { color: 'text-red', bg: 'bg-red/10' },
};

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

const calculateDaysUntilExpiry = (expiresAt: Date): number => {
  const now = new Date();
  const diffTime = expiresAt.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const CertificateCard: React.FC<CertificateCardProps> = ({
  certificate,
  showDetails = true,
  className = '',
  animate = true,
  onClick,
  onDownload
}) => {
  const { status, grade } = certificate;
  const statusStyles = statusConfig[status];
  const gradeStyles = grade ? gradeConfig[grade] : null;
  
  const isInteractive = !!onClick;
  const daysUntilExpiry = certificate.expiresAt ? calculateDaysUntilExpiry(certificate.expiresAt) : null;
  const isExpiringsSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0;

  const content = (
    <div 
      className={`
        bg-white rounded-lg border-2 p-lg shadow-sm
        ${statusStyles.border}
        ${isInteractive ? `cursor-pointer hover:shadow-md ${transitionClasses.interactive}` : ''}
        ${className}
      `}
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={isInteractive ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      } : undefined}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-md mb-md">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-neutral-900 text-lg leading-tight truncate">
            {certificate.title}
          </h3>
          <p className="text-sm text-neutral-600 mt-xs">
            {certificate.issuer}
          </p>
        </div>
        
        <div className="flex items-center gap-xs flex-shrink-0">
          {/* Grade badge */}
          {gradeStyles && (
            <div className={`px-2 py-1 rounded-md text-xs font-bold ${gradeStyles.color} ${gradeStyles.bg}`}>
              Grade {grade}
            </div>
          )}
          
          {/* Status badge */}
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${statusStyles.color} ${statusStyles.bg}`}>
            <span aria-hidden="true">{statusStyles.icon}</span>
            <span>{statusStyles.label}</span>
          </div>
        </div>
      </div>
      
      {/* Certificate details */}
      {showDetails && (
        <div className="space-y-sm text-sm">
          {certificate.scope && (
            <div>
              <span className="text-neutral-500">Scope:</span>
              <span className="ml-xs text-neutral-700">{certificate.scope}</span>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-md">
            <div>
              <span className="text-neutral-500">Issued:</span>
              <span className="ml-xs text-neutral-700 font-medium">
                {formatDate(certificate.issuedAt)}
              </span>
            </div>
            
            {certificate.expiresAt && (
              <div>
                <span className="text-neutral-500">Expires:</span>
                <span className={`ml-xs font-medium ${isExpiringsSoon ? 'text-amber' : 'text-neutral-700'}`}>
                  {formatDate(certificate.expiresAt)}
                </span>
              </div>
            )}
          </div>
          
          {/* Expiry warning */}
          {isExpiringsSoon && (
            <div className="flex items-center gap-xs p-sm bg-amber/10 border border-amber/20 rounded-md">
              <span className="text-amber" aria-hidden="true">⚠</span>
              <span className="text-xs text-amber font-medium">
                Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      )}
      
      {/* Actions */}
      {onDownload && (
        <div className="mt-md pt-md border-t border-neutral-200">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            className={`
              inline-flex items-center gap-xs px-3 py-2 
              text-sm font-medium text-blue bg-blue/10 
              rounded-md hover:bg-blue/20 focus:outline-none 
              focus:ring-2 focus:ring-blue/50 focus:ring-offset-2
              ${transitionClasses.interactive}
            `}
          >
            <span aria-hidden="true">⬇</span>
            Download Certificate
          </button>
        </div>
      )}
    </div>
  );

  if (!animate) {
    return content;
  }

  return (
    <motion.div 
      variants={variants.scaleIn}
      initial="hidden"
      animate="visible"
      whileHover={isInteractive ? { scale: 1.02 } : undefined}
      whileTap={isInteractive ? { scale: 0.98 } : undefined}
    >
      {content}
    </motion.div>
  );
};

export default CertificateCard;
