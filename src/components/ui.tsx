import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from 'react';

// ============================================
// Design tokens (single source of truth)
// ============================================
export const colors = {
  bg: '#07070F',
  card: '#0E0E1C',
  surface: '#131325',
  elevated: '#181830',
  field: '#1E1E38',
  border: '#1E2A40',
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  success: '#10B981',
  danger: '#EF4444',
  dangerDark: '#DC2626',
  warning: '#F59E0B',
  warningDark: '#D97706',
  debt: '#8B5CF6',
  debtDue: '#F97316',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textDisabled: '#475569',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

// ============================================
// Card
// ============================================
interface CardProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  interactive?: boolean;
  accentColor?: string;
}

export function Card({
  children,
  className = '',
  style,
  onClick,
  interactive = false,
  accentColor,
}: CardProps) {
  const baseStyle: React.CSSProperties = {
    background: colors.card,
    border: accentColor ? `1px solid ${accentColor}30` : `1px solid ${colors.border}`,
    borderRadius: radius.lg,
    ...(accentColor && {
      background: `linear-gradient(135deg, ${accentColor}18 0%, ${accentColor}08 100%)`,
    }),
    ...style,
  };

  if (onClick || interactive) {
    return (
      <div
        className={`active-scale ${className}`.trim()}
        style={baseStyle}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      >
        {children}
      </div>
    );
  }

  return (
    <div className={className} style={baseStyle}>
      {children}
    </div>
  );
}

// ============================================
// Button
// ============================================
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
    color: '#fff',
  },
  secondary: {
    background: colors.field,
    border: `1px solid ${colors.border}`,
    color: colors.textSecondary,
  },
  danger: {
    background: `linear-gradient(135deg, ${colors.danger} 0%, ${colors.dangerDark} 100%)`,
    color: '#fff',
  },
  ghost: {
    background: 'transparent',
    color: colors.textSecondary,
  },
  success: {
    background: `linear-gradient(135deg, ${colors.success} 0%, ${colors.success} 100%)`,
    color: '#fff',
  },
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: '8px 12px', fontSize: 13, minHeight: 36 },
  md: { padding: '10px 16px', fontSize: 14, minHeight: 44 },
  lg: { padding: '14px 20px', fontSize: 16, minHeight: 52 },
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled,
  className = '',
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      className={`active-scale ${fullWidth ? 'w-full' : ''} ${className}`.trim()}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: radius.md,
        fontWeight: 600,
        border: variant === 'secondary' ? `1px solid ${colors.border}` : 'none',
        opacity: isDisabled ? 0.5 : 1,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s ease',
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      {...props}
    >
      {loading ? (
        <span className="animate-spin" aria-hidden="true">⟳</span>
      ) : icon && iconPosition === 'left' ? (
        icon
      ) : null}
      {children}
      {!loading && icon && iconPosition === 'right' ? icon : null}
    </button>
  );
}

// ============================================
// Input
// ============================================
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  className = '',
  style,
  id,
  ...props
}: InputProps) {
  const inputId = id || `input-${Math.random().toString(36).slice(2)}`;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`.trim()}>
      {label && (
        <label
          htmlFor={inputId}
          style={{ color: colors.textSecondary, fontSize: 13, fontWeight: 500 }}
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: colors.textMuted }}
            aria-hidden="true"
          >
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          style={{
            width: '100%',
            padding: leftIcon ? '12px 12px 12px 40px' : '12px',
            paddingRight: rightIcon ? 40 : 12,
            background: colors.field,
            border: `1px solid ${error ? colors.danger : colors.border}`,
            borderRadius: radius.md,
            color: colors.text,
            fontSize: 16,
            outline: 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
            ...style,
          }}
          {...props}
        />
        {rightIcon && (
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: colors.textMuted }}
            aria-hidden="true"
          >
            {rightIcon}
          </span>
        )}
      </div>
      {error && (
        <p
          id={`${inputId}-error`}
          role="alert"
          style={{ color: colors.danger, fontSize: 12 }}
        >
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${inputId}-hint`} style={{ color: colors.textMuted, fontSize: 12 }}>
          {hint}
        </p>
      )}
    </div>
  );
}

// ============================================
// Badge
// ============================================
type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'purple';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
}

const badgeVariantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: { background: `${colors.field}`, color: colors.textSecondary },
  success: { background: `${colors.success}20`, color: colors.success },
  danger: { background: `${colors.danger}20`, color: colors.danger },
  warning: { background: `${colors.warning}20`, color: colors.warning },
  info: { background: `${colors.primary}20`, color: colors.primary },
  purple: { background: `${colors.debt}20`, color: colors.debt },
};

export function Badge({ children, variant = 'default', size = 'sm', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-medium ${className}`.trim()}
      style={{
        ...badgeVariantStyles[variant],
        padding: size === 'sm' ? '2px 8px' : '4px 12px',
        borderRadius: radius.full,
        fontSize: size === 'sm' ? 11 : 13,
      }}
    >
      {children}
    </span>
  );
}

// ============================================
// EmptyState
// ============================================
interface EmptyStateProps {
  icon?: string | ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: ButtonVariant;
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-10 px-4 text-center ${className}`.trim()}
      style={{ color: colors.textMuted }}
      role="status"
    >
      {icon && (
        <div className="text-4xl mb-3" aria-hidden="true">
          {typeof icon === 'string' ? icon : icon}
        </div>
      )}
      <p style={{ color: colors.textSecondary, fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
        {title}
      </p>
      {description && (
        <p style={{ fontSize: 13, maxWidth: 260 }}>{description}</p>
      )}
      {action && (
        <Button
          variant={action.variant || 'secondary'}
          size="md"
          onClick={action.onClick}
          className="mt-4"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

// ============================================
// Skeleton (loading placeholder)
// ============================================
interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
}

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = radius.sm,
  className = '',
}: SkeletonProps) {
  return (
    <div
      className={`animate-pulse ${className}`.trim()}
      style={{
        width,
        height,
        borderRadius,
        background: `linear-gradient(90deg, ${colors.field} 25%, ${colors.elevated} 50%, ${colors.field} 75%)`,
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
      }}
      aria-hidden="true"
      role="presentation"
    />
  );
}

// Add shimmer keyframe to index.css if not exists - handled by global styles

// ============================================
// ProgressBar
// ============================================
interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  color?: string;
  trackColor?: string;
  height?: number;
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  color,
  trackColor = colors.border,
  height = 6,
  showLabel = false,
  className = '',
}: ProgressBarProps) {
  const pct = Math.min(Math.round((value / max) * 100), 100);
  const autoColor = !color
    ? pct >= 90 ? colors.danger : pct >= 75 ? colors.warning : colors.primary
    : color;

  return (
    <div className={`flex items-center gap-2 ${className}`.trim()}>
      <div
        style={{
          flex: 1,
          height,
          background: trackColor,
          borderRadius: radius.full,
          overflow: 'hidden',
        }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: autoColor,
            borderRadius: radius.full,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      {showLabel && (
        <span style={{ fontSize: 12, fontWeight: 600, color: autoColor, minWidth: 36 }}>
          {pct}%
        </span>
      )}
    </div>
  );
}

// ============================================
// IconButton (improved touch target)
// ============================================
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string; // for aria-label
  size?: number;
  variant?: 'default' | 'danger' | 'warning';
}

export function IconButton({
  icon,
  label,
  size = 44,
  variant = 'default',
  className = '',
  style,
  ...props
}: IconButtonProps) {
  const variantColors = {
    default: colors.field,
    danger: `${colors.danger}20`,
    warning: `${colors.warning}20`,
  };

  const iconColors = {
    default: colors.textSecondary,
    danger: colors.danger,
    warning: colors.warning,
  };

  return (
    <button
      className={`active-scale ${className}`.trim()}
      aria-label={label}
      style={{
        width: size,
        height: size,
        minWidth: size, // ensure touch target
        minHeight: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.md,
        background: variantColors[variant],
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        color: iconColors[variant],
        ...style,
      }}
      {...props}
    >
      {icon}
    </button>
  );
}

// ============================================
// Divider
// ============================================
export function Divider({ className = '' }: { className?: string }) {
  return (
    <div
      className={className}
      style={{ height: 1, background: colors.border }}
      aria-hidden="true"
    />
  );
}

// ============================================
// TouchTarget wrapper (ensures 44x44 minimum)
// ============================================
export function TouchTarget({ children }: { children: ReactNode }) {
  return (
    <span style={{ display: 'inline-flex', minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </span>
  );
}
