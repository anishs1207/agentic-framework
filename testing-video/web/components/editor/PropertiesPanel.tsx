'use client';

import React from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { Trash2, Move, Scissors, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';

export default function PropertiesPanel() {
    const { selectedClipId, tracks, updateClip, removeClip, splitClip, currentTime } = useEditorStore();

    const selectedClip = tracks
        .flatMap(t => t.clips)
        .find(c => c.id === selectedClipId);

    const selectedTrackId = tracks.find(t => t.clips.some(c => c.id === selectedClipId))?.id;

    if (!selectedClip || !selectedTrackId) {
        return (
            <div className="w-64 bg-card border-l border-border p-6 flex flex-col items-center justify-center text-muted-foreground text-xs text-center">
                <Move className="w-8 h-8 mb-2 opacity-30" />
                <p>Select a clip to edit</p>
            </div>
        );
    }

    const props = selectedClip.properties;

    const handlePropChange = (key: string, value: number) => {
        updateClip(selectedTrackId, selectedClip.id, {
            properties: { ...props, [key]: value }
        });
    };

    const handleTimingChange = (key: 'startTime' | 'duration', value: number) => {
        updateClip(selectedTrackId, selectedClip.id, { [key]: Math.max(0, value) });
    };

    const handleLayerChange = (delta: number) => {
        updateClip(selectedTrackId, selectedClip.id, {
            layer: Math.max(1, selectedClip.layer + delta)
        });
    };

    const handleSplit = () => {
        if (currentTime > selectedClip.startTime && currentTime < selectedClip.startTime + selectedClip.duration) {
            splitClip(selectedTrackId, selectedClip.id, currentTime);
        }
    };

    const resetPosition = () => {
        handlePropChange('x', 0.5);
        handlePropChange('y', 0.5);
        handlePropChange('scale', 1);
    };

    return (
        <div className="w-64 bg-card border-l border-border flex flex-col h-full overflow-hidden">
            <div className="p-3 border-b border-border shrink-0">
                <h2 className="font-semibold text-xs uppercase tracking-wider">Properties</h2>
                <p className="text-[10px] text-muted-foreground truncate font-mono mt-1">{selectedClip.name}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4">

                {/* Quick Actions */}
                <div className="flex gap-1.5">
                    <Button variant="secondary" size="sm" onClick={handleSplit} className="flex-1 h-7 text-xs gap-1">
                        <Scissors size={12} /> Split
                    </Button>
                    <Button variant="outline" size="sm" onClick={resetPosition} className="h-7 px-2">
                        <RotateCcw size={12} />
                    </Button>
                </div>

                {/* Timing */}
                <div className="space-y-2">
                    <Label className="text-[10px] text-muted-foreground uppercase">Timing</Label>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <span className="text-[9px] text-muted-foreground">Start</span>
                            <Input
                                type="number"
                                step="0.1"
                                value={selectedClip.startTime.toFixed(1)}
                                onChange={(e) => handleTimingChange('startTime', parseFloat(e.target.value) || 0)}
                                className="h-7 text-xs"
                            />
                        </div>
                        <div>
                            <span className="text-[9px] text-muted-foreground">Duration</span>
                            <Input
                                type="number"
                                step="0.1"
                                min="0.1"
                                value={selectedClip.duration.toFixed(1)}
                                onChange={(e) => handleTimingChange('duration', parseFloat(e.target.value) || 0.1)}
                                className="h-7 text-xs"
                            />
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Layer Order */}
                <div className="space-y-2">
                    <Label className="text-[10px] text-muted-foreground uppercase">Layer</Label>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleLayerChange(-1)}>
                            <ChevronDown size={14} />
                        </Button>
                        <span className="text-xs font-mono flex-1 text-center">{selectedClip.layer}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleLayerChange(1)}>
                            <ChevronUp size={14} />
                        </Button>
                    </div>
                </div>

                <Separator />

                {/* Transform */}
                <div className="space-y-3">
                    <Label className="text-[10px] text-muted-foreground uppercase">Transform</Label>

                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px]">
                            <span className="text-muted-foreground">Scale</span>
                            <span className="font-mono">{(props.scale * 100).toFixed(0)}%</span>
                        </div>
                        <Slider
                            value={[props.scale]}
                            max={2}
                            min={0.1}
                            step={0.05}
                            onValueChange={([val]) => handlePropChange('scale', val)}
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px]">
                            <span className="text-muted-foreground">Position X</span>
                            <span className="font-mono">{(props.x * 100).toFixed(0)}%</span>
                        </div>
                        <Slider
                            value={[props.x]}
                            max={1}
                            min={0}
                            step={0.01}
                            onValueChange={([val]) => handlePropChange('x', val)}
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px]">
                            <span className="text-muted-foreground">Position Y</span>
                            <span className="font-mono">{(props.y * 100).toFixed(0)}%</span>
                        </div>
                        <Slider
                            value={[props.y]}
                            max={1}
                            min={0}
                            step={0.01}
                            onValueChange={([val]) => handlePropChange('y', val)}
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px]">
                            <span className="text-muted-foreground">Opacity</span>
                            <span className="font-mono">{(props.opacity * 100).toFixed(0)}%</span>
                        </div>
                        <Slider
                            value={[props.opacity]}
                            max={1}
                            min={0}
                            step={0.05}
                            onValueChange={([val]) => handlePropChange('opacity', val)}
                        />
                    </div>

                    {/* Volume (for video/audio clips) */}
                    {(selectedClip.type === 'video' || selectedClip.type === 'audio') && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px]">
                                <span className="text-muted-foreground">Volume</span>
                                <span className="font-mono">{((props.volume ?? 1) * 100).toFixed(0)}%</span>
                            </div>
                            <Slider
                                value={[props.volume ?? 1]}
                                max={1}
                                min={0}
                                step={0.05}
                                onValueChange={([val]) => handlePropChange('volume', val)}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Button */}
            <div className="p-3 border-t border-border shrink-0">
                <Button
                    variant="destructive"
                    size="sm"
                    className="w-full h-8 text-xs gap-1"
                    onClick={() => removeClip(selectedTrackId, selectedClip.id)}
                >
                    <Trash2 size={12} /> Delete Clip
                </Button>
            </div>
        </div>
    );
}
