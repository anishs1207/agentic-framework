'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    Upload,
    Palette,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Download,
    Sun,
    Contrast,
    Droplets,
    ThermometerSun,
    Sparkles,
    Wand2,
    RotateCcw,
    X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { videoAPI, ColorCorrectionParams } from '@/lib/videoApi';

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

type ProcessingStep = 'idle' | 'uploading' | 'processing' | 'complete' | 'error';

const DEFAULT_PARAMS: ColorCorrectionParams = {
    brightness: 0,
    contrast: 1,
    saturation: 1,
    temperature: 0,
    vibrance: 0,
    auto_enhance: false
};

const PRESETS = [
    {
        id: 'cinematic',
        name: 'Cinematic',
        params: { brightness: -10, contrast: 1.2, saturation: 0.9, temperature: 15, vibrance: 10, auto_enhance: false }
    },
    {
        id: 'vibrant',
        name: 'Vibrant',
        params: { brightness: 5, contrast: 1.1, saturation: 1.4, temperature: 0, vibrance: 30, auto_enhance: false }
    },
    {
        id: 'moody',
        name: 'Moody',
        params: { brightness: -15, contrast: 1.3, saturation: 0.7, temperature: -15, vibrance: 0, auto_enhance: false }
    },
    {
        id: 'warm',
        name: 'Warm & Cozy',
        params: { brightness: 10, contrast: 1.0, saturation: 1.1, temperature: 30, vibrance: 15, auto_enhance: false }
    },
    {
        id: 'cool',
        name: 'Cool & Fresh',
        params: { brightness: 5, contrast: 1.1, saturation: 1.0, temperature: -25, vibrance: 10, auto_enhance: false }
    },
    {
        id: 'auto',
        name: 'Auto Enhance',
        params: { brightness: 0, contrast: 1, saturation: 1, temperature: 0, vibrance: 0, auto_enhance: true }
    }
];

