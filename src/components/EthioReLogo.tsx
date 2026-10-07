import React, { useState, useEffect } from 'react';
import { useHRMS } from '../context/HRMSContext';

interface EthioReLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const EthioReLogo: React.FC<EthioReLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
}) => {
  const { branding, companyProfile } = useHRMS();
  const [hasImgError, setHasImgError] = useState(false);

  const sizeMap = {
    sm: { box: 'w-7 h-7', font: 'text-xs', icon: 16 },
    md: { box: 'w-9 h-9', font: 'text-sm', icon: 20 },
    lg: { box: 'w-12 h-12', font: 'text-base', icon: 26 },
    xl: { box: 'w-16 h-16', font: 'text-xl', icon: 34 },
  };

  const currentSize = sizeMap[size];
  // Company Profile is the single global source of truth for the company logo
  const logoSrc = companyProfile?.logo || branding.companyLogo || branding.logoUrl;

  useEffect(() => {
    setHasImgError(false);
  }, [logoSrc]);

  const hasValidLogo = Boolean(logoSrc && !hasImgError);

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {hasValidLogo ? (
        <img
          src={logoSrc}
          alt={companyProfile?.displayName || branding.companyDisplayName || 'Company Logo'}
          onError={() => setHasImgError(true)}
          className={`${currentSize.box} rounded-lg object-contain border border-slate-200 bg-white p-0.5 shadow-xs`}
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          id="company-logo-emblem"
          className={`${currentSize.box} rounded-lg flex items-center justify-center shrink-0 shadow-xs transition-colors`}
          style={{
            background: `linear-gradient(135deg, var(--primary-color, #002855) 0%, var(--secondary-color, #004080) 100%)`,
          }}
        >
          {/* Custom Ethio-Re Geometric Shield / Reinsurance Interlock Emblem */}
          <svg
            viewBox="0 0 40 40"
            fill="none"
            className="w-4/5 h-4/5"
            style={{ color: 'var(--accent-color, #D4AF37)' }}
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer Diamond / Shield */}
            <path
              d="M20 3L36 12V24L20 37L4 24V12L20 3Z"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            {/* Inner Reinsurance Interlocking Ribbons */}
            <path
              d="M20 9L29 15V23L20 31L11 23V15L20 9Z"
              fill="rgba(255, 255, 255, 0.18)"
              stroke="white"
              strokeWidth="1.6"
            />
            {/* Center Golden Core */}
            <circle cx="20" cy="20" r="3.5" fill="currentColor" />
            <path
              d="M14 20H26M20 14V26"
              stroke="white"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}

      {showText && (
        <div className="flex flex-col min-w-0">
          <span
            className="font-bold tracking-tight leading-tight truncate"
            style={{ color: 'var(--primary-color, #002855)' }}
          >
            {branding.companyDisplayName || companyProfile?.displayName || 'Ethiopian Reinsurance S.C.'}
          </span>
          <span
            className="text-[11px] font-semibold tracking-wider uppercase truncate"
            style={{ color: 'var(--accent-color, #D4AF37)' }}
          >
            {companyProfile?.shortName ? `${companyProfile.shortName} HRMS` : 'HRMS Enterprise'}
          </span>
        </div>
      )}
    </div>
  );
};
