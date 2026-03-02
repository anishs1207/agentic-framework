'use client';

import React from 'react';
import Link from 'next/link';
import AssetLibrary from '@/components/editor/AssetLibrary';
import Timeline from '@/components/editor/Timeline';
import VideoPlayer from '@/components/editor/VideoPlayer';
import PropertiesPanel from '@/components/editor/PropertiesPanel';
import ChatSidebar from '@/components/editor/ChatSidebar';
import ExportDialog from '@/components/editor/ExportDialog';
import { MonitorPlay, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/store/useEditorStore';

export default function EditorPage() {
  const { applyBrainrotLayout, setDuration, duration } = useEditorStore();

  return (
    <div className="h-screen w-screen flex flex-col bg-neutral-950 text-neutral-200 overflow-hidden font-sans">
      {/* Header */}
      <header className="h-12 bg-card border-b border-border flex items-center justify-between px-4 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
            <MonitorPlay className="text-white" size={16} />
          </div>
          <h1 className="text-white font-bold text-sm tracking-tight">
            AI Video <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Editor</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Duration Control */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Duration:</span>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 30))}
              className="w-14 h-7 bg-muted border border-border rounded px-2 text-foreground text-xs"
            />
            <span>sec</span>
          </div>

          <Link href="/ai-tools">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 gap-2 text-xs border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
            >
              <Wand2 size={12} />
              AI Tools
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={applyBrainrotLayout}
            className="h-7 px-3 gap-2 text-xs border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
          >
            <Sparkles size={12} />
            Brainrot
          </Button>

          <ExportDialog />
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Sidebar - Assets */}
        <AssetLibrary />

        {/* Center - Player & Timeline */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <VideoPlayer />
          <Timeline />
        </div>

        {/* Right Sidebar - Properties */}
        <PropertiesPanel />

        {/* AI Chat */}
        <ChatSidebar />
      </div>
    </div>
  );
}
