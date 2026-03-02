'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { Play, Pause, SkipBack, SkipForward, Monitor, Square, RectangleVertical, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

export default function VideoPlayer() {
    const {
        tracks,
        currentTime,
        isPlaying,
        setIsPlaying,
        setCurrentTime,
        duration,
        aspectRatio,
        setAspectRatio,
        selectedClipId,
        setSelectedClip,
        updateClip,
        assets
    } = useEditorStore();

    const requestRef = useRef<number>(0);
    const previousTimeRef = useRef<number>(0);
    const canvasRef = useRef<HTMLDivElement>(null);
    const [globalMuted, setGlobalMuted] = useState(false);
    const [globalVolume, setGlobalVolume] = useState(0.8);

    // Playback Animation Loop
    const animate = useCallback((time: number) => {
        if (previousTimeRef.current !== undefined) {
            const deltaTime = (time - previousTimeRef.current) / 1000;

            useEditorStore.setState((state) => {
                if (!state.isPlaying) return state;
                let nextTime = state.currentTime + deltaTime;
                if (nextTime >= state.duration) {
                    nextTime = 0;
                }
                return { currentTime: nextTime };
            });
        }
        previousTimeRef.current = time;
        if (useEditorStore.getState().isPlaying) {
            requestRef.current = requestAnimationFrame(animate);
        }
    }, []);

    useEffect(() => {
        if (isPlaying) {
            previousTimeRef.current = performance.now();
            requestRef.current = requestAnimationFrame(animate);
        } else {
            cancelAnimationFrame(requestRef.current);
        }
        return () => cancelAnimationFrame(requestRef.current);
    }, [isPlaying, animate]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    setIsPlaying(!useEditorStore.getState().isPlaying);
                    break;
                case 'ArrowLeft':
                    setCurrentTime(Math.max(0, useEditorStore.getState().currentTime - 0.5));
                    break;
                case 'ArrowRight':
                    setCurrentTime(Math.min(duration, useEditorStore.getState().currentTime + 0.5));
                    break;
                case 'KeyM':
                    setGlobalMuted(prev => !prev);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [duration, setCurrentTime, setIsPlaying]);

    // Get active clips at current time, sorted by layer
    const activeClips = tracks
        .filter(t => t.type === 'video' || t.type === 'image' || t.type === 'text')
        .flatMap(t => t.clips)
        .filter(clip => currentTime >= clip.startTime && currentTime < clip.startTime + clip.duration)
        .sort((a, b) => a.layer - b.layer);

    // Aspect ratio dimensions
    const getCanvasStyle = () => {
        switch (aspectRatio) {
            case '16:9': return { aspectRatio: '16/9' };
            case '1:1': return { aspectRatio: '1/1' };
            default: return { aspectRatio: '9/16' };
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-gradient-to-b from-neutral-900 to-neutral-950 relative overflow-hidden">
            {/* Canvas Area */}
            <div className="flex-1 flex items-center justify-center p-6 min-h-0">
                <div
                    ref={canvasRef}
                    className="bg-black rounded-xl relative overflow-hidden shadow-2xl border border-neutral-800/50 max-h-full ring-1 ring-white/5"
                    style={{ ...getCanvasStyle(), width: 'auto', height: '100%', maxWidth: '100%' }}
                >
                    {/* Grid overlay for positioning */}
                    <div className="absolute inset-0 pointer-events-none opacity-20" style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                        backgroundSize: '20% 20%'
                    }} />

                    {/* Empty State */}
                    {activeClips.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center text-neutral-600">
                            <div className="text-center">
                                <Monitor className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="text-sm font-medium">No active clips</p>
                                <p className="text-xs text-neutral-700 mt-1">Add media from the library</p>
                            </div>
                        </div>
                    )}

                    {/* Render Active Clips */}
                    {activeClips.map((clip) => {
                        const asset = assets.find(a => a.id === clip.assetId);

                        const style: React.CSSProperties = {
                            position: 'absolute',
                            left: `${clip.properties.x * 100}%`,
                            top: `${clip.properties.y * 100}%`,
                            transform: `translate(-50%, -50%) scale(${clip.properties.scale})`,
                            opacity: clip.properties.opacity,
                            cursor: 'move',
                            outline: selectedClipId === clip.id ? '2px solid #3b82f6' : 'none',
                            outlineOffset: '2px',
                            borderRadius: '4px',
                            transition: 'outline 0.15s ease',
                        };

                        if (clip.type === 'text') {
                            return (
                                <div
                                    key={clip.id}
                                    style={style}
                                    className="text-white font-bold text-2xl drop-shadow-lg whitespace-nowrap px-3 py-1.5 bg-black/40 backdrop-blur-sm rounded-lg"
                                    onClick={() => setSelectedClip(clip.id)}
                                >
                                    {clip.name}
                                </div>
                            );
                        }

                        if (clip.type === 'image' && asset) {
                            return (
                                <img
                                    key={clip.id}
                                    src={asset.src}
                                    style={{ ...style, maxWidth: '80%', maxHeight: '80%', width: 'auto', height: 'auto' }}
                                    alt={clip.name}
                                    onClick={() => setSelectedClip(clip.id)}
                                    draggable={false}
                                />
                            );
                        }

                        if (clip.type === 'video' && asset) {
                            return (
                                <SyncVideo
                                    key={clip.id}
                                    src={asset.src}
                                    currentTime={currentTime}
                                    offset={clip.startTime}
                                    startOffset={clip.startOffset}
                                    style={{ ...style, maxWidth: '100%', maxHeight: '100%' }}
                                    isPlaying={isPlaying}
                                    volume={globalMuted ? 0 : globalVolume * (clip.properties.volume ?? 1)}
                                    isSelected={selectedClipId === clip.id}
                                    onSelect={() => setSelectedClip(clip.id)}
                                />
                            );
                        }

                        return null;
                    })}
                </div>
            </div>

            {/* Playback Controls */}
            <div className="h-16 bg-card/80 backdrop-blur-sm border-t border-border flex items-center justify-between gap-4 px-4 shrink-0">
                {/* Left - Volume */}
                <div className="flex items-center gap-2 w-32">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setGlobalMuted(!globalMuted)}
                    >
                        {globalMuted || globalVolume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </Button>
                    <Slider
                        value={[globalMuted ? 0 : globalVolume]}
                        max={1}
                        min={0}
                        step={0.05}
                        onValueChange={([val]) => { setGlobalVolume(val); if (val > 0) setGlobalMuted(false); }}
                        className="w-20"
                    />
                </div>

                {/* Center - Transport Controls */}
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentTime(0)}>
                        <SkipBack size={16} />
                    </Button>
                    <Button
                        variant="default"
                        size="icon"
                        className="h-11 w-11 rounded-full shadow-lg"
                        onClick={() => setIsPlaying(!isPlaying)}
                    >
                        {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentTime(Math.min(duration, currentTime + 5))}>
                        <SkipForward size={16} />
                    </Button>
                </div>

                {/* Right - Scrubber & Aspect */}
                <div className="flex-1 max-w-lg flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground w-10 text-right tabular-nums">
                        {formatTime(currentTime)}
                    </span>
                    <Slider
                        value={[currentTime]}
                        max={duration}
                        min={0}
                        step={0.05}
                        onValueChange={([val]) => setCurrentTime(val)}
                        className="flex-1"
                    />
                    <span className="text-xs font-mono text-muted-foreground w-10 tabular-nums">
                        {formatTime(duration)}
                    </span>

                    {/* Aspect Ratio Toggle */}
                    <div className="flex items-center gap-0.5 ml-2 bg-muted rounded-lg p-0.5">
                        <Button
                            variant={aspectRatio === '9:16' ? 'secondary' : 'ghost'}
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setAspectRatio('9:16')}
                            title="9:16 (Vertical)"
                        >
                            <RectangleVertical size={12} />
                        </Button>
                        <Button
                            variant={aspectRatio === '1:1' ? 'secondary' : 'ghost'}
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setAspectRatio('1:1')}
                            title="1:1 (Square)"
                        >
                            <Square size={12} />
                        </Button>
                        <Button
                            variant={aspectRatio === '16:9' ? 'secondary' : 'ghost'}
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setAspectRatio('16:9')}
                            title="16:9 (Landscape)"
                        >
                            <Monitor size={12} />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Synced Video Component with Audio
function SyncVideo({
    src,
    currentTime,
    offset,
    startOffset,
    style,
    isPlaying,
    volume,
    isSelected,
    onSelect
}: {
    src: string;
    currentTime: number;
    offset: number;
    startOffset: number;
    style: React.CSSProperties;
    isPlaying: boolean;
    volume: number;
    isSelected: boolean;
    onSelect: () => void;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);

    // Sync video time
    useEffect(() => {
        if (videoRef.current) {
            const targetTime = currentTime - offset + startOffset;
            // Only seek if more than 0.15s out of sync to avoid jitter
            if (Math.abs(videoRef.current.currentTime - targetTime) > 0.15) {
                videoRef.current.currentTime = Math.max(0, targetTime);
            }
        }
    }, [currentTime, offset, startOffset]);

    // Sync play/pause state
    useEffect(() => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.play().catch(() => { });
            } else {
                videoRef.current.pause();
            }
        }
    }, [isPlaying]);

    // Sync volume
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = Math.max(0, Math.min(1, volume));
        }
    }, [volume]);

    return (
        <video
            ref={videoRef}
            src={src}
            style={style}
            playsInline
            onClick={onSelect}
            draggable={false}
            className="object-contain"
        />
    );
}

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
}
