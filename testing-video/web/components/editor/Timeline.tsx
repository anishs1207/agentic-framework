'use client';

import { useRef, useState, useEffect } from 'react';
import { useEditorStore, Clip } from '@/store/useEditorStore';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Video, Music, Type, GripVertical, Image as ImageIcon, ZoomIn, ZoomOut, Scissors } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Timeline() {
    const {
        tracks,
        duration,
        currentTime,
        setCurrentTime,
        selectedClipId,
        setSelectedClip,
        timelineZoom,
        setTimelineZoom,
        moveClip,
        splitClip
    } = useEditorStore();

    const timelineRef = useRef<HTMLDivElement>(null);

    const handleTimelineClick = (e: React.MouseEvent) => {
        if (!timelineRef.current) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const newTime = Math.max(0, Math.min(duration, x / timelineZoom));
        setCurrentTime(newTime);
    };

    const handleSplitAtPlayhead = () => {
        // Find clip under playhead
        for (const track of tracks) {
            const clip = track.clips.find(c =>
                currentTime > c.startTime && currentTime < c.startTime + c.duration
            );
            if (clip) {
                splitClip(track.id, clip.id, currentTime);
                break;
            }
        }
    };

    // Generate time markers
    const timeMarkers = [];
    const markerInterval = timelineZoom >= 60 ? 1 : timelineZoom >= 30 ? 2 : 5;
    for (let t = 0; t <= duration; t += markerInterval) {
        timeMarkers.push(t);
    }

    return (
        <div className="h-64 bg-card border-t border-border flex flex-col select-none">
            {/* Timeline Toolbar */}
            <div className="h-10 bg-muted/50 border-b border-border flex items-center justify-between px-3 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground w-16">
                        {formatTime(currentTime)}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 gap-1"
                        onClick={handleSplitAtPlayhead}
                    >
                        <Scissors size={12} /> Split
                    </Button>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setTimelineZoom(timelineZoom - 10)}
                    >
                        <ZoomOut size={14} />
                    </Button>
                    <span className="text-xs text-muted-foreground w-12 text-center">{timelineZoom}px/s</span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setTimelineZoom(timelineZoom + 10)}
                    >
                        <ZoomIn size={14} />
                    </Button>
                </div>
            </div>

            {/* Tracks Container */}
            <div className="flex-1 flex overflow-hidden">
                {/* Track Headers */}
                <div className="w-28 flex-shrink-0 bg-card border-r border-border z-10">
                    {tracks.map(track => (
                        <div key={track.id} className="h-14 border-b border-border px-2 flex items-center gap-2 group">
                            {track.type === 'video' && <Video size={12} className="text-blue-400" />}
                            {track.type === 'audio' && <Music size={12} className="text-green-400" />}
                            {track.type === 'image' && <ImageIcon size={12} className="text-yellow-400" />}
                            {track.type === 'text' && <Type size={12} className="text-purple-400" />}
                            <span className="text-[10px] font-medium text-muted-foreground capitalize truncate">
                                {track.type}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Scrollable Timeline */}
                <ScrollArea className="flex-1 bg-background">
                    <div
                        className="relative"
                        style={{ width: `${duration * timelineZoom}px`, minHeight: '100%' }}
                        ref={timelineRef}
                    >
                        {/* Time Ruler */}
                        <div
                            className="h-6 border-b border-border sticky top-0 bg-muted/80 backdrop-blur-sm z-20 cursor-crosshair"
                            onClick={handleTimelineClick}
                        >
                            {timeMarkers.map(t => (
                                <div
                                    key={t}
                                    className="absolute top-0 h-full flex flex-col justify-end"
                                    style={{ left: `${t * timelineZoom}px` }}
                                >
                                    <div className="h-2 w-px bg-border" />
                                    <span className="text-[8px] text-muted-foreground ml-1">{formatTime(t)}</span>
                                </div>
                            ))}
                        </div>

                        {/* Playhead */}
                        <div
                            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none"
                            style={{ left: `${currentTime * timelineZoom}px` }}
                        >
                            <div className="absolute -top-0 -left-1.5 w-3 h-3 bg-red-500 rounded-sm" />
                        </div>

                        {/* Tracks */}
                        {tracks.map((track, trackIdx) => (
                            <div
                                key={track.id}
                                className="h-14 border-b border-border relative"
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    const data = e.dataTransfer.getData('clip-move');
                                    if (data) {
                                        const { clipId, fromTrackId } = JSON.parse(data);
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const x = e.clientX - rect.left;
                                        const newTime = Math.max(0, x / timelineZoom);
                                        moveClip(fromTrackId, track.id, clipId, newTime);
                                    }
                                }}
                            >
                                {track.clips.map(clip => (
                                    <ClipItem
                                        key={clip.id}
                                        clip={clip}
                                        trackId={track.id}
                                        isSelected={selectedClipId === clip.id}
                                        onSelect={() => setSelectedClip(clip.id)}
                                        pixelsPerSecond={timelineZoom}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </div>
        </div>
    );
}

function ClipItem({
    clip,
    trackId,
    isSelected,
    onSelect,
    pixelsPerSecond
}: {
    clip: Clip;
    trackId: string;
    isSelected: boolean;
    onSelect: () => void;
    pixelsPerSecond: number;
}) {
    const { moveClip, updateClip } = useEditorStore();
    const [isDragging, setIsDragging] = useState(false);

    const bgColor = clip.type === 'video' ? 'bg-blue-600/30 border-blue-500/50' :
        clip.type === 'audio' ? 'bg-green-600/30 border-green-500/50' :
            clip.type === 'image' ? 'bg-yellow-600/30 border-yellow-500/50' :
                'bg-purple-600/30 border-purple-500/50';

    return (
        <div
            className={`absolute top-1 bottom-1 rounded cursor-grab active:cursor-grabbing border transition-transform ${bgColor} ${isSelected ? 'ring-2 ring-primary z-20' : 'hover:brightness-110'
                } ${isDragging ? 'opacity-50 scale-105' : 'hover:scale-[1.02]'}`}
            style={{
                left: `${clip.startTime * pixelsPerSecond}px`,
                width: `${Math.max(clip.duration * pixelsPerSecond, 20)}px`
            }}
            onClick={(e) => {
                e.stopPropagation();
                onSelect();
            }}
            draggable
            onDragStart={(e) => {
                setIsDragging(true);
                e.dataTransfer.setData('clip-move', JSON.stringify({ clipId: clip.id, fromTrackId: trackId }));
                e.dataTransfer.effectAllowed = 'move';
            }}
            onDragEnd={() => setIsDragging(false)}
        >
            <div className="w-full h-full px-1.5 flex items-center overflow-hidden">
                <span className="text-[9px] text-white/90 font-medium truncate">
                    {clip.name}
                </span>
            </div>

            {/* Resize Handles */}
            {isSelected && (
                <>
                    <div
                        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize bg-primary/50 hover:bg-primary transition-colors rounded-l"
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            // TODO: Implement left-edge resize
                        }}
                    />
                    <div
                        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize bg-primary/50 hover:bg-primary transition-colors rounded-r"
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            // TODO: Implement right-edge resize
                        }}
                    />
                </>
            )}
        </div>
    );
}

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
