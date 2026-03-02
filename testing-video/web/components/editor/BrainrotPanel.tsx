'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    Upload,
    Sparkles,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Download,
    Layers,
    Video,
    X,
    ArrowUpDown,
    ArrowLeftRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { videoAPI } from '@/lib/videoApi';

interface UploadedFile {
    file_id: string;
    filename: string;
    src: string;
    metadata?: {
        duration: number;
        width: number;
        height: number;
    };
}

type LayoutType = 'vertical' | 'horizontal';
type PositionType = 'top' | 'bottom' | 'left' | 'right';
type ProcessingStep = 'idle' | 'uploading' | 'processing' | 'complete' | 'error';

const PRESETS = [
    {
        id: 'classic',
        name: 'Classic Split',
        layout: 'vertical' as LayoutType,
        position: 'top' as PositionType,
        ratio: 0.5,
        icon: ArrowUpDown,
        description: 'Brainrot on top, main video below'
    },
    {
        id: 'main_focus',
        name: 'Main Focus',
        layout: 'vertical' as LayoutType,
        position: 'bottom' as PositionType,
        ratio: 0.6,
        icon: Video,
        description: '60% main, 40% brainrot'
    },
    {
        id: 'brainrot_focus',
        name: 'Brainrot Focus',
        layout: 'vertical' as LayoutType,
        position: 'top' as PositionType,
        ratio: 0.4,
        icon: Sparkles,
        description: '40% main, 60% brainrot'
    },
    {
        id: 'side_by_side',
        name: 'Side by Side',
        layout: 'horizontal' as LayoutType,
        position: 'left' as PositionType,
        ratio: 0.5,
        icon: ArrowLeftRight,
        description: 'Horizontal split view'
    }
];

