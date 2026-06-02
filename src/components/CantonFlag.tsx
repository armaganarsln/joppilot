import type { WorkspaceProject } from '../types';

/**
 * Simplified canton coats of arms rendered as inline SVG (no external assets).
 * - Zürich: diagonally divided silver (white) over blue.
 * - Glarus: red field with a stylised figure of St. Fridolin (abstracted).
 */
export function CantonFlag({ project, className = 'w-8 h-8' }: { project: WorkspaceProject; className?: string }) {
  if (project === 'glarus') {
    return (
      <svg viewBox="0 0 32 32" className={className} role="img" aria-label="Canton of Glarus coat of arms">
        <rect width="32" height="32" rx="4" fill="#D52B1E" />
        {/* Abstracted St. Fridolin figure */}
        <g fill="#000" opacity="0.85">
          <circle cx="16" cy="9" r="3" />
          <path d="M12 14 q4 -2 8 0 l1.5 9 q-5 2 -11 0 z" />
          <rect x="20.5" y="9" width="1.6" height="14" rx="0.8" transform="rotate(8 21 16)" />
        </g>
        <path d="M11 14 q5 -2.5 10 0" stroke="#F7D417" strokeWidth="1.2" fill="none" />
      </svg>
    );
  }
  // Zürich
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label="Canton of Zürich coat of arms">
      <rect width="32" height="32" rx="4" fill="#fff" />
      <path d="M0 0 H32 V32 Z" fill="#0F47AF" />
      <path d="M0 0 L32 32" stroke="#0F47AF" strokeWidth="1" />
    </svg>
  );
}
