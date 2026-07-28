/**
 * Tally — Inline SVG Icon System
 * Clean stroke icons, consistent style (1.75 stroke, rounded caps).
 * One family per project, no emoji, no icon libraries.
 */

type IconProps = {
  size?: number;
  className?: string;
  strokeWidth?: number;
};

const base = (size: number, strokeWidth: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export function PlusIcon({ size = 20, className, strokeWidth = 2 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function ChevronLeftIcon({ size = 20, className, strokeWidth = 2 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 20, className, strokeWidth = 2 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export function SearchIcon({ size = 16, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function CloseIcon({ size = 18, className, strokeWidth = 2 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function SettingsIcon({ size = 20, className, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function ReceiptIcon({ size = 24, className, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </svg>
  );
}

export function TrashIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    </svg>
  );
}

export function EditIcon({ size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

export function UsersIcon({ size = 24, className, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function ArrowLeftIcon({ size = 20, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

export function CheckIcon({ size = 16, className, strokeWidth = 2.5 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function LinkIcon({ size = 16, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

/** Category icons — replaces emoji in default categories */
export function CategoryIcon({ iconKey, size = 20, className }: { iconKey: string; size?: number; className?: string }) {
  const icons: Record<string, React.ReactNode> = {
    tag: (
      <svg {...base(size, 1.5)} className={className}>
        <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8 8a2 2 0 0 0 2.828 0l7.172-7.172a2 2 0 0 0 0-2.828z" />
        <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" />
      </svg>
    ),
    utensils: (
      <svg {...base(size, 1.5)} className={className}>
        <path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2M5 2v20M16 2v7M14 11h2a4 4 0 0 0 4-4V2h-2v5a1 1 0 0 1-2 0V2h-2v5c0 1.1.9 2 2 2z" />
      </svg>
    ),
    "shopping-cart": (
      <svg {...base(size, 1.5)} className={className}>
        <circle cx="8" cy="21" r="1" />
        <circle cx="19" cy="21" r="1" />
        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
      </svg>
    ),
    car: (
      <svg {...base(size, 1.5)} className={className}>
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18.4 11l-2.7-4.5A2 2 0 0 0 14 5h-4a2 2 0 0 0-1.7 1L5.6 11l-2.1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2" />
        <circle cx="7" cy="17" r="2" />
        <circle cx="17" cy="17" r="2" />
      </svg>
    ),
    home: (
      <svg {...base(size, 1.5)} className={className}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <path d="M9 22V12h6v10" />
      </svg>
    ),
    receipt: (
      <svg {...base(size, 1.5)} className={className}>
        <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" />
        <path d="M8 7h8M8 11h8M8 15h5" />
      </svg>
    ),
    film: (
      <svg {...base(size, 1.5)} className={className}>
        <rect x="2" y="3" width="20" height="18" rx="2" />
        <path d="M7 3v18M17 3v18M2 8h5M2 16h5M17 8h5M17 16h5" />
      </svg>
    ),
    "shopping-bag": (
      <svg {...base(size, 1.5)} className={className}>
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  };

  return <>{icons[iconKey] ?? icons.tag}</>;
}
