import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  GitHubIcon,
  XIcon,
  InstagramIcon,
  LinkedInIcon,
} from '@/components/ui/icons';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-zinc-100/60 dark:bg-zinc-950/60 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Brand Info (Full width on mobile/tablet, 1 col on desktop) */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-1 space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-lg"
              aria-label="ASAPTools Homepage"
            >
              <div className="relative w-8 h-8 rounded-lg overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/10">
                <Image
                  src="/branding/asaptools-icon.png"
                  alt="ASAPTools icon"
                  width={32}
                  height={32}
                  className="object-cover"
                />
              </div>
              <span className="font-bold text-base tracking-tight text-foreground">
                ASAP<span className="text-orange-500 font-extrabold">Tools</span>
              </span>
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Fast, modern digital utilities engineered for speed, privacy, and zero unnecessary friction.
            </p>
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-zinc-900 border border-border shadow-2xs text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                  All systems operational
                </span>
              </span>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
              Product
            </h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <a href="#tools" className="hover:text-foreground transition-colors">
                  All Tools
                </a>
              </li>
              <li>
                <a href="#categories" className="hover:text-foreground transition-colors">
                  Categories
                </a>
              </li>
              <li>
                <a href="#ai-vision" className="hover:text-foreground transition-colors">
                  AI Vision
                </a>
              </li>
              <li>
                <a href="#tool-search" className="hover:text-foreground transition-colors">
                  Tool Index
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
              Resources
            </h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <a href="#why-asap" className="hover:text-foreground transition-colors">
                  About ASAPTools
                </a>
              </li>
              <li>
                <a href="#why-asap" className="hover:text-foreground transition-colors">
                  Privacy
                </a>
              </li>
              <li>
                <a href="#why-asap" className="hover:text-foreground transition-colors">
                  File Handling
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
              Contact
            </h3>
            <ul className="space-y-2.5 text-xs text-muted-foreground">
              <li>
                <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                  Support
                </span>
                <a
                  href="mailto:rohit@muzguy.in"
                  className="hover:text-foreground transition-colors font-mono hover:underline"
                >
                  rohit@muzguy.in
                </a>
              </li>
              <li>
                <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                  Feedback
                </span>
                <a
                  href="mailto:muzguy1@gmail.com"
                  className="hover:text-foreground transition-colors font-mono hover:underline"
                >
                  muzguy1@gmail.com
                </a>
              </li>
              <li>
                <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                  Business
                </span>
                <a
                  href="mailto:rohit@muzguy.in"
                  className="hover:text-foreground transition-colors font-mono hover:underline"
                >
                  rohit@muzguy.in
                </a>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
              Connect
            </h3>
            <ul className="space-y-2.5 text-xs text-muted-foreground">
              <li>
                <a
                  href="https://github.com/muzguy"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub profile (opens in a new tab)"
                  className="inline-flex items-center gap-2 hover:text-foreground transition-colors"
                >
                  <GitHubIcon size={15} className="text-zinc-500 dark:text-zinc-400" />
                  <span>GitHub</span>
                </a>
              </li>
              <li>
                <a
                  href="https://x.com/notmuzguy"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="X Twitter profile (opens in a new tab)"
                  className="inline-flex items-center gap-2 hover:text-foreground transition-colors"
                >
                  <XIcon size={14} className="text-zinc-500 dark:text-zinc-400" />
                  <span>X (Twitter)</span>
                </a>
              </li>
              <li>
                <a
                  href="https://instagram.com/muzguy"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram profile (opens in a new tab)"
                  className="inline-flex items-center gap-2 hover:text-foreground transition-colors"
                >
                  <InstagramIcon size={15} className="text-zinc-500 dark:text-zinc-400" />
                  <span>Instagram</span>
                </a>
              </li>
              <li>
                <a
                  href="https://linkedin.com/in/muzguy"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn profile (opens in a new tab)"
                  className="inline-flex items-center gap-2 hover:text-foreground transition-colors"
                >
                  <LinkedInIcon size={15} className="text-zinc-500 dark:text-zinc-400" />
                  <span>LinkedIn</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {currentYear} ASAPTools. All rights reserved.</p>
          <p className="text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
            asaptools.in
          </p>
        </div>
      </div>
    </footer>
  );
}
