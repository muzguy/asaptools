'use client';

import React from 'react';
import { ToolItem } from '@/lib/tools-registry';
import { renderToolIcon } from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';

interface ToolCardProps {
  tool: ToolItem;
  onSelect?: (tool: ToolItem) => void;
}

export function ToolCard({ tool, onSelect }: ToolCardProps) {
  const isAvailable = tool.status === 'available';

  return (
    <button
      type="button"
      onClick={() => onSelect?.(tool)}
      className={`group relative flex flex-col justify-between p-5 rounded-2xl border transition-all duration-200 text-left bg-card text-card-foreground outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer touch-manipulation w-full ${
        isAvailable
          ? 'border-border hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/5 hover:-translate-y-0.5'
          : 'border-border/80 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md'
      }`}
    >
      <div className="w-full">
        {/* Header: Icon & Badges */}
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800/90 text-zinc-900 dark:text-zinc-100 flex items-center justify-center border border-border/80 group-hover:border-orange-500/30 group-hover:bg-orange-500/10 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors shrink-0">
            {renderToolIcon(tool.icon, 'w-5 h-5')}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {tool.badge === 'Popular' && (
              <Badge variant="brand">Popular</Badge>
            )}
            {!isAvailable && (
              <Badge variant="muted">Phase 2</Badge>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-base text-foreground group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors tracking-tight">
          {tool.name}
        </h3>

        {/* Description */}
        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {tool.description}
        </p>
      </div>

      {/* Footer Meta */}
      <div className="w-full mt-4 pt-3.5 border-t border-border/60 flex items-center justify-between text-xs">
        <span className="capitalize text-zinc-600 dark:text-zinc-400 font-medium">
          {tool.category}
        </span>
        <span className="font-medium text-orange-600 dark:text-orange-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
          {isAvailable ? 'Launch tool →' : 'Roadmap specs →'}
        </span>
      </div>
    </button>
  );
}
