'use client';

import React, { useState, useEffect } from 'react';
import {
    Sparkles,
    Scissors,
    Palette,
    Languages,
    Home,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import Link from 'next/link';
import AutoCutPanel from '@/components/editor/AutoCutPanel';
import BrainrotPanel from '@/components/editor/BrainrotPanel';
import ColorCorrectionPanel from '@/components/editor/ColorCorrectionPanel';
import TranscriptionPanel from '@/components/editor/TranscriptionPanel';
import { videoAPI } from '@/lib/videoApi';

export default function AIToolsPage() {
    const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
    const [activeTab, setActiveTab] = useState('autocut');

    useEffect(() => {
        const checkBackend = async () => {
            try {
                const isHealthy = await videoAPI.healthCheck();
                setBackendStatus(isHealthy ? 'online' : 'offline');
            } catch {
                setBackendStatus('offline');
            }
        };

        checkBackend();
        // Check every 30 seconds
        const interval = setInterval(checkBackend, 30000);
        return () => clearInterval(interval);
    }, []);

    const tools = [
        {
            id: 'autocut',
            name: 'Auto-Cut',
            icon: Scissors,
            color: 'text-blue-400',
            description: 'Remove silence & dead air'
        },
        {
            id: 'transcription',
            name: 'Transcribe',
            icon: Languages,
            color: 'text-cyan-400',
            description: 'AI-powered subtitles'
        },
        {
            id: 'brainrot',
            name: 'Brainrot',
            icon: Sparkles,
            color: 'text-purple-400',
            description: 'Split-screen gameplay'
        },
        {
            id: 'color',
            name: 'Color Grade',
            icon: Palette,
            color: 'text-orange-400',
            description: 'Professional color correction'
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-neutral-200">
            {/* Header */}
            <header className="h-16 bg-card/50 backdrop-blur-md border-b border-border sticky top-0 z-50">
                <div className="max-w-6xl mx-auto h-full flex items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="ghost" size="sm" className="gap-2">
                                <Home size={16} />
                                Editor
                            </Button>
                        </Link>
                        <div className="h-6 w-px bg-border" />
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg">
                                <Zap className="text-white" size={16} />
                            </div>
                            <h1 className="text-lg font-bold">
                                AI <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Tools</span>
                            </h1>
                        </div>
                    </div>

                    {/* Backend Status */}
                    <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full ${backendStatus === 'online'
                            ? 'bg-green-500/10 text-green-400'
                            : backendStatus === 'offline'
                                ? 'bg-red-500/10 text-red-400'
                                : 'bg-neutral-500/10 text-neutral-400'
                        }`}>
                        {backendStatus === 'checking' && (
                            <>
                                <Loader2 size={12} className="animate-spin" />
                                Connecting...
                            </>
                        )}
                        {backendStatus === 'online' && (
                            <>
                                <CheckCircle2 size={12} />
                                Backend Online
                            </>
                        )}
                        {backendStatus === 'offline' && (
                            <>
                                <AlertCircle size={12} />
                                Backend Offline
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-6 py-8">
                {/* Offline Warning */}
                {backendStatus === 'offline' && (
                    <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={20} />
                            <div>
                                <h3 className="font-semibold text-red-400">Backend Server Offline</h3>
                                <p className="text-sm text-red-400/80 mt-1">
                                    The Python backend is required for AI features. Start it with:
                                </p>
                                <pre className="bg-neutral-900 rounded-lg p-3 mt-2 text-xs font-mono text-neutral-300 overflow-x-auto">
                                    cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload
                                </pre>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tool Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="bg-card/50 backdrop-blur-md border border-border p-1 rounded-xl grid grid-cols-4 h-auto">
                        {tools.map((tool) => {
                            const Icon = tool.icon;
                            return (
                                <TabsTrigger
                                    key={tool.id}
                                    value={tool.id}
                                    className="flex flex-col items-center gap-1.5 py-3 rounded-lg data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-500/20 data-[state=active]:to-pink-500/20"
                                >
                                    <Icon size={20} className={activeTab === tool.id ? tool.color : 'text-muted-foreground'} />
                                    <span className="text-xs font-medium">{tool.name}</span>
                                    <span className="text-[10px] text-muted-foreground hidden sm:block">{tool.description}</span>
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>

                    <TabsContent value="autocut" className="mt-6">
                        <div className="max-w-2xl mx-auto">
                            <AutoCutPanel />
                        </div>
                    </TabsContent>

                    <TabsContent value="transcription" className="mt-6">
                        <div className="max-w-2xl mx-auto">
                            <TranscriptionPanel />
                        </div>
                    </TabsContent>

                    <TabsContent value="brainrot" className="mt-6">
                        <div className="max-w-2xl mx-auto">
                            <BrainrotPanel />
                        </div>
                    </TabsContent>

                    <TabsContent value="color" className="mt-6">
                        <div className="max-w-2xl mx-auto">
                            <ColorCorrectionPanel />
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Feature Cards */}
                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-5">
                        <Scissors className="text-blue-400 mb-3" size={24} />
                        <h3 className="font-semibold text-sm mb-1">Smart Auto-Cut</h3>
                        <p className="text-xs text-muted-foreground">
                            Automatically detect and remove silence, filler words, and dead air from your videos.
                        </p>
                    </div>
                    <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/20 rounded-xl p-5">
                        <Languages className="text-cyan-400 mb-3" size={24} />
                        <h3 className="font-semibold text-sm mb-1">Whisper Transcription</h3>
                        <p className="text-xs text-muted-foreground">
                            Get word-level timestamps with OpenAI Whisper. Export to SRT for subtitles.
                        </p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-5">
                        <Sparkles className="text-purple-400 mb-3" size={24} />
                        <h3 className="font-semibold text-sm mb-1">Brainrot Mode</h3>
                        <p className="text-xs text-muted-foreground">
                            Stack gameplay (Subway Surfers, satisfying videos) with your content for viral appeal.
                        </p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl p-5">
                        <Palette className="text-orange-400 mb-3" size={24} />
                        <h3 className="font-semibold text-sm mb-1">Color Grading</h3>
                        <p className="text-xs text-muted-foreground">
                            Professional color correction with presets. Adjust brightness, contrast, temperature.
                        </p>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-border mt-12 py-6">
                <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-xs text-muted-foreground">
                    <span>AI Video Editor • Powered by MoviePy, OpenCV, Whisper</span>
                    <span>Short-form content optimized (9:16)</span>
                </div>
            </footer>
        </div>
    );
}
