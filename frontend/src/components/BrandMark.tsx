import React from 'react';

/** Product mark: a small grid of agents with one highlighted neighborhood. Monochrome, 2px strokes. */
const BrandMark: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
    <rect x="2" y="2" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
    <circle cx="7" cy="7" r="1.6" fill="currentColor" />
    <circle cx="13" cy="7" r="1.6" fill="currentColor" opacity="0.55" />
    <circle cx="7" cy="13" r="1.6" fill="currentColor" opacity="0.55" />
    <circle cx="13" cy="13" r="1.6" fill="currentColor" />
  </svg>
);

export default BrandMark;
