"""
Video Processor Service
Handles video trimming, merging, cutting, and format conversion
"""

import os
from typing import List, Dict, Any, Optional, Tuple

# Configure FFmpeg path from imageio-ffmpeg before importing moviepy
try:
    import imageio_ffmpeg
    os.environ["IMAGEIO_FFMPEG_EXE"] = imageio_ffmpeg.get_ffmpeg_exe()
    ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
except ImportError:
    ffmpeg_path = None

from moviepy.editor import (
    VideoFileClip,
    AudioFileClip,
    concatenate_videoclips,
    CompositeVideoClip,
    TextClip,
    ColorClip
)
from moviepy.video.fx.all import speedx, resize

# Configure moviepy to use the bundled ffmpeg
if ffmpeg_path:
    from moviepy.config import change_settings
    change_settings({"FFMPEG_BINARY": ffmpeg_path})


class VideoProcessor:
    """Service for video processing operations"""
    
    def get_metadata(self, video_path: str) -> Dict[str, Any]:
        """
        Get metadata from a video file.
        
        Args:
            video_path: Path to the video file
            
        Returns:
            Dictionary with video metadata
        """
        video = VideoFileClip(video_path)
        
        metadata = {
            "duration": video.duration,
            "fps": video.fps,
            "size": video.size,  # [width, height]
            "width": video.size[0],
            "height": video.size[1],
            "aspect_ratio": video.size[0] / video.size[1] if video.size[1] > 0 else 0,
            "has_audio": video.audio is not None,
            "rotation": getattr(video, 'rotation', 0)
        }
        
        video.close()
        return metadata
    
    def get_duration(self, video_path: str) -> float:
        """Get video duration in seconds"""
        video = VideoFileClip(video_path)
        duration = video.duration
        video.close()
        return duration
    
    def trim(
        self,
        video_path: str,
        output_path: str,
        start_time: float,
        end_time: float
    ) -> str:
        """
        Trim a video to a specific time range.
        
        Args:
            video_path: Path to input video
            output_path: Path for output video
            start_time: Start time in seconds
            end_time: End time in seconds
            
        Returns:
            Path to the output video
        """
        video = VideoFileClip(video_path)
        trimmed = video.subclip(start_time, min(end_time, video.duration))
        
        trimmed.write_videofile(
            output_path,
            codec="libx264",
            audio_codec="aac",
            temp_audiofile=f"{output_path}_temp_audio.m4a",
            remove_temp=True,
            logger=None
        )
        
        video.close()
        trimmed.close()
        
        return output_path
    
    def auto_cut(
        self,
        video_path: str,
        output_path: str,
        segments: List[Dict[str, float]],
        padding: float = 0.1,
        transition: str = "none"
    ) -> str:
        """
        Auto-cut video based on speech segments.
        
        Args:
            video_path: Path to input video
            output_path: Path for output video
            segments: List of segments with start/end times
            padding: Padding to add around each segment
            transition: Transition type between segments
            
        Returns:
            Path to the output video
        """
        if not segments:
            raise ValueError("No segments provided for auto-cut")
        
        video = VideoFileClip(video_path)
        
        clips = []
        for seg in segments:
            start = max(0, seg["start"] - padding)
            end = min(video.duration, seg["end"] + padding)
            
            if end > start:
                clip = video.subclip(start, end)
                clips.append(clip)
        
        if not clips:
            video.close()
            raise ValueError("No valid clips after processing segments")
        
        # Concatenate all clips
        final = concatenate_videoclips(clips, method="compose")
        
        final.write_videofile(
            output_path,
            codec="libx264",
            audio_codec="aac",
            temp_audiofile=f"{output_path}_temp_audio.m4a",
            remove_temp=True,
            logger=None
        )
        
        # Cleanup
        for clip in clips:
            clip.close()
        final.close()
        video.close()
        
        return output_path
    
    def resize_for_short_form(
        self,
        video_path: str,
        output_path: str,
        target_width: int = 1080,
        target_height: int = 1920
    ) -> str:
        """
        Resize video for short-form content (9:16 aspect ratio).
        
        Args:
            video_path: Path to input video
            output_path: Path for output video
            target_width: Target width (default 1080)
            target_height: Target height (default 1920)
            
        Returns:
            Path to the output video
        """
        video = VideoFileClip(video_path)
        
        # Calculate scaling
        video_aspect = video.size[0] / video.size[1]
        target_aspect = target_width / target_height
        
        if video_aspect > target_aspect:
            # Video is wider - scale by height and crop width
            new_height = target_height
            new_width = int(video.size[0] * (target_height / video.size[1]))
        else:
            # Video is taller - scale by width and crop height
            new_width = target_width
            new_height = int(video.size[1] * (target_width / video.size[0]))
        
        # Resize and crop to center
        resized = video.resize(newsize=(new_width, new_height))
        
        # Calculate crop
        x_center = new_width // 2
        y_center = new_height // 2
        
        final = resized.crop(
            x_center=x_center,
            y_center=y_center,
            width=target_width,
            height=target_height
        )
        
        final.write_videofile(
            output_path,
            codec="libx264",
            audio_codec="aac",
            temp_audiofile=f"{output_path}_temp_audio.m4a",
            remove_temp=True,
            logger=None
        )
        
        video.close()
        resized.close()
        final.close()
        
        return output_path
    
    def add_subtitles(
        self,
        video_path: str,
        output_path: str,
        subtitles: List[Dict[str, Any]],
        font: str = "Arial-Bold",
        font_size: int = 50,
        color: str = "white",
        stroke_color: str = "black",
        stroke_width: int = 2,
        position: Tuple[str, str] = ("center", "bottom")
    ) -> str:
        """
        Add subtitles to a video.
        
        Args:
            video_path: Path to input video
            output_path: Path for output video
            subtitles: List of subtitle dicts with start, end, text
            font: Font family
            font_size: Font size
            color: Text color
            stroke_color: Stroke/outline color
            stroke_width: Stroke width
            position: Position tuple (horizontal, vertical)
            
        Returns:
            Path to the output video
        """
        video = VideoFileClip(video_path)
        
        subtitle_clips = []
        for sub in subtitles:
            txt_clip = TextClip(
                sub["text"],
                font=font,
                fontsize=font_size,
                color=color,
                stroke_color=stroke_color,
                stroke_width=stroke_width,
                method="caption",
                size=(video.size[0] - 100, None)
            )
            
            txt_clip = txt_clip.set_position(position)
            txt_clip = txt_clip.set_start(sub["start"])
            txt_clip = txt_clip.set_end(sub["end"])
            
            subtitle_clips.append(txt_clip)
        
        final = CompositeVideoClip([video] + subtitle_clips)
        
        final.write_videofile(
            output_path,
            codec="libx264",
            audio_codec="aac",
            temp_audiofile=f"{output_path}_temp_audio.m4a",
            remove_temp=True,
            logger=None
        )
        
        # Cleanup
        video.close()
        for clip in subtitle_clips:
            clip.close()
        final.close()
        
        return output_path
    
    def change_speed(
        self,
        video_path: str,
        output_path: str,
        speed_factor: float = 1.0
    ) -> str:
        """
        Change video playback speed.
        
        Args:
            video_path: Path to input video
            output_path: Path for output video
            speed_factor: Speed multiplier (2.0 = 2x faster)
            
        Returns:
            Path to the output video
        """
        video = VideoFileClip(video_path)
        spedup = speedx(video, factor=speed_factor)
        
        spedup.write_videofile(
            output_path,
            codec="libx264",
            audio_codec="aac",
            temp_audiofile=f"{output_path}_temp_audio.m4a",
            remove_temp=True,
            logger=None
        )
        
        video.close()
        spedup.close()
        
        return output_path
    
    def merge_videos(
        self,
        video_paths: List[str],
        output_path: str,
        transition: str = "none"
    ) -> str:
        """
        Merge multiple videos into one.
        
        Args:
            video_paths: List of paths to input videos
            output_path: Path for output video
            transition: Transition type between clips
            
        Returns:
            Path to the output video
        """
        clips = [VideoFileClip(path) for path in video_paths]
        
        final = concatenate_videoclips(clips, method="compose")
        
        final.write_videofile(
            output_path,
            codec="libx264",
            audio_codec="aac",
            temp_audiofile=f"{output_path}_temp_audio.m4a",
            remove_temp=True,
            logger=None
        )
        
        # Cleanup
        for clip in clips:
            clip.close()
        final.close()
        
        return output_path