export default function ColorCorrectionPanel() {
    const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
    const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [outputUrl, setOutputUrl] = useState<string | null>(null);

    // Color correction parameters
    const [params, setParams] = useState<ColorCorrectionParams>(DEFAULT_PARAMS);
    const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

    const updateParam = (key: keyof ColorCorrectionParams, value: any) => {
        setSelectedPreset(null);
        setParams(prev => ({ ...prev, [key]: value }));
    };

    const applyPreset = (preset: typeof PRESETS[0]) => {
        setSelectedPreset(preset.id);
        setParams(preset.params as ColorCorrectionParams);
    };

    const resetParams = () => {
        setSelectedPreset(null);
        setParams(DEFAULT_PARAMS);
    };

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setProcessingStep('uploading');
        setError(null);
        setProgress(10);

        try {
            const isHealthy = await videoAPI.healthCheck();
            if (!isHealthy) {
                throw new Error('Backend server is not available. Please start the Python server.');
            }

            const result = await videoAPI.uploadVideo(file);

            setUploadedFile({
                file_id: result.file_id,
                filename: result.filename,
                src: URL.createObjectURL(file),
                metadata: result.metadata
            });

            setProgress(100);
            setProcessingStep('idle');
        } catch (e: any) {
            setError(e.message || 'Upload failed');
            setProcessingStep('error');
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'video/*': ['.mp4', '.webm', '.mov', '.avi', '.mkv'] },
        maxFiles: 1
    });

    const handleApplyCorrection = async () => {
        if (!uploadedFile) return;

        setProcessingStep('processing');
        setError(null);
        setProgress(10);

        try {
            const { job_id } = await videoAPI.startColorCorrection(uploadedFile.file_id, params);

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
        setUploadedFile(null);
        setProcessingStep('idle');
        setProgress(0);
        setError(null);
        setOutputUrl(null);
        resetParams();
    };

    return (
        <div className="bg-card rounded-xl border border-border p-5 space-y-5">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Palette className="text-orange-400" size={16} />
                    Color Correction
                </h3>
                {uploadedFile && (
                    <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 text-xs">
                        <X size={12} className="mr-1" /> Reset
                    </Button>
                )}
            </div>

            {/* Upload Zone */}
            {!uploadedFile && (
                <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${isDragActive
                            ? 'border-orange-500 bg-orange-500/10'
                            : 'border-border hover:border-orange-500/50 hover:bg-muted/30'
                        }`}
                >
                    <input {...getInputProps()} />
                    <Palette className={`w-10 h-10 mx-auto mb-3 ${isDragActive ? 'text-orange-400' : 'text-muted-foreground'}`} />
                    <p className="text-sm text-muted-foreground">
                        Drop a video to color correct
                    </p>
                </div>
            )}

            {/* Video Preview */}
            {uploadedFile && (
                <div className="rounded-lg overflow-hidden bg-black aspect-video">
                    <video
                        src={uploadedFile.src}
                        controls
                        className="w-full h-full object-contain"
                    />
                </div>
            )}

            {/* Presets */}
            {uploadedFile && processingStep === 'idle' && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-muted-foreground">Presets</label>
                        {selectedPreset && (
                            <Button variant="ghost" size="sm" onClick={resetParams} className="h-6 text-[10px] gap-1 px-2">
                                <RotateCcw size={10} /> Reset
                            </Button>
                        )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {PRESETS.map((preset) => (
                            <button
                                key={preset.id}
                                onClick={() => applyPreset(preset)}
                                className={`p-2 rounded-lg text-xs font-medium transition-all ${selectedPreset === preset.id
                                        ? 'bg-orange-500/20 border-2 border-orange-500 text-orange-400'
                                        : 'bg-muted/50 border-2 border-transparent hover:bg-muted text-foreground'
                                    }`}
                            >
                                {preset.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Manual Controls */}
            {uploadedFile && processingStep === 'idle' && (
                <div className="space-y-4">
                    <label className="text-xs font-medium text-muted-foreground">Fine Tune</label>

                    {/* Brightness */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="flex items-center gap-1 text-muted-foreground">
                                <Sun size={12} /> Brightness
                            </span>
                            <span className="font-mono">{params.brightness > 0 ? '+' : ''}{params.brightness}</span>
                        </div>
                        <Slider
                            value={[params.brightness]}
                            min={-50}
                            max={50}
                            step={1}
                            onValueChange={([val]) => updateParam('brightness', val)}
                        />
                    </div>

                    {/* Contrast */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="flex items-center gap-1 text-muted-foreground">
                                <Contrast size={12} /> Contrast
                            </span>
                            <span className="font-mono">{params.contrast.toFixed(2)}</span>
                        </div>
                        <Slider
                            value={[params.contrast]}
                            min={0.5}
                            max={2}
                            step={0.05}
                            onValueChange={([val]) => updateParam('contrast', val)}
                        />
                    </div>

                    {/* Saturation */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="flex items-center gap-1 text-muted-foreground">
                                <Droplets size={12} /> Saturation
                            </span>
                            <span className="font-mono">{params.saturation.toFixed(2)}</span>
                        </div>
                        <Slider
                            value={[params.saturation]}
                            min={0}
                            max={2}
                            step={0.05}
                            onValueChange={([val]) => updateParam('saturation', val)}
                        />
                    </div>

                    {/* Temperature */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="flex items-center gap-1 text-muted-foreground">
                                <ThermometerSun size={12} /> Temperature
                            </span>
                            <span className="font-mono">{params.temperature > 0 ? '+' : ''}{params.temperature}</span>
                        </div>
                        <Slider
                            value={[params.temperature]}
                            min={-50}
                            max={50}
                            step={1}
                            onValueChange={([val]) => updateParam('temperature', val)}
                        />
                    </div>

                    {/* Vibrance */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="flex items-center gap-1 text-muted-foreground">
                                <Sparkles size={12} /> Vibrance
                            </span>
                            <span className="font-mono">{params.vibrance}</span>
                        </div>
                        <Slider
                            value={[params.vibrance]}
                            min={0}
                            max={100}
                            step={1}
                            onValueChange={([val]) => updateParam('vibrance', val)}
                        />
                    </div>

                    {/* Auto Enhance Toggle */}
                    <button
                        onClick={() => updateParam('auto_enhance', !params.auto_enhance)}
                        className={`w-full p-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all ${params.auto_enhance
                                ? 'bg-orange-500/20 border-2 border-orange-500 text-orange-400'
                                : 'bg-muted/50 border-2 border-transparent hover:bg-muted'
                            }`}
                    >
                        <Wand2 size={14} />
                        Auto Enhance {params.auto_enhance ? 'ON' : 'OFF'}
                    </button>
                </div>
            )}

            {/* Progress */}
            {processingStep === 'processing' && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                        <Loader2 className="animate-spin text-orange-400" size={16} />
                        <span>Applying color correction...</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 transition-all duration-300"
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

            {/* Apply Button */}
            {uploadedFile && processingStep === 'idle' && (
                <Button
                    onClick={handleApplyCorrection}
                    className="w-full h-10 bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-500 hover:to-yellow-500"
                >
                    <Palette size={14} className="mr-2" />
                    Apply Color Correction
                </Button>
            )}

            {/* Success / Download */}
            {processingStep === 'complete' && outputUrl && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-400">
                        <CheckCircle2 size={16} />
                        <span className="text-sm font-medium">Color Correction Applied!</span>
                    </div>
                    <a href={outputUrl} download className="block">
                        <Button className="w-full h-10 bg-green-600 hover:bg-green-500 gap-2">
                            <Download size={16} />
                            Download Corrected Video
                        </Button>
                    </a>
                </div>
            )}
        </div>
    );
}
