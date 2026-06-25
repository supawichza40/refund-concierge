/**
 * app/components/icons.tsx — Agent A
 * Single shared icon set (inline SVG, currentColor). Crisp, geometric,
 * 1.6px strokes — no emoji, no icon-font dependency. Used across all panels.
 */
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const base = (props: P) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
});

export const IconLogo = (p: P) => (
  <svg {...base(p)} fill="none">
    <path d="M12 3l7 3v5c0 4.3-2.9 7.5-7 9-4.1-1.5-7-4.7-7-9V6l7-3z" stroke="var(--mint)" />
    <path d="M9 12l2 2 4-4" stroke="var(--mint)" />
  </svg>
);

export const IconRefund = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 8a9 9 0 0 1 15-3l3 3" />
    <path d="M21 5v4h-4" />
    <path d="M21 16a9 9 0 0 1-15 3l-3-3" />
    <path d="M3 19v-4h4" />
  </svg>
);

export const IconEmail = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="M4 7l8 5.5L20 7" />
  </svg>
);

export const IconWhatsApp = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 20l1.4-4A8 8 0 1 1 9 19.2L4 20z" />
    <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5.6 0 .9-.5.7-1l-.7-1.3-1.6.5c-1-.5-1.8-1.3-2.3-2.3l.5-1.6L9.8 8c-.5-.2-1 .1-1 .7l.2.8z" fill="currentColor" stroke="none" />
  </svg>
);

export const IconSend = (p: P) => (
  <svg {...base(p)}>
    <path d="M4.5 12l15-7-4 15-3.5-6-7.5-2z" />
    <path d="M11.5 13.5L19 5" />
  </svg>
);

export const IconBrain = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5 3 3 0 0 0 2 4 3 3 0 0 0 5 1V5a2 2 0 0 0-3-1z" />
    <path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 1 5 3 3 0 0 1-2 4 3 3 0 0 1-5 1" />
  </svg>
);

export const IconTool = (p: P) => (
  <svg {...base(p)}>
    <path d="M14.5 6.5a3.5 3.5 0 0 0-4.8 4.5L4 16.7 7.3 20l5.7-5.7a3.5 3.5 0 0 0 4.5-4.8l-2.3 2.3-1.7-1.7 2.3-2.3z" />
  </svg>
);

export const IconCheck = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 12.5l4.5 4.5L19 7" />
  </svg>
);

export const IconSpark = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
  </svg>
);

export const IconBolt = (p: P) => (
  <svg {...base(p)}>
    <path d="M13 3L5 13h6l-1 8 8-10h-6l1-8z" />
  </svg>
);

export const IconChat = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 5h16v11H8l-4 3V5z" />
  </svg>
);

export const IconAlert = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 4l9 16H3l9-16z" />
    <path d="M12 10v4M12 17h.01" />
  </svg>
);
