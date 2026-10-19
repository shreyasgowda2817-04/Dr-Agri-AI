import React from 'react';

/**
 * Dr Agri AI - Unique Agriculture App Logo
 * Featuring:
 * - Golden wheat ear / grain stalk symbolizing rich harvest and abundance
 * - Vibrant emerald-green crop leaf embracing the crop
 * - Curved golden agricultural furrow lines representing fertile farmland
 * - Ambient warm golden glow and 3D frosted-glass squircle container
 */

export const LogoImage = ({ size = 40, className = '', alt = 'Dr Agri AI' }) => {
  return (
    <img
      src="/logo.png"
      alt={alt}
      width={size}
      height={size}
      className={`rounded-2xl shrink-0 object-contain shadow-md shadow-emerald-950/20 transition-transform duration-200 group-hover:scale-105 ${className}`}
      data-testid="app-logo-image"
    />
  );
};

export const LogoIcon = ({ size = 40, className = '', variant = 'image' }) => {
  if (variant === 'image') {
    return <LogoImage size={size} className={className} />;
  }

  // Pure SVG vector version matching the unique agricultural motif
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 group-hover:scale-105 ${className}`}
      aria-label="Dr Agri AI Logo"
      data-testid="app-logo-icon"
    >
      <defs>
        <radialGradient id="agriDarkBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2A3844" />
          <stop offset="100%" stopColor="#1E2730" />
        </radialGradient>
        <linearGradient id="wheatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="40%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4ADE80" />
          <stop offset="60%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="furrowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#B45309" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" stopOpacity="0.8" />
        </linearGradient>
        <filter id="agriGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#F59E0B" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Rounded squircle */}
      <rect x="4" y="4" width="92" height="92" rx="26" fill="url(#agriDarkBg)" />

      <g id="dr-agri-emblem" filter="url(#agriGlow)">
        {/* Golden wheat grain stalk */}
        <path d="M50 68 C 48 50 44 32 58 18" stroke="url(#wheatGrad)" strokeWidth="3" strokeLinecap="round" />
        {/* Wheat kernels */}
        <path d="M48 24 C 44 22 43 28 47 30 C 51 28 52 22 48 24 Z" fill="url(#wheatGrad)" />
        <path d="M56 26 C 60 24 61 30 57 32 C 53 30 52 24 56 26 Z" fill="url(#wheatGrad)" />
        <path d="M46 32 C 40 30 40 36 45 38 C 50 36 50 30 46 32 Z" fill="url(#wheatGrad)" />
        <path d="M54 35 C 60 33 60 39 55 41 C 50 39 49 33 54 35 Z" fill="url(#wheatGrad)" />
        <path d="M44 42 C 38 40 38 46 43 48 C 48 46 48 40 44 42 Z" fill="url(#wheatGrad)" />
        <path d="M52 45 C 58 43 58 49 53 51 C 48 49 47 43 52 45 Z" fill="url(#wheatGrad)" />

        {/* Lush green encircling leaf */}
        <path d="M48 70 C 54 54 68 44 74 34 C 77 28 72 24 64 26 C 54 28 50 40 48 56 Z" fill="url(#leafGrad)" />
        <path d="M48 70 C 40 58 30 50 26 38 C 24 30 32 26 38 30 C 44 36 46 50 48 70 Z" fill="url(#leafGrad)" opacity="0.9" />

        {/* Agricultural tilled furrow curves */}
        <path d="M26 68 C 34 76 46 78 50 78 C 54 78 66 76 74 68" stroke="url(#furrowGrad)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M28 74 C 36 82 46 84 50 84 C 54 84 64 82 72 74" stroke="url(#furrowGrad)" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
};

const AppLogo = ({
  size = 40,
  showText = false,
  variant = 'image',
  textClassName = '',
  className = '',
  proBadge = false,
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 min-w-0 ${className}`}>
      <LogoIcon size={size} variant={variant} />
      {showText && (
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`font-black tracking-tight text-gray-900 dark:text-white truncate ${textClassName || 'text-xl'}`}>
            Dr Agri
          </span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm shrink-0">
            AI
          </span>
          {proBadge && (
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm shrink-0">
              PRO
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default AppLogo;
