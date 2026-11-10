import React, { useEffect, useId, useRef } from 'react';
import clsx, { type ClassValue } from 'clsx';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X, type LucideIcon } from 'lucide-react';

export const cn = (...inputs: ClassValue[]) => clsx(inputs);

// ─────────────────────────── Card ───────────────────────────

export const Card: React.FC<{
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  compact?: boolean;
  className?: string;
  children?: React.ReactNode;
  as?: 'section' | 'div';
}> = ({ title, subtitle, actions, compact, className, children, as: Tag = 'section' }) => {
  const headingId = useId();
  return (
    <Tag className={cn('card', compact && 'card-compact', className)} aria-labelledby={title ? headingId : undefined}>
      {(title || actions) && (
        <div className="card-title">
          <div className="min-w-0">
            {title && <h2 id={headingId}>{title}</h2>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </Tag>
  );
};

// ─────────────────────────── Feedback ───────────────────────────

type Tone = 'info' | 'error' | 'warning' | 'success';
const TONE_ICON: Record<Tone, LucideIcon> = {
  info: Info,
  error: AlertCircle,
  warning: AlertTriangle,
  success: CheckCircle2,
};

export const Callout: React.FC<{
  tone?: Tone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  onDismiss?: () => void;
}> = ({ tone = 'info', title, children, onDismiss }) => {
  const Icon = TONE_ICON[tone];
  return (
    <div className={cn('callout', tone !== 'info' && `callout-${tone}`)} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon size={18} />
      <div className="min-w-0 flex-1">
        {title && <p className="callout-title">{title}</p>}
        {children}
      </div>
      {onDismiss && (
        <button type="button" className="btn btn-ghost btn-icon btn-sm -my-1 -mr-1" onClick={onDismiss} aria-label="Dismiss">
          <X size={14} />
        </button>
      )}
    </div>
  );
};

export const EmptyState: React.FC<{ icon?: React.ReactNode; title: string; children?: React.ReactNode }> = ({
  icon,
  title,
  children,
}) => (
  <div className="empty-state">
    {icon}
    <h3>{title}</h3>
    {children}
  </div>
);

export const Badge: React.FC<{
  tone?: 'info' | 'success' | 'warning' | 'error' | 'accent' | 'primary';
  dot?: boolean;
  children: React.ReactNode;
}> = ({ tone = 'info', dot, children }) => (
  <span className={cn('badge', tone !== 'info' && `badge-${tone}`)}>
    {dot && <span className="badge-dot" aria-hidden />}
    {children}
  </span>
);

// ─────────────────────────── Tabs (arrow-key navigation) ───────────────────────────

export interface TabItem<T extends string> {
  id: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
  dense,
  idPrefix,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  dense?: boolean;
  idPrefix: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const last = items.length - 1;
    const next =
      event.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : event.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : null;
    if (next === null) return;
    event.preventDefault();
    onChange(items[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div className={cn('tabs', dense && 'tabs-dense')} role="tablist" aria-label={label}>
      {items.map((item, index) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${item.id}`}
            aria-controls={`${idPrefix}-panel-${item.id}`}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className="tab"
            onClick={() => onChange(item.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {item.icon}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export const TabPanel: React.FC<{ idPrefix: string; id: string; children: React.ReactNode; className?: string }> = ({
  idPrefix,
  id,
  children,
  className,
}) => (
  <div role="tabpanel" id={`${idPrefix}-panel-${id}`} aria-labelledby={`${idPrefix}-tab-${id}`} className={className}>
    {children}
  </div>
);

// ─────────────────────────── Dialog (focus trap, Escape, focus restore) ───────────────────────────

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])';

export const Dialog: React.FC<{
  title: React.ReactNode;
  description?: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, description, onClose, footer, children }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
      >
        <div className="dialog-header">
          <div className="min-w-0">
            <h2 id={titleId}>{title}</h2>
            {description && (
              <p id={descId} className="card-subtitle">
                {description}
              </p>
            )}
          </div>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close dialog">
            <X size={16} />
          </button>
        </div>
        <div className="dialog-body">{children}</div>
        {footer && <div className="dialog-footer">{footer}</div>}
      </div>
    </div>
  );
};
