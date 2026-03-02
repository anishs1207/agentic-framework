'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Loader2, Download, AlertCircle, CheckCircle2, Film } from 'lucide-react';
import { exportVideo } from '@/lib/ffmpeg';
import { useEditorStore } from '@/store/useEditorStore';

export default function ExportDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [exportUrl, setExportUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const { tracks, assets, duration } = useEditorStore();

    const clipCount = tracks.flatMap(t => t.clips).filter(c => c.type === 'video' || c.type === 'image').length;

    const handleExport = async () => {
        setIsExporting(true);
        setError(null);
        setExportUrl(null);
        setProgress(0);

        try {
            const url = await exportVideo(tracks, assets, duration, (p) => setProgress(p));
            setExportUrl(url);
        } catch (e: any) {
            console.error('Export error:', e);
            setError(e.message || 'Export failed. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    const handleClose = () => {
        if (!isExporting) {
            setIsOpen(false);
            // Reset state when closing
            setTimeout(() => {
                setExportUrl(null);
                setError(null);
                setProgress(0);
            }, 200);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => open ? setIsOpen(true) : handleClose()}>
            <DialogTrigger asChild>
                <Button size="sm" className="h-7 gap-2 bg-blue-600 hover:bg-blue-500 text-white">
                    <Download size={14} /> Export
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-neutral-900 border-neutral-700 text-neutral-100">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Film size={18} className="text-blue-400" />
                        Export Video
                    </DialogTitle>
                    <DialogDescription className="text-neutral-400">
                        Render your timeline to an MP4 file using browser-based encoding.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6">
                    {/* Initial State */}
                    {!isExporting && !exportUrl && !error && (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 mx-auto bg-blue-500/10 rounded-full flex items-center justify-center">
                                <Film size={28} className="text-blue-400" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-neutral-200">Ready to export</p>
                                <p className="text-xs text-neutral-500">
                                    {clipCount} clip{clipCount !== 1 ? 's' : ''} • {duration}s duration
                                </p>
                            </div>
                            {clipCount === 0 && (
                                <p className="text-xs text-amber-400 bg-amber-400/10 px-3 py-2 rounded-lg">
                                    ⚠ No video or image clips on timeline
                                </p>
                            )}
                        </div>
                    )}

                    {/* Exporting State */}
                    {isExporting && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-center gap-3">
                                <Loader2 className="animate-spin text-blue-400" size={24} />
                                <span className="text-sm font-medium">Rendering video...</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                            <p className="text-xs text-center text-neutral-500">
                                {progress < 30 ? 'Loading assets...' :
                                    progress < 50 ? 'Preparing encoder...' :
                                        progress < 90 ? 'Encoding video...' : 'Finalizing...'}
                            </p>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 mx-auto bg-red-500/10 rounded-full flex items-center justify-center">
                                <AlertCircle size={28} className="text-red-400" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-red-400">Export Failed</p>
                                <p className="text-xs text-neutral-400 bg-neutral-800 p-3 rounded-lg">
                                    {error}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Success State */}
                    {exportUrl && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-center gap-2 text-green-400">
                                <CheckCircle2 size={20} />
                                <span className="text-sm font-medium">Export Complete!</span>
                            </div>
                            <video
                                src={exportUrl}
                                controls
                                className="w-full rounded-lg border border-neutral-700 bg-black"
                                style={{ maxHeight: '200px' }}
                            />
                            <a href={exportUrl} download="my-video.mp4" className="block">
                                <Button className="w-full bg-green-600 hover:bg-green-500 gap-2">
                                    <Download size={16} />
                                    Download MP4
                                </Button>
                            </a>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-2">
                    {!isExporting && !exportUrl && (
                        <>
                            <Button variant="ghost" onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleExport}
                                disabled={clipCount === 0}
                                className="bg-blue-600 hover:bg-blue-500"
                            >
                                Start Export
                            </Button>
                        </>
                    )}
                    {error && (
                        <>
                            <Button variant="ghost" onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button onClick={handleExport} variant="secondary">
                                Try Again
                            </Button>
                        </>
                    )}
                    {exportUrl && (
                        <Button variant="secondary" onClick={handleClose} className="w-full">
                            Done
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
