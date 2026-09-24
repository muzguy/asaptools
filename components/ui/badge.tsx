import React from 'react';

export type BadgeVariant = 'brand' | 'muted' | 'outline' | 'amber' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  size?: 'sm' | 'md';
}

export function Badge({
  children,
  variant = 'neutral',
  className = '',
  size = 'sm',
}: BadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  const variantClasses = {
    brand:
      'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 font-medium',
    amber:
      'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-medium',
    muted:
      'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/80',
    outline:
      'bg-transparent text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800',
    neutral:
      'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/60 font-medium',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full tracking-wide transition-colors ${sizeClasses} ${variantClasses} ${className}`}
    >
      {children}
    </span>
  );
}
