import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { IconCheck, IconClose } from './Icons';

/* ------------------------------------------------------------- Bottom-Sheet */

export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // onClose kommt von den Aufrufern als Inline-Funktion und ist damit bei
  // jedem Render neu. Ueber ein Ref gelesen, kann der Effekt unten allein an
  // `open` haengen - sonst liefe er bei jedem Tastendruck erneut.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Fokus ins Sheet holen, damit Escape und Screenreader greifen - ein Feld
    // mit autoFocus hat aber Vorrang und darf nicht verdraengt werden.
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) panel.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="sheet-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} ref={panelRef} tabIndex={-1}>
        <div className="sheet__handle" />
        {title && (
          <div className="row-between" style={{ marginBottom: 'var(--gap)' }}>
            <h2 className="sheet__title" style={{ marginBottom: 0 }}>
              {title}
            </h2>
            <button className="icon-btn" onClick={onClose} aria-label="Schliessen">
              <IconClose />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Schalter */

export function Switch({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button className="switch" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}>
      <span className="grow">
        <span style={{ display: 'block', fontWeight: 560 }}>{label}</span>
        {hint && <span className="small faint">{hint}</span>}
      </span>
      <span className="switch__track" data-on={checked}>
        <span className="switch__knob" />
      </span>
    </button>
  );
}

/* ---------------------------------------------------------------- Fortschritt */

export function ProgressRing({
  value,
  size = 64,
  stroke = 7,
  color = 'var(--accent)',
  children,
}: {
  /** 0..1, Werte darüber werden gekappt. */
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, value));

  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg className="ring" width={size} height={size} aria-hidden="true">
        <circle className="ring__track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} />
        <circle
          className="ring__value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
          lineHeight: 1.1,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function ProgressBar({ value, color = 'var(--accent)' }: { value: number; color?: string }) {
  return (
    <div className="bar">
      <div
        className="bar__fill"
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }}
      />
    </div>
  );
}

/* --------------------------------------------------------------- Leerzustand */

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: string;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty__icon" aria-hidden="true">
        {icon}
      </span>
      <strong style={{ color: 'var(--text)' }}>{title}</strong>
      {text && <span className="small">{text}</span>}
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------- Felder */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {hint && <span className="tiny faint">{hint}</span>}
    </label>
  );
}

/** Auswahl per Pillen - schneller zu treffen als ein Dropdown. */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="row wrap" role="group">
      {options.map((option) => (
        <button
          key={option.value}
          className={`chip ${option.value === value ? 'chip--on' : ''}`}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          style={{ minHeight: 36 }}
        >
          {option.value === value && <IconCheck size={13} />}
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ Bestätigung */

export function ConfirmSheet({
  open,
  title,
  text,
  confirmLabel = 'Löschen',
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  text?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Sheet open={open} title={title} onClose={onCancel}>
      {text && <p className="muted small" style={{ marginBottom: 'var(--gap)' }}>{text}</p>}
      <div className="stack">
        <button className="btn btn--danger btn--block btn--lg" onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button className="btn btn--ghost btn--block" onClick={onCancel}>
          Abbrechen
        </button>
      </div>
    </Sheet>
  );
}
