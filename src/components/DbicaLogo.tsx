import React from 'react';

interface DbicaLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'full' | 'icon' | 'horizontal';
  showText?: boolean;
  lightText?: boolean;
}

export const DbicaLogo: React.FC<DbicaLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'horizontal',
  showText = true,
  lightText = false,
}) => {
  // Size dimensions
  const dimensions = {
    sm: { iconSize: 28, textClass: 'text-sm' },
    md: { iconSize: 38, textClass: 'text-base' },
    lg: { iconSize: 48, textClass: 'text-lg' },
    xl: { iconSize: 68, textClass: 'text-2xl font-black' },
    '2xl': { iconSize: 96, textClass: 'text-3xl font-black' },
  }[size];

  const iconSvg = (
    <svg
      viewBox="0 0 100 100"
      className="shrink-0"
      style={{ width: dimensions.iconSize, height: dimensions.iconSize }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="DBICA Emblem"
    >
      {/* Outer Navy Left Arch */}
      <path
        d="M 50 8 C 30 20 18 42 22 62 C 24 72 32 80 44 88 L 50 92"
        stroke="#0F5C97"
        strokeWidth="4.6"
        strokeLinecap="round"
      />

      {/* Outer Navy Right Arch */}
      <path
        d="M 50 8 C 70 20 82 42 78 62 C 76 68 73 73 69 78"
        stroke="#0F5C97"
        strokeWidth="4.6"
        strokeLinecap="round"
      />
      {/* Outer Right Lower - Leaf Green */}
      <path
        d="M 69 78 C 64 84 57 89 50 92"
        stroke="#62B534"
        strokeWidth="4.6"
        strokeLinecap="round"
      />

      {/* Middle Arch Left - Red-Orange Top */}
      <path
        d="M 50 15 C 41 23 34 33 32 45"
        stroke="#EA4A2B"
        strokeWidth="4.6"
        strokeLinecap="round"
      />
      {/* Middle Arch Left - Amber Yellow segment */}
      <path
        d="M 32 45 C 31 50 31 55 32 60"
        stroke="#F59E1B"
        strokeWidth="4.6"
        strokeLinecap="round"
      />
      {/* Middle Arch Left - Lower Navy */}
      <path
        d="M 32 60 C 34 70 41 78 50 85"
        stroke="#0F5C97"
        strokeWidth="4.6"
        strokeLinecap="round"
      />

      {/* Middle Arch Right - Upper Navy */}
      <path
        d="M 50 15 C 59 23 66 33 68 45 C 69 52 68 59 66 66"
        stroke="#0F5C97"
        strokeWidth="4.6"
        strokeLinecap="round"
      />
      {/* Middle Arch Right - Lower Cyan / Sky Blue */}
      <path
        d="M 66 66 C 63 74 57 80 50 85"
        stroke="#00A0DC"
        strokeWidth="4.6"
        strokeLinecap="round"
      />

      {/* Inner Arch Left - Top Red-Orange */}
      <path
        d="M 50 23 C 44 29 39 37 38 46"
        stroke="#EA4A2B"
        strokeWidth="4.6"
        strokeLinecap="round"
      />
      {/* Inner Arch Left - Golden Amber */}
      <path
        d="M 38 46 C 37 50 38 55 40 60"
        stroke="#F59E1B"
        strokeWidth="4.6"
        strokeLinecap="round"
      />
      {/* Inner Arch Left - Lower Navy */}
      <path
        d="M 40 60 C 42 66 46 72 50 78"
        stroke="#0F5C97"
        strokeWidth="4.6"
        strokeLinecap="round"
      />

      {/* Inner Arch Right - Upper Navy */}
      <path
        d="M 50 23 C 56 29 61 37 62 46 C 63 53 62 59 59 66"
        stroke="#0F5C97"
        strokeWidth="4.6"
        strokeLinecap="round"
      />
      {/* Inner Arch Right - Lower Cyan Accent */}
      <path
        d="M 59 66 C 57 71 54 75 50 78"
        stroke="#00A0DC"
        strokeWidth="4.6"
        strokeLinecap="round"
      />

      {/* Central Base Stem Connection */}
      <path
        d="M 50 78 L 50 92"
        stroke="#0F5C97"
        strokeWidth="4.6"
        strokeLinecap="round"
      />
    </svg>
  );

  if (variant === 'icon' || !showText) {
    return <div className={`inline-flex items-center ${className}`}>{iconSvg}</div>;
  }

  if (variant === 'full') {
    // Stacked vertical: emblem on top, DBICA below (exact representation of uploaded logo)
    return (
      <div className={`inline-flex flex-col items-center justify-center gap-1.5 ${className}`}>
        {iconSvg}
        <span
          className={`font-black tracking-wider text-center ${
            lightText ? 'text-white' : 'text-[#0F5C97]'
          } ${dimensions.textClass}`}
          style={{ letterSpacing: '0.14em' }}
        >
          DBICA
        </span>
      </div>
    );
  }

  // Default: Horizontal brand mark (icon + DBICA typography)
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {iconSvg}
      <span
        className={`font-black tracking-wider ${
          lightText ? 'text-white' : 'text-[#0F5C97]'
        } ${dimensions.textClass}`}
        style={{ letterSpacing: '0.1em' }}
      >
        DBICA
      </span>
    </div>
  );
};
