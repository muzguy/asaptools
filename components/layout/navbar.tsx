import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { SearchIcon } from '@/components/ui/icons';
import { MobileNav } from '@/components/layout/mobile-nav';
import { ThemeToggle } from '@/components/theme/theme-toggle';

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/80 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-lg"
          aria-label="ASAPTools Homepage"
        >
          <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/10 group-hover:scale-105 transition-transform duration-200">
            <Image
              src="/branding/asaptools-icon.png"
              alt="ASAPTools icon"
              width={36}
              height={36}
              className="object-cover"
              priority
            />
          </div>
          <span className="font-bold text-lg tracking-tight text-foreground flex items-center">
            ASAP
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500 font-extrabold ml-0.5">
              Tools
            </span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-muted-foreground">
          <Link
            href="#tools"
            className="hover:text-foreground transition-colors hover:underline underline-offset-4 decoration-orange-500/50"
          >
            All Tools
          </Link>
          <Link
            href="#categories"
            className="hover:text-foreground transition-colors hover:underline underline-offset-4 decoration-orange-500/50"
          >
            Categories
          </Link>
          <Link
            href="#ai-vision"
            className="hover:text-foreground transition-colors hover:underline underline-offset-4 decoration-orange-500/50"
          >
            AI Vision
          </Link>
          <Link
            href="#why-asap"
            className="hover:text-foreground transition-colors hover:underline underline-offset-4 decoration-orange-500/50"
          >
            Why ASAPTools
          </Link>
        </nav>

        {/* Right side Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <a
            href="#tool-search"
            className="hidden sm:inline-flex items-center gap-2 text-xs font-medium text-muted-foreground bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 border border-border px-3 py-1.5 rounded-xl transition-colors"
          >
            <SearchIcon size={14} className="text-zinc-500 dark:text-zinc-400" />
            <span>Search tools</span>
            <kbd className="hidden lg:inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-zinc-900 border border-border font-mono text-zinc-500">
              /
            </kbd>
          </a>

          {/* Theme Switcher Toggle */}
          <ThemeToggle />

          <MobileNav />
        </div>
      </div>
    </header>
  );
}
