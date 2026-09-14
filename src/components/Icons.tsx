/** Strichbasierte Icons - erben Farbe und Grösse vom Elternelement. */
type Props = { size?: number; className?: string };

function base(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  };
}

export const IconToday = ({ size = 22, className }: Props) => (
  <svg {...base(size, className)}>
    <path d="M12 3c1.6 3 4.5 4.4 4.5 8a4.5 4.5 0 0 1-9 0c0-1.3.4-2.3 1-3.2.3 1 1 1.7 1.8 1.9C10 7.4 10.6 4.8 12 3Z" />
    <path d="M9 17.5c1 .9 1.9 1.4 3 1.4s2-.5 3-1.4" />
    <path d="M6.5 20.5h11" />
  </svg>
);

export const IconPlan = ({ size = 22, className }: Props) => (
  <svg {...base(size, className)}>
    <path d="M4 7h4M4 12h4M4 17h4" />
    <rect x="10" y="4.5" width="10" height="5" rx="1.6" />
    <rect x="10" y="14.5" width="10" height="5" rx="1.6" />
  </svg>
);

export const IconMicro = ({ size = 22, className }: Props) => (
  <svg {...base(size, className)}>
    <path d="M13 2.5 5 13.5h6l-1 8 8-11h-6l1-8Z" />
  </svg>
);

export const IconStats = ({ size = 22, className }: Props) => (
  <svg {...base(size, className)}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
);

export const IconMore = ({ size = 22, className }: Props) => (
  <svg {...base(size, className)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H2a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H8a1.6 1.6 0 0 0 1-1.5V2a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V8a1.6 1.6 0 0 0 1.5 1H22a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
  </svg>
);

export const IconPlus = ({ size = 20, className }: Props) => (
  <svg {...base(size, className)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconCheck = ({ size = 20, className }: Props) => (
  <svg {...base(size, className)} strokeWidth={2.4}>
    <path d="m4.5 12.5 5 5 10-11" />
  </svg>
);

export const IconClose = ({ size = 20, className }: Props) => (
  <svg {...base(size, className)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const IconChevron = ({ size = 20, className }: Props) => (
  <svg {...base(size, className)}>
    <path d="m9 5 7 7-7 7" />
  </svg>
);

export const IconBack = ({ size = 22, className }: Props) => (
  <svg {...base(size, className)}>
    <path d="M15 5 8 12l7 7" />
  </svg>
);

export const IconTrash = ({ size = 19, className }: Props) => (
  <svg {...base(size, className)}>
    <path d="M4 7h16M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
    <path d="M6.5 7 7.4 19a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5L17.5 7" />
  </svg>
);

export const IconEdit = ({ size = 19, className }: Props) => (
  <svg {...base(size, className)}>
    <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" />
    <path d="M14.5 6.5 17.5 9.5" />
  </svg>
);

export const IconPlay = ({ size = 20, className }: Props) => (
  <svg {...base(size, className)}>
    <path d="M7 4.8v14.4L19.5 12 7 4.8Z" fill="currentColor" strokeWidth={1.2} />
  </svg>
);

export const IconTimer = ({ size = 20, className }: Props) => (
  <svg {...base(size, className)}>
    <circle cx="12" cy="13.5" r="7.5" />
    <path d="M12 9.5v4l2.5 1.8M9.5 2.5h5" />
  </svg>
);

export const IconTarget = ({ size = 20, className }: Props) => (
  <svg {...base(size, className)}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
  </svg>
);

export const IconUp = ({ size = 18, className }: Props) => (
  <svg {...base(size, className)}>
    <path d="m6 14 6-6 6 6" />
  </svg>
);

export const IconDown = ({ size = 18, className }: Props) => (
  <svg {...base(size, className)}>
    <path d="m6 10 6 6 6-6" />
  </svg>
);

export const IconUndo = ({ size = 19, className }: Props) => (
  <svg {...base(size, className)}>
    <path d="M4 9h10a5.5 5.5 0 0 1 0 11h-3" />
    <path d="m7.5 5.5-3.5 3.5 3.5 3.5" />
  </svg>
);

export const IconCopy = ({ size = 19, className }: Props) => (
  <svg {...base(size, className)}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M15 5.5A1.5 1.5 0 0 0 13.5 4h-8A1.5 1.5 0 0 0 4 5.5v8A1.5 1.5 0 0 0 5.5 15" />
  </svg>
);
