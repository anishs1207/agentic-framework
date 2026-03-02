"""
Audio Analyzer Service
Detects speech segments, silence, and audio levels for auto-cutting
"""

import os
import tempfile
from pathlib import Path
from typing import List, Dict, Any, Tuple
import numpy as np

# Configure FFmpeg path from imageio-ffmpeg before importing moviepy
try:
    import imageio_ffmpeg
    os.environ["IMAGEIO_FFMPEG_EXE"] = imageio_ffmpeg.get_ffmpeg_exe()
    ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
except ImportError:
    ffmpeg_path = None

from pydub import AudioSegment
from pydub.silence import detect_nonsilent
from moviepy.editor import VideoFileClip

# Configure moviepy and pydub to use the bundled ffmpeg
if ffmpeg_path:
    from moviepy.config import change_settings
    change_settings({"FFMPEG_BINARY": ffmpeg_path})
    AudioSegment.converter = ffmpeg_path


class AudioAnalyzer:
    """Service for analyzing audio content in video files"""
    
    def extract_audio_segment(self, video_path: str) -> AudioSegment:
        """
        Extract audio from video as pydub AudioSegment.
        
        Args:
            video_path: Path to the video file
            
        Returns:
            AudioSegment object
        """
        temp_audio = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        temp_audio.close()
        
        try:
            video = VideoFileClip(video_path)
            video.audio.write_audiofile(
                temp_audio.name,
                codec="pcm_s16le",
                verbose=False,
                logger=None
            )
            video.close()
            
            audio = AudioSegment.from_wav(temp_audio.name)
            return audio
        finally:
            Path(temp_audio.name).unlink(missing_ok=True)
    
    def detect_speech_segments(
        self,
        video_path: str,
        silence_threshold: float = -40,
        min_silence_len: int = 500,
        seek_step: int = 10
    ) -> List[Dict[str, float]]:
        """
        Detect non-silent (speech) segments in a video.
        
        Args:
            video_path: Path to the video file
            silence_threshold: dB threshold below which is considered silence
            min_silence_len: Minimum length of silence in milliseconds
            seek_step: Step size in milliseconds for silence detection
            
        Returns:
            List of segments with start and end times in seconds
        """
        audio = self.extract_audio_segment(video_path)
        
        # Detect non-silent segments
        nonsilent_ranges = detect_nonsilent(
            audio,
            min_silence_len=min_silence_len,
            silence_thresh=silence_threshold,
            seek_step=seek_step
        )
        
        # Convert to seconds
        segments = []
        for start_ms, end_ms in nonsilent_ranges:
            segments.append({
                "start": start_ms / 1000.0,
                "end": end_ms / 1000.0,
                "duration": (end_ms - start_ms) / 1000.0
            })
        
        return segments
    
    def get_duration(self, video_path: str) -> float:
        """Get the duration of a video in seconds"""
        video = VideoFileClip(video_path)
        duration = video.duration
        video.close()
        return duration
    
    def get_audio_levels(
        self,
        video_path: str,
        chunk_duration: float = 0.1
    ) -> List[Dict[str, Any]]:
        """
        Get audio levels over time for visualization.
        
        Args:
            video_path: Path to the video file
            chunk_duration: Duration of each analysis chunk in seconds
            
        Returns:
            List of dicts with time and dB level
        """
        audio = self.extract_audio_segment(video_path)
        chunk_ms = int(chunk_duration * 1000)
        
        levels = []
        for i in range(0, len(audio), chunk_ms):
            chunk = audio[i:i + chunk_ms]
            if len(chunk) > 0:
                levels.append({
                    "time": i / 1000.0,
                    "duration": len(chunk) / 1000.0,
                    "dbfs": chunk.dBFS if chunk.dBFS > float('-inf') else -100
                })
        
        return levels
    
    def detect_beats(
        self,
        video_path: str,
        threshold_ratio: float = 1.5
    ) -> List[float]:
        """
        Simple beat detection for music-based editing.
        
        Args:
            video_path: Path to the video file
            threshold_ratio: Ratio above average energy to detect as beat
            
        Returns:
            List of beat timestamps in seconds
        """
        audio = self.extract_audio_segment(video_path)
        
        # Convert to numpy array
        samples = np.array(audio.get_array_of_samples())
        
        # Calculate energy in chunks
        chunk_size = int(audio.frame_rate * 0.05)  # 50ms chunks
        
        energies = []
        for i in range(0, len(samples), chunk_size):
            chunk = samples[i:i + chunk_size]
            if len(chunk) > 0:
                energy = np.sqrt(np.mean(chunk.astype(float) ** 2))
                energies.append(energy)
        
        if not energies:
            return []
        
        # Detect beats as local maxima above threshold
        avg_energy = np.mean(energies)
        threshold = avg_energy * threshold_ratio
        
        beats = []
        chunk_duration = chunk_size / audio.frame_rate
        
        for i in range(1, len(energies) - 1):
            if energies[i] > threshold:
                if energies[i] > energies[i-1] and energies[i] > energies[i+1]:
                    beats.append(i * chunk_duration)
        
        return beats
    
    def merge_close_segments(
        self,
        segments: List[Dict[str, float]],
        min_gap: float = 0.3
    ) -> List[Dict[str, float]]:
        """
        Merge segments that are very close together.
        
        Args:
            segments: List of segment dictionaries with start/end
            min_gap: Minimum gap between segments to keep separate
            
        Returns:
            Merged list of segments
        """
        if not segments:
            return []
        
        merged = [segments[0].copy()]
        
        for seg in segments[1:]:
            if seg["start"] - merged[-1]["end"] < min_gap:
                # Merge with previous segment
                merged[-1]["end"] = seg["end"]
                merged[-1]["duration"] = merged[-1]["end"] - merged[-1]["start"]
            else:
                merged.append(seg.copy())
        
        return merged
    
    def analyze_for_auto_cut(
        self,
        video_path: str,
        silence_threshold: float = -40,
        min_silence_duration: float = 0.5,
        merge_gap: float = 0.3
    ) -> Dict[str, Any]:
        """
        Complete analysis for auto-cutting a video.
        
        Args:
            video_path: Path to the video file
            silence_threshold: dB threshold for silence
            min_silence_duration: Minimum silence duration to cut
            merge_gap: Gap below which to merge segments
            
        Returns:
            Complete analysis with segments, stats, and recommendations
        """
        # Get duration
        duration = self.get_duration(video_path)
        
        # Detect speech segments
        raw_segments = self.detect_speech_segments(
            video_path,
            silence_threshold=silence_threshold,
            min_silence_len=int(min_silence_duration * 1000)
        )
        
        # Merge close segments
        merged_segments = self.merge_close_segments(raw_segments, merge_gap)
        
        # Calculate statistics
        speech_duration = sum(s["duration"] for s in merged_segments)
        silence_duration = duration - speech_duration
        
        return {
            "total_duration": duration,
            "speech_duration": speech_duration,
            "silence_duration": silence_duration,
            "speech_percentage": (speech_duration / duration * 100) if duration > 0 else 0,
            "segment_count": len(merged_segments),
            "segments": merged_segments,
            "estimated_output_duration": speech_duration,
            "time_saved": silence_duration
        }
