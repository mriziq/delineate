/**
 * DelineateIcon — the Delineate brand mark as a React component.
 *
 * Usage:
 *   <DelineateIcon />                   // 32px, auto dark/light
 *   <DelineateIcon size={20} />         // any size
 *   <DelineateIcon mode="dark" />       // force dark
 *   <DelineateIcon mode="light" />      // force light
 *
 * The icon is pure SVG — no external assets needed.
 */

import React from 'react';

interface DelineateIconProps {
  size?: number;
  mode?: 'auto' | 'dark' | 'light';
  className?: string;
  style?: React.CSSProperties;
}

export function DelineateIcon({
  size = 32,
  mode = 'auto',
  className,
  style,
}: DelineateIconProps) {
  // Resolve colors based on mode
  const isDark = mode === 'dark' || mode === 'auto';
  const isLight = mode === 'light';

  const bg          = isLight ? '#F4F5F8' : '#1a1a1e';
  const topFill     = isLight ? '#222326' : '#F4F5F8';
  const topLines    = isLight ? '#F4F5F8' : '#222326';
  const cardMid     = isLight ? '#b8b8c4' : '#3a3a44';
  const cardFar     = isLight ? '#c8c8d0' : '#2e2e36';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      style={style}
      role="img"
      aria-label="Delineate"
    >
      <rect width="32" height="32" rx="6" fill={bg} />

      {/* Background cards — stroke only */}
      <g transform="rotate(-28, 16, 21)">
        <rect x="8" y="7" width="16" height="20" rx="2" stroke={cardFar} strokeWidth="1.2" />
      </g>
      <g transform="rotate(-14, 16, 21)">
        <rect x="8" y="6" width="16" height="20" rx="2" stroke={cardMid} strokeWidth="1.2" />
      </g>
      <g transform="rotate(14, 16, 21)">
        <rect x="8" y="6" width="16" height="20" rx="2" stroke={cardMid} strokeWidth="1.2" />
      </g>
      <g transform="rotate(28, 16, 21)">
        <rect x="8" y="7" width="16" height="20" rx="2" stroke={cardFar} strokeWidth="1.2" />
      </g>

      {/* Top card — solid fill */}
      <rect x="8" y="5" width="16" height="20" rx="2" fill={topFill} stroke={topFill} strokeWidth="1.2" />
      <line x1="11.5" y1="11" x2="20.5" y2="11" stroke={topLines} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="11.5" y1="15" x2="18.5" y2="15" stroke={topLines} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * DelineateLockup — icon + wordmark horizontal lockup.
 *
 * Usage:
 *   <DelineateLockup />
 *   <DelineateLockup iconSize={24} fontSize={20} mode="light" />
 */

interface DelineateLockupProps {
  iconSize?: number;
  fontSize?: number;
  mode?: 'auto' | 'dark' | 'light';
  className?: string;
  style?: React.CSSProperties;
}

export function DelineateLockup({
  iconSize = 28,
  fontSize = 18,
  mode = 'auto',
  className,
  style,
}: DelineateLockupProps) {
  const textColor = mode === 'light' ? '#222326' : '#F4F5F8';

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: iconSize * 0.35,
        ...style,
      }}
    >
      <DelineateIcon size={iconSize} mode={mode} />
      <span
        style={{
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
          fontSize,
          fontWeight: 300,
          letterSpacing: '-0.02em',
          color: textColor,
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        Delineate
      </span>
    </div>
  );
}

export default DelineateIcon;
