'use client';

import React from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Button
// ============================================================================
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

  const variants = {
    primary: 'bg-primary text-primary-foreground hover:opacity-90 shadow-sm',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-[var(--slate-200)]',
    outline: 'border border-border bg-transparent hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    destructive: 'bg-destructive text-destructive-foreground hover:opacity-90 shadow-sm',
    success: 'bg-success text-white hover:opacity-90 shadow-sm',
  };

  const sizes = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-9 px-4 text-sm gap-2',
    lg: 'h-11 px-6 text-base gap-2',
    icon: 'h-9 w-9',
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
}

// ============================================================================
// Input
// ============================================================================
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-[var(--slate-700)]">
            {label}
            {props.required && <span className="text-destructive ml-0.5">*</span>}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'flex h-9 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm shadow-sm transition-colors',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

// ============================================================================
// Select
// ============================================================================
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-[var(--slate-700)]">
            {label}
            {props.required && <span className="text-destructive ml-0.5">*</span>}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={cn(
            'flex h-9 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm shadow-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive',
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

// ============================================================================
// Textarea
// ============================================================================
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-[var(--slate-700)]">
            {label}
            {props.required && <span className="text-destructive ml-0.5">*</span>}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={cn(
            'flex min-h-[80px] w-full rounded-lg border border-input bg-white px-3 py-2 text-sm shadow-sm',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

// ============================================================================
// Checkbox
// ============================================================================
interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, id, ...props }, ref) => {
    const checkboxId = id || label.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex items-center gap-2">
        <input
          id={checkboxId}
          ref={ref}
          type="checkbox"
          className={cn(
            'h-4 w-4 rounded border-[var(--slate-300)] text-primary focus:ring-ring',
            className
          )}
          {...props}
        />
        <label htmlFor={checkboxId} className="text-sm text-[var(--slate-700)] cursor-pointer">
          {label}
        </label>
      </div>
    );
  }
);
Checkbox.displayName = 'Checkbox';

