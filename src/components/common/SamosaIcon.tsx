import React from 'react'

interface SamosaIconProps {
  className?: string
  size?: number
}

export const SamosaIcon: React.FC<SamosaIconProps> = ({ className = 'w-6 h-6', size }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
      role="img"
      aria-label="Samosa Logo"
    >
      <defs>
        {/* Crispy Golden Pastry Gradient */}
        <linearGradient id="samosaPastry" x1="20" y1="15" x2="80" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="45%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        {/* Shadowed Right Facet */}
        <linearGradient id="samosaShadowFace" x1="50" y1="20" x2="85" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#B45309" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#78350F" stopOpacity="0.6" />
        </linearGradient>
        {/* Left Light Highlight */}
        <linearGradient id="samosaHighlight" x1="50" y1="20" x2="20" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#FBBF24" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* Main Samosa Body (Crisp Golden Triangle) */}
      <path
        d="M 50 14 
           C 53 14, 56 18, 58 23 
           L 86 73 
           C 88 77, 86 81, 82 83 
           C 74 86, 62 87, 50 87 
           C 38 87, 26 86, 18 83 
           C 14 81, 12 77, 14 73 
           L 42 23 
           C 44 18, 47 14, 50 14 Z"
        fill="url(#samosaPastry)"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />

      {/* Right Shaded Facet for 3D Volume */}
      <path
        d="M 50 15 
           L 86 73 
           C 88 77, 86 81, 82 83 
           C 74 86, 62 87, 50 87 
           L 50 15 Z"
        fill="url(#samosaShadowFace)"
      />

      {/* Left Light Highlight */}
      <path
        d="M 50 15 
           L 14 73 
           C 12 77, 14 81, 18 83 
           C 26 86, 38 87, 50 87 
           L 50 15 Z"
        fill="url(#samosaHighlight)"
      />

      {/* Central Center Fold Ridge */}
      <path
        d="M 50 15 Q 51 51 50 87"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.85"
      />

      {/* Crimped / Pleated Bottom Fold Crust */}
      <path
        d="M 18 79 
           Q 26 85 34 80 
           Q 42 86 50 81 
           Q 58 86 66 80 
           Q 74 85 82 79"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.9"
      />

      {/* Ajwain / Cumin Crispy Seasoning Dots */}
      <circle cx="36" cy="49" r="1.5" fill="currentColor" opacity="0.65" />
      <circle cx="44" cy="63" r="1.5" fill="currentColor" opacity="0.65" />
      <circle cx="64" cy="57" r="1.5" fill="currentColor" opacity="0.65" />
      <circle cx="58" cy="71" r="1.5" fill="currentColor" opacity="0.65" />
      <circle cx="31" cy="69" r="1.5" fill="currentColor" opacity="0.65" />

      {/* Subtle Appetizing Warm Steam Waves */}
      <path
        d="M 45 9 Q 43 5 47 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M 55 10 Q 57 6 53 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  )
}
