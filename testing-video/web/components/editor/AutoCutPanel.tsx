'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    Upload,
    Wand2,
    Scissors,
    Languages,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Download,
    Sparkles,
    Video,
    X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { videoAPI, JobStatus, AudioAnalysis } from '@/lib/videoApi';

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

type ProcessingStep = 'idle' | 'uploading' | 'analyzing' | 'transcribing' | 'cutting' | 'complete' | 'error';

export default function AutoCutPanel() {
    const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
    const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // Settings
    const [silenceThreshold, setSilenceThreshold] = useState(-40);
    const [minSilenceDuration, setMinSilenceDuration] = useState(0.5);
    const [padding, setPadding] = useState(0.1);

    // Results
    const [audioAnalysis, setAudioAnalysis] = useState<AudioAnalysis | null>(null);
    const [transcription, setTranscription] = useState<{ text: string; segments: any[] } | null>(null);
    const [outputUrl, setOutputUrl] = useState<string | null>(null);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setProcessingStep('uploading');
        setError(null);
        setProgress(10);

        try {
            // First check if API is available
            const isHealthy = await videoAPI.healthCheck();
            if (!isHealthy) {
                throw new Error('Backend server is not available. Please start the Python server.');
            }

            // Upload to backend
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
        accept: {
            'video/*': ['.mp4', '.webm', '.mov', '.avi', '.mkv']
        },
        maxFiles: 1
    });

    const handleAnalyzeAudio = async () => {
        if (!uploadedFile) return;

        setProcessingStep('analyzing');
        setError(null);
        setProgress(20);

        try {
            const analysis = await videoAPI.analyzeAudio(uploadedFile.file_id, silenceThreshold);
            setAudioAnalysis(analysis);
            setProgress(100);
            setProcessingStep('idle');
        } catch (e: any) {
            setError(e.message);
            setProcessingStep('error');
        }
    };

    const handleTranscribe = async () => {
        if (!uploadedFile) return;

        setProcessingStep('transcribing');
        setError(null);
        setProgress(10);

        try {
            const { job_id } = await videoAPI.startTranscription(uploadedFile.file_id);

            // Poll for completion
            const result = await videoAPI.pollJobUntilComplete(job_id, (status) => {
                if (status.status === 'processing') {
                    setProgress(prev => Math.min(prev + 5, 90));
                }
            });

            if (result.status === 'failed') {
                throw new Error(result.error || 'Transcription failed');
            }

            setTranscription({
                text: result.text || '',
                segments: result.word_timestamps || []
            });

            setProgress(100);
            setProcessingStep('idle');
        } catch (e: any) {
            setError(e.message);
            setProcessingStep('error');
        }
    };

    const handleAutoCut = async () => {
        if (!uploadedFile) return;

        setProcessingStep('cutting');
        setError(null);
        setProgress(10);

        try {
            const { job_id } = await videoAPI.startAutoCut(uploadedFile.file_id, {
                silence_threshold: silenceThreshold,
                min_silence_duration: minSilenceDuration,
                padding: padding
            });

            // Poll for completion
            const result = await videoAPI.pollJobUntilComplete(job_id, (status) => {
                if (status.status === 'processing') {
                    setProgress(prev => Math.min(prev + 3, 90));
                }
            });

            if (result.status === 'failed') {
                throw new Error(result.error || 'Auto-cut failed');
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
        setAudioAnalysis(null);
        setTranscription(null);
        setOutputUrl(null);
    };

    return (
        <div className="bg-card rounded-xl border border-border p-5 space-y-5">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Scissors className="text-blue-400" size={16} />
                    Auto-Cut Video
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
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-muted-foreground/50 hover:bg-muted/30'
                        }`}
                >
                    <input {...getInputProps()} />
                    <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className="text-sm text-muted-foreground">
                        {isDragActive ? 'Drop your video here' : 'Drag & drop a video, or click to select'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">MP4, MOV, WebM, AVI supported</p>
                </div>
            )}

            {/* Video Preview */}
            {uploadedFile && (
                <div className="space-y-4">
                    <div className="rounded-lg overflow-hidden bg-black aspect-video">
                        <video
                            src={uploadedFile.src}
                            controls
                            className="w-full h-full object-contain"
                        />
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{uploadedFile.filename}</span>
                        {uploadedFile.metadata && (
                            <span>
                                {uploadedFile.metadata.width}×{uploadedFile.metadata.height} • {uploadedFile.metadata.duration.toFixed(1)}s
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Settings */}
            {uploadedFile && processingStep === 'idle' && (
                <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Silence Threshold</span>
                            <span className="font-mono">{silenceThreshold} dB</span>
                        </div>
                        <Slider
                            value={[silenceThreshold]}
                            min={-60}
                            max={-20}
                            step={1}
                            onValueChange={([val]) => setSilenceThreshold(val)}
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Min Silence Duration</span>
                            <span className="font-mono">{minSilenceDuration.toFixed(1)}s</span>
                        </div>
                        <Slider
                            value={[minSilenceDuration]}
                            min={0.1}
                            max={2}
                            step={0.1}
                            onValueChange={([val]) => setMinSilenceDuration(val)}
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Padding</span>
                            <span className="font-mono">{padding.toFixed(2)}s</span>
                        </div>
                        <Slider
                            value={[padding]}
                            min={0}
                            max={0.5}
                            step={0.05}
                            onValueChange={([val]) => setPadding(val)}
                        />
                    </div>
                </div>
            )}

            {/* Audio Analysis Results */}
            {audioAnalysis && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <h4 className="text-xs font-medium flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-green-400" />
                        Audio Analysis
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                            <span className="text-muted-foreground">Speech:</span>{' '}
                            <span className="font-mono">{audioAnalysis.total_speech_duration.toFixed(1)}s</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Segments:</span>{' '}
                            <span className="font-mono">{audioAnalysis.segments.length}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Time Saved:</span>{' '}
                            <span className="font-mono text-green-400">
                                {(audioAnalysis.total_duration - audioAnalysis.total_speech_duration).toFixed(1)}s
                            </span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Speech %:</span>{' '}
                            <span className="font-mono">
                                {((audioAnalysis.total_speech_duration / audioAnalysis.total_duration) * 100).toFixed(0)}%
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Transcription Results */}
            {transcription && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <h4 className="text-xs font-medium flex items-center gap-2">
                        <Languages size={12} className="text-blue-400" />
                        Transcription
                    </h4>
                    <p className="text-xs text-foreground/80 max-h-24 overflow-y-auto">
                        {transcription.text || 'No speech detected'}
                    </p>
                </div>
            )}

            {/* Progress */}
            {processingStep !== 'idle' && processingStep !== 'complete' && processingStep !== 'error' && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                        <Loader2 className="animate-spin text-blue-400" size={16} />
                        <span className="capitalize">{processingStep}...</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
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

            {/* Action Buttons */}
            {uploadedFile && processingStep === 'idle' && (
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAnalyzeAudio}
                        className="text-xs h-9"
                    >
                        <Wand2 size={12} className="mr-2" />
                        Analyze Audio
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTranscribe}
                        className="text-xs h-9"
                    >
                        <Languages size={12} className="mr-2" />
                        Transcribe
                    </Button>
                    <Button
                        onClick={handleAutoCut}
                        size="sm"
                        className="col-span-2 text-xs h-10 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500"
                    >
                        <Scissors size={14} className="mr-2" />
                        Auto-Cut Video
                    </Button>
                </div>
            )}

            {/* Success / Download */}
            {processingStep === 'complete' && outputUrl && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-400">
                        <CheckCircle2 size={16} />
                        <span className="text-sm font-medium">Processing Complete!</span>
                    </div>
                    <a href={outputUrl} download className="block">
                        <Button className="w-full h-10 bg-green-600 hover:bg-green-500 gap-2">
                            <Download size={16} />
                            Download Processed Video
                        </Button>
                    </a>
                </div>
            )}
        </div>
    );
}
