'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    Upload,
    Languages,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Download,
    Copy,
    FileText,
    X,
    Volume2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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

interface WordTimestamp {
    word: string;
    start: number;
    end: number;
    confidence: number;
}

interface Segment {
    id: number;
    start: number;
    end: number;
    text: string;
}

type ProcessingStep = 'idle' | 'uploading' | 'transcribing' | 'complete' | 'error';

export default function TranscriptionPanel() {
    const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
    const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // Transcription results
    const [fullText, setFullText] = useState<string>('');
    const [segments, setSegments] = useState<Segment[]>([]);
    const [wordTimestamps, setWordTimestamps] = useState<WordTimestamp[]>([]);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);

    // Sync current word highlighting with video playback
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => {
            setCurrentTime(video.currentTime);
        };

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
        };
    }, [uploadedFile]);

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
                    setProgress(prev => Math.min(prev + 3, 90));
                }
            });

            if (result.status === 'failed') {
                throw new Error(result.error || 'Transcription failed');
            }

            setFullText(result.text || '');
            setWordTimestamps(result.word_timestamps as WordTimestamp[] || []);

            // Group words into segments
            const segs: Segment[] = [];
            let currentSeg: Segment | null = null;

            (result.word_timestamps as WordTimestamp[] || []).forEach((word, i) => {
                if (!currentSeg) {
                    currentSeg = {
                        id: segs.length,
                        start: word.start,
                        end: word.end,
                        text: word.word
                    };
                } else {
                    // New segment if gap > 1 second or text is getting long
                    if (word.start - currentSeg.end > 1 || currentSeg.text.length > 100) {
                        segs.push(currentSeg);
                        currentSeg = {
                            id: segs.length,
                            start: word.start,
                            end: word.end,
                            text: word.word
                        };
                    } else {
                        currentSeg.end = word.end;
                        currentSeg.text += ' ' + word.word;
                    }
                }
            });

            if (currentSeg) segs.push(currentSeg);
            setSegments(segs);

            setProgress(100);
            setProcessingStep('complete');
        } catch (e: any) {
            setError(e.message);
            setProcessingStep('error');
        }
    };

    const handleSeekToWord = (time: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            videoRef.current.play();
        }
    };

    const handleCopyText = () => {
        navigator.clipboard.writeText(fullText);
    };

    const handleExportSRT = () => {
        // Generate SRT content
        let srt = '';
        segments.forEach((seg, i) => {
            const formatTime = (seconds: number) => {
                const h = Math.floor(seconds / 3600);
                const m = Math.floor((seconds % 3600) / 60);
                const s = Math.floor(seconds % 60);
                const ms = Math.floor((seconds % 1) * 1000);
                return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
            };

            srt += `${i + 1}\n`;
            srt += `${formatTime(seg.start)} --> ${formatTime(seg.end)}\n`;
            srt += `${seg.text.trim()}\n\n`;
        });

        // Download as file
        const blob = new Blob([srt], { type: 'text/srt' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${uploadedFile?.filename || 'transcription'}.srt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleReset = () => {
        setUploadedFile(null);
        setProcessingStep('idle');
        setProgress(0);
        setError(null);
        setFullText('');
        setSegments([]);
        setWordTimestamps([]);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Find current word index
    const currentWordIndex = wordTimestamps.findIndex(
        w => currentTime >= w.start && currentTime <= w.end
    );

    return (
        <div className="bg-card rounded-xl border border-border p-5 space-y-5">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Languages className="text-cyan-400" size={16} />
                    Auto Transcription
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
                            ? 'border-cyan-500 bg-cyan-500/10'
                            : 'border-border hover:border-cyan-500/50 hover:bg-muted/30'
                        }`}
                >
                    <input {...getInputProps()} />
                    <Volume2 className={`w-10 h-10 mx-auto mb-3 ${isDragActive ? 'text-cyan-400' : 'text-muted-foreground'}`} />
                    <p className="text-sm text-muted-foreground">
                        Drop a video to transcribe
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Using OpenAI Whisper</p>
                </div>
            )}

            {/* Video Player */}
            {uploadedFile && (
                <div className="rounded-lg overflow-hidden bg-black aspect-video">
                    <video
                        ref={videoRef}
                        src={uploadedFile.src}
                        controls
                        className="w-full h-full object-contain"
                    />
                </div>
            )}

            {/* Progress */}
            {processingStep === 'transcribing' && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                        <Loader2 className="animate-spin text-cyan-400" size={16} />
                        <span>Transcribing with Whisper AI...</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        This may take a few minutes for longer videos...
                    </p>
                </div>
            )}

            {/* Transcribe Button */}
            {uploadedFile && processingStep === 'idle' && (
                <Button
                    onClick={handleTranscribe}
                    className="w-full h-10 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500"
                >
                    <Languages size={14} className="mr-2" />
                    Transcribe Video
                </Button>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={14} />
                    <p className="text-xs text-red-400">{error}</p>
                </div>
            )}

            {/* Transcription Results */}
            {processingStep === 'complete' && fullText && (
                <div className="space-y-4">
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleCopyText} className="flex-1 text-xs h-8">
                            <Copy size={12} className="mr-1" /> Copy Text
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExportSRT} className="flex-1 text-xs h-8">
                            <FileText size={12} className="mr-1" /> Export SRT
                        </Button>
                    </div>

                    {/* Word-by-word with timestamps */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">
                            Interactive Transcript ({wordTimestamps.length} words)
                        </label>
                        <ScrollArea className="h-48 rounded-lg bg-muted/30 p-3">
                            <div className="flex flex-wrap gap-1">
                                {wordTimestamps.map((word, i) => {
                                    const isCurrent = i === currentWordIndex;
                                    const isPast = currentTime > word.end;

                                    return (
                                        <button
                                            key={i}
                                            onClick={() => handleSeekToWord(word.start)}
                                            className={`px-1.5 py-0.5 rounded text-xs transition-all ${isCurrent
                                                    ? 'bg-cyan-500 text-white scale-110'
                                                    : isPast
                                                        ? 'text-muted-foreground'
                                                        : 'hover:bg-muted text-foreground'
                                                }`}
                                        >
                                            {word.word}
                                        </button>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Segments */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">
                            Segments ({segments.length})
                        </label>
                        <ScrollArea className="h-32 rounded-lg">
                            <div className="space-y-1">
                                {segments.map((seg) => {
                                    const isActive = currentTime >= seg.start && currentTime <= seg.end;
                                    return (
                                        <button
                                            key={seg.id}
                                            onClick={() => handleSeekToWord(seg.start)}
                                            className={`w-full text-left p-2 rounded-lg text-xs transition-all ${isActive
                                                    ? 'bg-cyan-500/20 border border-cyan-500'
                                                    : 'hover:bg-muted/50'
                                                }`}
                                        >
                                            <span className="text-muted-foreground font-mono mr-2">
                                                {formatTime(seg.start)}
                                            </span>
                                            <span className={isActive ? 'text-cyan-400' : ''}>
                                                {seg.text.trim()}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            )}
        </div>
    );
}
