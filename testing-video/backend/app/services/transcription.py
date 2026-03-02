"""
Whisper Transcription Service
Uses OpenAI Whisper for audio transcription with word-level timestamps
"""

import os
import tempfile
from pathlib import Path
from typing import Dict, List, Any, Optional

# Configure FFmpeg path from imageio-ffmpeg before importing moviepy
try:
    import imageio_ffmpeg
    os.environ["IMAGEIO_FFMPEG_EXE"] = imageio_ffmpeg.get_ffmpeg_exe()
    # Also set for moviepy's config
    ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
except ImportError:
    ffmpeg_path = None

import whisper
from moviepy.editor import VideoFileClip

# Configure moviepy to use the bundled ffmpeg
if ffmpeg_path:
    from moviepy.config import change_settings
    change_settings({"FFMPEG_BINARY": ffmpeg_path})


class TranscriptionService:
    """Service for transcribing audio from video files using Whisper"""
    
    def __init__(self, model_name: Optional[str] = None):
        """
        Initialize the transcription service.
        
        Args:
            model_name: Whisper model to use (tiny, base, small, medium, large)
        """
        self.model_name = model_name or os.getenv("WHISPER_MODEL", "base")
        self._model = None
    
    @property
    def model(self):
        """Lazy load the Whisper model"""
        if self._model is None:
            print(f"Loading Whisper model: {self.model_name}")
            self._model = whisper.load_model(self.model_name)
        return self._model
    
    def extract_audio(self, video_path: str) -> str:
        """
        Extract audio from a video file.
        
        Args:
            video_path: Path to the video file
            
        Returns:
            Path to the extracted audio file (wav format)
        """
        # Create temp file for audio
        temp_audio = tempfile.NamedTemporaryFile(
            suffix=".wav",
            delete=False
        )
        temp_audio.close()
        
        try:
            # Extract audio using MoviePy
            video = VideoFileClip(video_path)
            video.audio.write_audiofile(
                temp_audio.name,
                codec="pcm_s16le",
                fps=16000,  # Whisper expects 16kHz
                verbose=False,
                logger=None
            )
            video.close()
            return temp_audio.name
        except Exception as e:
            # Clean up on error
            Path(temp_audio.name).unlink(missing_ok=True)
            raise Exception(f"Failed to extract audio: {str(e)}")
    
    def transcribe(self, video_path: str, language: Optional[str] = None) -> Dict[str, Any]:
        """
        Transcribe a video file.
        
        Args:
            video_path: Path to the video file
            language: Optional language code (e.g., 'en', 'es'). Auto-detected if None.
            
        Returns:
            Dictionary with transcription results including text, segments, and word timestamps
        """
        audio_path = None
        
        try:
            # Extract audio
            audio_path = self.extract_audio(video_path)
            
            # Transcribe with Whisper
            result = self.model.transcribe(
                audio_path,
                language=language,
                word_timestamps=True,
                verbose=False
            )
            
            # Process segments
            segments = []
            word_timestamps = []
            
            for segment in result.get("segments", []):
                seg_data = {
                    "id": segment.get("id"),
                    "start": segment.get("start", 0),
                    "end": segment.get("end", 0),
                    "text": segment.get("text", "").strip(),
                }
                segments.append(seg_data)
                
                # Extract word-level timestamps
                for word_info in segment.get("words", []):
                    word_timestamps.append({
                        "word": word_info.get("word", "").strip(),
                        "start": word_info.get("start", 0),
                        "end": word_info.get("end", 0),
                        "confidence": word_info.get("probability", 1.0)
                    })
            
            return {
                "text": result.get("text", "").strip(),
                "language": result.get("language", "unknown"),
                "segments": segments,
                "word_timestamps": word_timestamps
            }
            
        finally:
            # Clean up temp audio file
            if audio_path:
                Path(audio_path).unlink(missing_ok=True)
    
    def transcribe_for_subtitles(
        self,
        video_path: str,
        max_chars_per_line: int = 42,
        max_words_per_segment: int = 8
    ) -> List[Dict[str, Any]]:
        """
        Transcribe video and format for subtitle generation.
        
        Args:
            video_path: Path to the video file
            max_chars_per_line: Maximum characters per subtitle line
            max_words_per_segment: Maximum words per subtitle segment
            
        Returns:
            List of subtitle segments with timing and text
        """
        result = self.transcribe(video_path)
        word_timestamps = result.get("word_timestamps", [])
        
        subtitles = []
        current_segment = {
            "words": [],
            "start": None,
            "end": None
        }
        
        for word_info in word_timestamps:
            word = word_info["word"]
            
            # Check if we should start a new segment
            current_text = " ".join(w["word"] for w in current_segment["words"])
            potential_text = f"{current_text} {word}".strip()
            
            should_split = (
                len(potential_text) > max_chars_per_line or
                len(current_segment["words"]) >= max_words_per_segment
            )
            
            if should_split and current_segment["words"]:
                # Save current segment
                subtitles.append({
                    "start": current_segment["start"],
                    "end": current_segment["end"],
                    "text": current_text
                })
                # Start new segment
                current_segment = {
                    "words": [],
                    "start": None,
                    "end": None
                }
            
            # Add word to current segment
            if current_segment["start"] is None:
                current_segment["start"] = word_info["start"]
            current_segment["end"] = word_info["end"]
            current_segment["words"].append(word_info)
        
        # Don't forget the last segment
        if current_segment["words"]:
            current_text = " ".join(w["word"] for w in current_segment["words"])
            subtitles.append({
                "start": current_segment["start"],
                "end": current_segment["end"],
                "text": current_text
            })
        
        return subtitles
    
    def generate_srt(self, video_path: str, output_path: str) -> str:
        """
        Generate an SRT subtitle file from a video.
        
        Args:
            video_path: Path to the video file
            output_path: Path for the output SRT file
            
        Returns:
            Path to the generated SRT file
        """
        subtitles = self.transcribe_for_subtitles(video_path)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            for i, sub in enumerate(subtitles, 1):
                start_time = self._format_srt_time(sub["start"])
                end_time = self._format_srt_time(sub["end"])
                
                f.write(f"{i}\n")
                f.write(f"{start_time} --> {end_time}\n")
                f.write(f"{sub['text']}\n")
                f.write("\n")
        
        return output_path
    
    def _format_srt_time(self, seconds: float) -> str:
        """Format time in SRT format (HH:MM:SS,mmm)"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds % 1) * 1000)
        
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"