export default function BrainrotPanel() {
    const [mainVideo, setMainVideo] = useState<UploadedFile | null>(null);
    const [brainrotVideo, setBrainrotVideo] = useState<UploadedFile | null>(null);
    const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [outputUrl, setOutputUrl] = useState<string | null>(null);

    // Settings
    const [selectedPreset, setSelectedPreset] = useState(PRESETS[0]);
    const [customRatio, setCustomRatio] = useState(0.5);

    const onDropMain = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        try {
            const isHealthy = await videoAPI.healthCheck();
            if (!isHealthy) {
                throw new Error('Backend server is not available');
            }

            setProcessingStep('uploading');
            const result = await videoAPI.uploadVideo(file);

            setMainVideo({
                file_id: result.file_id,
                filename: result.filename,
                src: URL.createObjectURL(file),
                metadata: result.metadata
            });

            setProcessingStep('idle');
        } catch (e: any) {
            setError(e.message);
            setProcessingStep('error');
        }
    }, []);

    const onDropBrainrot = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        try {
            const isHealthy = await videoAPI.healthCheck();
            if (!isHealthy) {
                throw new Error('Backend server is not available');
            }

            setProcessingStep('uploading');
            const result = await videoAPI.uploadVideo(file);

            setBrainrotVideo({
                file_id: result.file_id,
                filename: result.filename,
                src: URL.createObjectURL(file),
                metadata: result.metadata
            });

            setProcessingStep('idle');
        } catch (e: any) {
            setError(e.message);
            setProcessingStep('error');
        }
    }, []);

    const mainDropzone = useDropzone({
        onDrop: onDropMain,
        accept: { 'video/*': ['.mp4', '.webm', '.mov', '.avi', '.mkv'] },
        maxFiles: 1
    });

    const brainrotDropzone = useDropzone({
        onDrop: onDropBrainrot,
        accept: { 'video/*': ['.mp4', '.webm', '.mov', '.avi', '.mkv'] },
        maxFiles: 1
    });

    const handleCombine = async () => {
        if (!mainVideo || !brainrotVideo) return;

        setProcessingStep('processing');
        setError(null);
        setProgress(10);

        try {
            const { job_id } = await videoAPI.startBrainrotCombine({
                main_video_id: mainVideo.file_id,
                brainrot_video_id: brainrotVideo.file_id,
                layout: selectedPreset.layout,
                brainrot_position: selectedPreset.position,
                main_video_ratio: customRatio
            });

            // Poll for completion
            const result = await videoAPI.pollJobUntilComplete(job_id, (status) => {
                if (status.status === 'processing') {
                    setProgress(prev => Math.min(prev + 2, 90));
                }
            });

            if (result.status === 'failed') {
                throw new Error(result.error || 'Processing failed');
            }

            if (result.output_filename) {
                setOutputUrl(videoAPI.getDownloadUrl(result.output_filename));
            }

            setProgress(100);
            setProcessingStep('complete');
        } catch (e: any) {
            setError(e.message);
            setProcessingStep('error');
        }
    };

    const handleReset = () => {
        setMainVideo(null);
        setBrainrotVideo(null);
        setProcessingStep('idle');
        setProgress(0);
        setError(null);
        setOutputUrl(null);
    };

    return (
        <div className="bg-card rounded-xl border border-border p-5 space-y-5">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Sparkles className="text-purple-400" size={16} />
                    Brainrot Mode
                </h3>
                {(mainVideo || brainrotVideo) && (
                    <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 text-xs">
                        <X size={12} className="mr-1" /> Reset
                    </Button>
                )}
            </div>

            <p className="text-xs text-muted-foreground">
                Combine your content with gameplay (Subway Surfers, satisfying videos) in split-screen format for maximum engagement.
            </p>

            {/* Video Upload Zones */}
            <div className="grid grid-cols-2 gap-3">
                {/* Main Video */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Video size={12} />
                        Main Content
                    </label>
                    {!mainVideo ? (
                        <div
                            {...mainDropzone.getRootProps()}
                            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all aspect-video flex items-center justify-center ${mainDropzone.isDragActive
                                    ? 'border-blue-500 bg-blue-500/10'
                                    : 'border-border hover:border-blue-500/50'
                                }`}
                        >
                            <input {...mainDropzone.getInputProps()} />
                            <div>
                                <Upload size={20} className="mx-auto mb-1 text-muted-foreground" />
                                <p className="text-[10px] text-muted-foreground">Drop video</p>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-lg overflow-hidden bg-black aspect-video relative group">
                            <video src={mainVideo.src} className="w-full h-full object-cover" muted />
                            <button
                                onClick={() => setMainVideo(null)}
                                className="absolute top-1 right-1 p-1 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Brainrot Video */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Sparkles size={12} />
                        Brainrot Video
                    </label>
                    {!brainrotVideo ? (
                        <div
                            {...brainrotDropzone.getRootProps()}
                            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all aspect-video flex items-center justify-center ${brainrotDropzone.isDragActive
                                    ? 'border-purple-500 bg-purple-500/10'
                                    : 'border-border hover:border-purple-500/50'
                                }`}
                        >
                            <input {...brainrotDropzone.getInputProps()} />
                            <div>
                                <Sparkles size={20} className="mx-auto mb-1 text-muted-foreground" />
                                <p className="text-[10px] text-muted-foreground">Drop gameplay</p>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-lg overflow-hidden bg-black aspect-video relative group">
                            <video src={brainrotVideo.src} className="w-full h-full object-cover" muted />
                            <button
                                onClick={() => setBrainrotVideo(null)}
                                className="absolute top-1 right-1 p-1 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Layout Presets */}
            {mainVideo && brainrotVideo && processingStep === 'idle' && (
                <div className="space-y-3">
                    <label className="text-xs font-medium text-muted-foreground">Layout Style</label>
                    <div className="grid grid-cols-2 gap-2">
                        {PRESETS.map((preset) => {
                            const Icon = preset.icon;
                            return (
                                <button
                                    key={preset.id}
                                    onClick={() => {
                                        setSelectedPreset(preset);
                                        setCustomRatio(preset.ratio);
                                    }}
                                    className={`p-3 rounded-lg text-left transition-all ${selectedPreset.id === preset.id
                                            ? 'bg-purple-500/20 border-2 border-purple-500'
                                            : 'bg-muted/50 border-2 border-transparent hover:bg-muted'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <Icon size={14} className={selectedPreset.id === preset.id ? 'text-purple-400' : 'text-muted-foreground'} />
                                        <span className="text-xs font-medium">{preset.name}</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">{preset.description}</p>
                                </button>
                            );
                        })}
                    </div>

                    {/* Custom Ratio Slider */}
                    <div className="space-y-2 pt-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Main Video Size</span>
                            <span className="font-mono">{Math.round(customRatio * 100)}%</span>
                        </div>
                        <Slider
                            value={[customRatio]}
                            min={0.3}
                            max={0.7}
                            step={0.05}
                            onValueChange={([val]) => setCustomRatio(val)}
                        />
                    </div>

                    {/* Preview */}
                    <div className="bg-muted/30 rounded-lg p-3 flex items-center justify-center h-32">
                        <div
                            className="bg-neutral-900 rounded-md overflow-hidden shadow-lg"
                            style={{
                                width: selectedPreset.layout === 'vertical' ? '45px' : '80px',
                                height: selectedPreset.layout === 'vertical' ? '80px' : '45px',
                                display: 'flex',
                                flexDirection: selectedPreset.layout === 'vertical' ? 'column' : 'row'
                            }}
                        >
                            {selectedPreset.position === 'top' || selectedPreset.position === 'left' ? (
                                <>
                                    <div
                                        className="bg-purple-500/50 flex items-center justify-center"
                                        style={{
                                            flex: 1 - customRatio
                                        }}
                                    >
                                        <Sparkles size={10} className="text-purple-300" />
                                    </div>
                                    <div
                                        className="bg-blue-500/50 flex items-center justify-center"
                                        style={{ flex: customRatio }}
                                    >
                                        <Video size={10} className="text-blue-300" />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div
                                        className="bg-blue-500/50 flex items-center justify-center"
                                        style={{ flex: customRatio }}
                                    >
                                        <Video size={10} className="text-blue-300" />
                                    </div>
                                    <div
                                        className="bg-purple-500/50 flex items-center justify-center"
                                        style={{ flex: 1 - customRatio }}
                                    >
                                        <Sparkles size={10} className="text-purple-300" />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Progress */}
            {processingStep === 'processing' && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                        <Loader2 className="animate-spin text-purple-400" size={16} />
                        <span>Combining videos...</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={14} />
                    <p className="text-xs text-red-400">{error}</p>
                </div>
            )}

            {/* Combine Button */}
            {mainVideo && brainrotVideo && processingStep === 'idle' && (
                <Button
                    onClick={handleCombine}
                    className="w-full h-10 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                >
                    <Layers size={14} className="mr-2" />
                    Create Brainrot Video
                </Button>
            )}

            {/* Success / Download */}
            {processingStep === 'complete' && outputUrl && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-400">
                        <CheckCircle2 size={16} />
                        <span className="text-sm font-medium">Brainrot Video Ready!</span>
                    </div>
                    <a href={outputUrl} download className="block">
                        <Button className="w-full h-10 bg-green-600 hover:bg-green-500 gap-2">
                            <Download size={16} />
                            Download Video
                        </Button>
                    </a>
                </div>
            )}
        </div>
    );
}
