'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    // Sync initial theme with DOM (which was already set synchronously by head script)
    const timer = setTimeout(() => {
      const isDark = document.documentElement.classList.contains('dark');
      setThemeState(isDark ? 'dark' : 'light');
    }, 0);

    // Listen for OS color scheme preference changes if user hasn't explicitly set a preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
      try {
        const saved = localStorage.getItem('asaptools-theme');
        if (!saved) {
          const systemDark = e.matches;
          if (systemDark) {
            document.documentElement.classList.add('dark');
            setThemeState('dark');
          } else {
            document.documentElement.classList.remove('dark');
            setThemeState('light');
          }
        }
      } catch {}
    };

    const legacyMediaQuery = mediaQuery as unknown as {
      addListener?: (cb: (e: MediaQueryListEvent | MediaQueryList) => void) => void;
      removeListener?: (cb: (e: MediaQueryListEvent | MediaQueryList) => void) => void;
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleMediaChange);
      return () => {
        clearTimeout(timer);
        mediaQuery.removeEventListener('change', handleMediaChange);
      };
    } else if (typeof legacyMediaQuery.addListener === 'function') {
      legacyMediaQuery.addListener(handleMediaChange);
      return () => {
        clearTimeout(timer);
        legacyMediaQuery.removeListener?.(handleMediaChange);
      };
    }

    return () => clearTimeout(timer);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);

    try {
      localStorage.setItem('asaptools-theme', newTheme);
    } catch {}

    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    const nextTheme: Theme = isCurrentlyDark ? 'light' : 'dark';
    setTheme(nextTheme);
  }, [setTheme]);

  const value = useMemo(
    () => ({
      theme,
      toggleTheme,
      setTheme,
    }),
    [theme, toggleTheme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
