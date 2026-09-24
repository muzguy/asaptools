'use client';

import React from 'react';
import { useTheme } from '@/components/theme/theme-context';
import { SunIcon, MoonIcon } from '@/components/ui/icons';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={`group relative flex items-center justify-center rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer touch-manipulation min-w-[40px] min-h-[40px] ${
        showLabel ? 'px-3 py-2.5 gap-2.5 text-xs font-semibold w-full justify-start' : 'w-10 h-10'
      } ${className}`}
    >
      <span className="relative flex items-center justify-center pointer-events-none shrink-0">
        {isDark ? (
          <SunIcon
            size={18}
            className="text-amber-400 group-hover:rotate-45 group-hover:text-amber-300 transition-transform duration-300"
          />
        ) : (
          <MoonIcon
            size={18}
            className="text-zinc-600 dark:text-zinc-400 group-hover:-rotate-12 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-transform duration-300"
          />
        )}
      </span>

      {showLabel && (
        <span className="text-xs font-semibold text-foreground">
          {isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        </span>
      )}
    </button>
  );
}