// ============================================================================
// Card
// ============================================================================
interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({ children, className, hover = false, padding = 'md' }: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={cn(
        'bg-card rounded-xl border border-border shadow-sm',
        paddings[padding],
        hover && 'card-hover cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Badge / Status Badge
// ============================================================================
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline' | 'muted';
  className?: string;
  dot?: boolean;
}

export function Badge({ children, variant = 'default', className, dot = false }: BadgeProps) {
  const variants = {
    default: 'bg-[var(--primary-50)] text-[var(--primary-700)] border-[var(--primary-200)]',
    success: 'bg-[var(--success-50)] text-[var(--success-700)] border-green-200',
    warning: 'bg-[var(--warning-50)] text-[var(--warning-600)] border-amber-200',
    danger: 'bg-[var(--danger-50)] text-[var(--danger-700)] border-red-200',
    info: 'bg-[var(--info-50)] text-[var(--info-600)] border-blue-200',
    outline: 'bg-transparent text-[var(--slate-600)] border-[var(--slate-300)]',
    muted: 'bg-[var(--slate-100)] text-[var(--slate-600)] border-[var(--slate-200)]',
  };

  const dotColors = {
    default: 'bg-[var(--primary-500)]',
    success: 'bg-[var(--success-500)]',
    warning: 'bg-[var(--warning-500)]',
    danger: 'bg-[var(--danger-500)]',
    info: 'bg-[var(--info-500)]',
    outline: 'bg-[var(--slate-400)]',
    muted: 'bg-[var(--slate-400)]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full border',
        variants[variant],
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  );
}

// ============================================================================
// Dialog / Modal
// ============================================================================
interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Dialog({ open, onClose, title, description, children, size = 'md' }: DialogProps) {
  if (!open) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        'relative bg-card rounded-xl border border-border shadow-xl animate-scale-in w-full mx-4',
        sizes[size]
      )}>
        {(title || description) && (
          <div className="px-6 pt-6 pb-0">
            {title && <h2 className="text-lg font-semibold text-foreground">{title}</h2>}
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ============================================================================
// Toast / Alert
// ============================================================================
interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
}

export function Alert({ type, title, message, onClose, className }: AlertProps) {
  const styles = {
    success: 'bg-[var(--success-50)] border-green-200 text-[var(--success-700)]',
    error: 'bg-[var(--danger-50)] border-red-200 text-[var(--danger-700)]',
    warning: 'bg-[var(--warning-50)] border-amber-200 text-[var(--warning-600)]',
    info: 'bg-[var(--info-50)] border-blue-200 text-[var(--info-600)]',
  };

  return (
    <div className={cn('flex items-start gap-3 p-4 rounded-lg border animate-slide-in', styles[type], className)}>
      <div className="flex-1 min-w-0">
        {title && <p className="font-medium text-sm">{title}</p>}
        <p className="text-sm mt-0.5">{message}</p>
      </div>
      {onClose && (
        <button onClick={onClose} className="shrink-0 hover:opacity-70 transition-opacity">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// ============================================================================
// Loading State
// ============================================================================
interface LoadingStateProps {
  message?: string;
  rows?: number;
}

export function LoadingState({ message, rows = 5 }: LoadingStateProps) {
  return (
    <div className="animate-fade-in">
      {message && (
        <div className="flex items-center gap-2 mb-4">
          <svg className="animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm text-muted-foreground">{message}</span>
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Error State
// ============================================================================
interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <div className="w-12 h-12 rounded-full bg-[var(--danger-50)] flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-[var(--danger-500)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">{message}</p>
      {onRetry && (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// Page Header
// ============================================================================
interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export function PageHeader({ title, description, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="mb-6 animate-fade-in">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="text-[var(--slate-300)]">/</span>}
              {crumb.href ? (
                <a href={crumb.href} className="hover:text-foreground transition-colors">
                  {crumb.label}
                </a>
              ) : (
                <span className="text-foreground font-medium">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

// ============================================================================
// Search / Filter Row
// ============================================================================
interface SearchFilterRowProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
}

export function SearchFilterRow({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  children,
}: SearchFilterRowProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
      <div className="relative flex-1">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full h-9 pl-9 pr-3 rounded-lg border border-input bg-white text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent"
        />
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

// ============================================================================
// Stat Card (for Dashboard)
// ============================================================================
interface StatCardProps {
  title: string;
  value: string;
  icon?: React.ReactNode;
  trend?: { value: string; positive: boolean };
  className?: string;
}

export function StatCard({ title, value, icon, trend, className }: StatCardProps) {
  return (
    <Card className={cn('animate-fade-in', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold text-foreground tracking-tight">{value}</p>
          {trend && (
            <p className={cn('mt-1 text-xs font-medium', trend.positive ? 'text-[var(--success-600)]' : 'text-[var(--danger-600)]')}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        {icon && (
          <div className="p-2.5 rounded-lg bg-accent text-[var(--primary-600)]">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// Tabs
// ============================================================================
interface TabsProps {
  tabs: { id: string; label: string; count?: number }[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
  return (
    <div className="flex items-center gap-1 border-b border-border mb-4 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px',
            activeTab === tab.id
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-[var(--slate-300)]'
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded-full',
              activeTab === tab.id
                ? 'bg-[var(--primary-100)] text-[var(--primary-700)]'
                : 'bg-[var(--slate-100)] text-muted-foreground'
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Pagination
// ============================================================================
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
}

export function Pagination({ currentPage, totalPages, onPageChange, totalItems, pageSize }: PaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * (pageSize || 10) + 1;
  const endItem = Math.min(currentPage * (pageSize || 10), totalItems || 0);

  return (
    <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
      {totalItems && (
        <p className="text-sm text-muted-foreground">
          Showing {startItem}–{endItem} of {totalItems}
        </p>
      )}
      <div className="flex items-center gap-1 ml-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          Previous
        </Button>
        {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
          const pageNum = i + 1;
          return (
            <Button
              key={pageNum}
              variant={currentPage === pageNum ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onPageChange(pageNum)}
              className="w-8"
            >
              {pageNum}
            </Button>
          );
        })}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
