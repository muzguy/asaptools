import React from 'react';
import { Hero } from '@/components/home/hero';
import { ToolExplorer } from '@/components/home/tool-explorer';
import { AICapabilities } from '@/components/home/ai-capabilities';
import { WhyASAP } from '@/components/home/why-asap';

export default function Home() {
  return (
    <div className="flex flex-col min-h-full">
      {/* Hero with value proposition */}
      <Hero />

      {/* Prominent Tool Search, Category Explorer, and Tool Grid */}
      <ToolExplorer />

      {/* AI Vision & Capabilities */}
      <AICapabilities />

      {/* Core Principles & Privacy Guarantee */}
      <WhyASAP />
    </div>
  );
}
