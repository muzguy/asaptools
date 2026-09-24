'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MenuIcon, CloseIcon, SearchIcon } from '@/components/ui/icons';
import { ThemeToggle } from '@/components/theme/theme-toggle';

interface MobileNavProps {
  onSearchClick?: () => void;
}

export function MobileNav({ onSearchClick }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => setIsOpen((prev) => !prev);
  const closeMenu = () => setIsOpen(false);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <div className="md:hidden">
      {/* Mobile Hamburger / Close Trigger */}
      <button
        onClick={toggleOpen}
        type="button"
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={isOpen}
        aria-controls="mobile-nav-dialog"
        className="w-10 h-10 rounded-xl border border-border text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center touch-manipulation cursor-pointer shrink-0"
      >
        {isOpen ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
      </button>

      {/* Backdrop overlay & Dropdown Menu */}
      {isOpen && (
        <>
          {/* Tap-outside Backdrop */}
          <div
            className="fixed inset-0 top-16 z-40 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={closeMenu}
            aria-hidden="true"
          />

          {/* Menu Drawer */}
          <div
            id="mobile-nav-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
            className="fixed inset-x-0 top-16 z-50 bg-card border-b border-border shadow-2xl px-6 py-6 transition-all duration-200 animate-in fade-in slide-in-from-top-2"
          >
            <nav className="flex flex-col space-y-4">
              <Link
                href="#tools"
                onClick={closeMenu}
                className="text-base font-semibold text-foreground hover:text-orange-500 py-1 transition-colors"
              >
                All Tools
              </Link>
              <Link
                href="#categories"
                onClick={closeMenu}
                className="text-base font-semibold text-foreground hover:text-orange-500 py-1 transition-colors"
              >
                Categories
              </Link>
              <Link
                href="#ai-vision"
                onClick={closeMenu}
                className="text-base font-semibold text-foreground hover:text-orange-500 py-1 transition-colors"
              >
                AI Vision
              </Link>
              <Link
                href="#why-asap"
                onClick={closeMenu}
                className="text-base font-semibold text-foreground hover:text-orange-500 py-1 transition-colors"
              >
                Why ASAPTools
              </Link>

              <div className="pt-4 border-t border-border space-y-3">
                <a
                  href="#tool-search"
                  onClick={() => {
                    closeMenu();
                    if (onSearchClick) onSearchClick();
                  }}
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold text-sm transition-opacity hover:opacity-90 touch-manipulation shadow-xs"
                >
                  <SearchIcon size={16} />
                  <span>Search Tools</span>
                </a>

                <div>
                  <ThemeToggle showLabel className="py-3" />
                </div>
              </div>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
