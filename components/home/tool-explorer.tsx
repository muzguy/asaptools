'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  TOOLS_REGISTRY,
  CATEGORIES,
  ToolItem,
  ToolCategory,
} from '@/lib/tools-registry';
import { ToolCard } from '@/components/home/tool-card';
import { SearchIcon, CloseIcon, renderToolIcon, ShieldIcon, ZapIcon } from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';

export function ToolExplorer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory>('all');
  const [activeModalTool, setActiveModalTool] = useState<ToolItem | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: '/' or 'Cmd/Ctrl + K' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key === 'k')) &&
        document.activeElement !== searchInputRef.current
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === 'Escape') {
        if (activeModalTool) {
          setActiveModalTool(null);
        } else if (document.activeElement === searchInputRef.current) {
          setSearchQuery('');
          searchInputRef.current?.blur();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModalTool]);

  // Lock body scroll when roadmap detail modal is active
  useEffect(() => {
    if (activeModalTool) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activeModalTool]);

  // Filter tools based on query and category
  const filteredTools = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return TOOLS_REGISTRY.filter((tool) => {
      const matchesCategory =
        selectedCategory === 'all' || tool.category === selectedCategory;

      if (!matchesCategory) return false;
      if (!query) return true;

      const matchesName = tool.name.toLowerCase().includes(query);
      const matchesDesc = tool.description.toLowerCase().includes(query);
      const matchesKeywords = tool.keywords.some((kw) =>
        kw.toLowerCase().includes(query)
      );

      return matchesName || matchesDesc || matchesKeywords;
    });
  }, [searchQuery, selectedCategory]);

  // Featured tools (top flagship tools)
  const featuredTools = useMemo(() => {
    return TOOLS_REGISTRY.filter((t) => t.isFeatured);
  }, []);

  const isDefaultView = searchQuery === '' && selectedCategory === 'all';

  return (
    <section id="tools" className="py-8 sm:py-12 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Prominent Search Bar */}
        <div id="tool-search" className="max-w-3xl mx-auto mb-8 scroll-mt-24">
          <div className="relative group">
            {/* Ambient decorative glow with pointer-events-none */}
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-orange-500/20 via-amber-500/10 to-orange-500/20 blur-md opacity-40 group-hover:opacity-75 transition-opacity pointer-events-none" />
            <div className="relative flex items-center bg-card rounded-2xl border border-border shadow-sm group-hover:border-zinc-400 dark:group-hover:border-zinc-700 transition-colors">
              <div className="pl-4 pr-2 text-muted-foreground flex items-center pointer-events-none">
                <SearchIcon size={20} className="text-zinc-500" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tools (e.g., JSON, word counter, PDF, image compressor)..."
                className="w-full py-3.5 sm:py-4 bg-transparent text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
                aria-label="Search tools"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="pr-4 text-muted-foreground hover:text-foreground transition-colors p-2 touch-manipulation cursor-pointer"
                  aria-label="Clear search query"
                >
                  <CloseIcon size={18} />
                </button>
              ) : (
                <div className="hidden sm:flex items-center gap-1 pr-4 text-xs text-muted-foreground pointer-events-none">
                  <kbd className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 border border-border font-mono text-[11px] text-zinc-500">
                    /
                  </kbd>
                  <span className="text-[11px] text-zinc-500">to search</span>
                </div>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="mt-4 flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-all touch-manipulation cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800/80 text-muted-foreground hover:text-foreground border border-transparent hover:border-border'
              }`}
            >
              All Tools
            </button>
            {CATEGORIES.map((cat) => (
              <button
                type="button"
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-all touch-manipulation cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                    : 'bg-zinc-100 dark:bg-zinc-800/80 text-muted-foreground hover:text-foreground border border-transparent hover:border-border'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Display */}
        {isDefaultView ? (
          <div className="space-y-16">
            {/* Section 1: Popular / Featured Tools */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
                    Popular Utilities
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    The most requested digital tools, optimized for everyday workflows.
                  </p>
                </div>
                <Badge variant="brand">High Priority</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {featuredTools.map((tool) => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    onSelect={(t) => setActiveModalTool(t)}
                  />
                ))}
              </div>
            </div>

            {/* Section 2: Tool Categories Overview */}
            <div id="categories" className="scroll-mt-20">
              <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                  Browse by Category
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Discover focused suites organized by digital workflow.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {CATEGORIES.map((cat) => {
                  const count = TOOLS_REGISTRY.filter(
                    (t) => t.category === cat.id
                  ).length;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        document.getElementById('tool-search')?.scrollIntoView({
                          behavior: 'smooth',
                        });
                      }}
                      className="group p-5 rounded-2xl border border-border bg-card hover:border-orange-500/40 hover:shadow-md transition-all cursor-pointer text-left w-full touch-manipulation focus-visible:ring-2 focus-visible:ring-orange-500 outline-none"
                    >
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shrink-0">
                        {renderToolIcon(cat.icon, 'w-5 h-5')}
                      </div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-base text-foreground group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                          {cat.name}
                        </h3>
                        <span className="text-xs font-mono text-muted-foreground bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                          {count} {count === 1 ? 'tool' : 'tools'}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                        {cat.description}
                      </p>
                      <div className="mt-3 text-xs font-medium text-orange-600 dark:text-orange-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        <span>Explore category →</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Filtered Results View */
          <div>
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  Showing {filteredTools.length}{' '}
                  {filteredTools.length === 1 ? 'utility' : 'utilities'}
                </span>
                {selectedCategory !== 'all' && (
                  <Badge variant="brand" className="capitalize">
                    {selectedCategory}
                  </Badge>
                )}
                {searchQuery && (
                  <span className="text-xs text-muted-foreground">
                    matching &ldquo;{searchQuery}&rdquo;
                  </span>
                )}
              </div>

              {(searchQuery || selectedCategory !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  className="text-xs text-orange-600 dark:text-orange-400 hover:underline font-semibold touch-manipulation cursor-pointer p-1"
                >
                  Reset filters
                </button>
              )}
            </div>

            {filteredTools.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredTools.map((tool) => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    onSelect={(t) => setActiveModalTool(t)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 px-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-dashed border-border max-w-lg mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto mb-3">
                  <SearchIcon size={24} />
                </div>
                <h3 className="font-semibold text-foreground text-base">
                  No tools found
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  We could not find anything matching &ldquo;{searchQuery}&rdquo;.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  className="mt-4 px-4 py-2.5 text-xs font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 rounded-xl hover:opacity-90 transition-opacity touch-manipulation cursor-pointer"
                >
                  Clear search filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Roadmap Detail Modal for In-Development Tools */}
      {activeModalTool && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setActiveModalTool(null)}
          aria-hidden="true"
        >
          <div
            className="relative w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl p-5 sm:p-6 text-card-foreground animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tool-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveModalTool(null)}
              className="absolute top-3.5 right-3.5 w-10 h-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center touch-manipulation cursor-pointer"
              aria-label="Close dialog"
            >
              <CloseIcon size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4 pr-8">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-500/20 shrink-0">
                {renderToolIcon(activeModalTool.icon, 'w-6 h-6')}
              </div>
              <div>
                <h3
                  id="tool-modal-title"
                  className="font-bold text-lg text-foreground tracking-tight"
                >
                  {activeModalTool.name}
                </h3>
                <span className="text-xs text-muted-foreground capitalize">
                  {activeModalTool.category} category
                </span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              {activeModalTool.description}
            </p>

            <div className="space-y-2.5 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-border text-xs mb-5">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <ZapIcon size={14} className="text-orange-500 shrink-0" />
                <span>Roadmap Status: Phase 2 In Progress</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                This tool is currently undergoing active engineering and security validation. The dedicated route and interface will be published in the upcoming release.
              </p>
              <div className="flex items-center gap-2 pt-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <ShieldIcon size={14} className="shrink-0" />
                <span>Client-side, privacy-preserving design</span>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setActiveModalTool(null)}
                className="w-full py-3 px-4 text-xs font-semibold rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-90 transition-opacity touch-manipulation cursor-pointer shadow-xs"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
