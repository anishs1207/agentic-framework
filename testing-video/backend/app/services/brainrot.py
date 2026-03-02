"""
Brainrot Video Processor
Combines main content with background "brainrot" videos (like Subway Surfers, satisfying videos)
in split-screen format optimized for short-form content
"""

import os
from typing import Optional, Tuple, List

# Configure FFmpeg path from imageio-ffmpeg before importing moviepy
try:
    import imageio_ffmpeg
    os.environ["IMAGEIO_FFMPEG_EXE"] = imageio_ffmpeg.get_ffmpeg_exe()
    ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
except ImportError:
    ffmpeg_path = None

from moviepy.editor import (
    VideoFileClip,
    CompositeVideoClip,
    ColorClip,
    clips_array
)
from moviepy.video.fx.all import resize, loop
import numpy as np

# Configure moviepy to use the bundled ffmpeg
if ffmpeg_path:
    from moviepy.config import change_settings
    change_settings({"FFMPEG_BINARY": ffmpeg_path})


class BrainrotProcessor:
    """Service for creating brainrot-style split-screen videos"""
    
    # Standard short-form dimensions
    SHORT_FORM_WIDTH = 1080
    SHORT_FORM_HEIGHT = 1920
    
    def combine_videos(
        self,
        main_video_path: str,
        brainrot_video_path: str,
        output_path: str,
        layout: str = "vertical",
        position: str = "top",
        main_ratio: float = 0.5,
        target_width: int = None,
        target_height: int = None
    ) -> str:
        """
        Combine main video with brainrot background video.
        
        Args:
            main_video_path: Path to the main content video
            brainrot_video_path: Path to the brainrot video (Subway Surfers, etc.)
            output_path: Path for output video
            layout: "vertical" (top/bottom) or "horizontal" (side by side)
            position: Position of brainrot video - "top", "bottom", "left", "right"
            main_ratio: Ratio of screen for main video (0.0 to 1.0)
            target_width: Output width (default 1080)
            target_height: Output height (default 1920)
            
        Returns:
            Path to the output video
        """
        target_width = target_width or self.SHORT_FORM_WIDTH
        target_height = target_height or self.SHORT_FORM_HEIGHT
        
        # Load videos
        main_video = VideoFileClip(main_video_path)
        brainrot_video = VideoFileClip(brainrot_video_path)
        
        # Calculate dimensions based on layout
        if layout == "vertical":
            main_height = int(target_height * main_ratio)
            brainrot_height = target_height - main_height
            
            # Resize main video to fit its portion
            main_resized = self._resize_to_fit(
                main_video,
                target_width,
                main_height
            )
            
            # Resize brainrot video to fit its portion
            brainrot_resized = self._resize_to_fit(
                brainrot_video,
                target_width,
                brainrot_height
            )
            
            # Loop brainrot video if shorter than main
            if brainrot_resized.duration < main_resized.duration:
                brainrot_resized = loop(brainrot_resized, duration=main_resized.duration)
            else:
                brainrot_resized = brainrot_resized.subclip(0, main_resized.duration)
            
            # Position videos
            if position == "top":
                # Brainrot on top, main on bottom
                brainrot_positioned = brainrot_resized.set_position(("center", 0))
                main_positioned = main_resized.set_position(("center", brainrot_height))
            else:
                # Main on top, brainrot on bottom
                main_positioned = main_resized.set_position(("center", 0))
                brainrot_positioned = brainrot_resized.set_position(("center", main_height))
            
        else:  # horizontal layout
            main_width = int(target_width * main_ratio)
            brainrot_width = target_width - main_width
            
            # Resize videos
            main_resized = self._resize_to_fit(
                main_video,
                main_width,
                target_height
            )
            
            brainrot_resized = self._resize_to_fit(
                brainrot_video,
                brainrot_width,
                target_height
            )
            
            # Loop brainrot if needed
            if brainrot_resized.duration < main_resized.duration:
                brainrot_resized = loop(brainrot_resized, duration=main_resized.duration)
            else:
                brainrot_resized = brainrot_resized.subclip(0, main_resized.duration)
            
            # Position videos
            if position == "left":
                # Brainrot on left, main on right
                brainrot_positioned = brainrot_resized.set_position((0, "center"))
                main_positioned = main_resized.set_position((brainrot_width, "center"))
            else:
                # Main on left, brainrot on right
                main_positioned = main_resized.set_position((0, "center"))
                brainrot_positioned = brainrot_resized.set_position((main_width, "center"))
        
        # Create black background
        background = ColorClip(
            size=(target_width, target_height),
            color=(0, 0, 0)
        ).set_duration(main_resized.duration)
        
        # Composite all layers
        final = CompositeVideoClip(
            [background, brainrot_positioned, main_positioned],
            size=(target_width, target_height)
        )
        
        # Keep audio from main video only
        if main_video.audio:
            final = final.set_audio(main_video.audio)
        
        # Write output
        final.write_videofile(
            output_path,
            codec="libx264",
            audio_codec="aac",
            temp_audiofile=f"{output_path}_temp_audio.m4a",
            remove_temp=True,
            fps=30,
            logger=None
        )
        
        # Cleanup
        main_video.close()
        brainrot_video.close()
        main_resized.close()
        brainrot_resized.close()
        final.close()
        
        return output_path
    
    def _resize_to_fit(
        self,
        video: VideoFileClip,
        target_width: int,
        target_height: int,
        fill_mode: str = "cover"
    ) -> VideoFileClip:
        """
        Resize video to fit within target dimensions.
        
        Args:
            video: Input video clip
            target_width: Target width
            target_height: Target height
            fill_mode: "cover" (fill entire area, may crop) or "contain" (fit entirely)
            
        Returns:
            Resized video clip
        """
        video_aspect = video.size[0] / video.size[1]
        target_aspect = target_width / target_height
        
        if fill_mode == "cover":
            # Scale to cover entire target area
            if video_aspect > target_aspect:
                # Video is wider - scale by height
                new_height = target_height
                new_width = int(video.size[0] * (target_height / video.size[1]))
            else:
                # Video is taller - scale by width
                new_width = target_width
                new_height = int(video.size[1] * (target_width / video.size[0]))
            
            resized = video.resize(newsize=(new_width, new_height))
            
            # Crop to target size
            x_center = new_width // 2
            y_center = new_height // 2
            
            return resized.crop(
                x_center=x_center,
                y_center=y_center,
                width=target_width,
                height=target_height
            )
        else:
            # Contain mode - fit entirely within bounds
            if video_aspect > target_aspect:
                new_width = target_width
                new_height = int(target_width / video_aspect)
            else:
                new_height = target_height
                new_width = int(target_height * video_aspect)
            
            return video.resize(newsize=(new_width, new_height))
    
    def create_with_animation(
        self,
        main_video_path: str,
        brainrot_video_path: str,
        output_path: str,
        animation_style: str = "slide_in",
        main_ratio: float = 0.5
    ) -> str:
        """
        Create brainrot video with animated transitions.
        
        Args:
            main_video_path: Path to main video
            brainrot_video_path: Path to brainrot video
            output_path: Path for output
            animation_style: "slide_in", "fade_in", "zoom_in"
            main_ratio: Ratio for main video
            
        Returns:
            Path to output video
        """
        # For now, use standard combine (animations can be added later)
        return self.combine_videos(
            main_video_path,
            brainrot_video_path,
            output_path,
            layout="vertical",
            position="top",
            main_ratio=main_ratio
        )
    
    def create_picture_in_picture(
        self,
        main_video_path: str,
        pip_video_path: str,
        output_path: str,
        pip_position: Tuple[float, float] = (0.7, 0.7),
        pip_scale: float = 0.3,
        pip_border: bool = True
    ) -> str:
        """
        Create picture-in-picture style video.
        
        Args:
            main_video_path: Path to main background video
            pip_video_path: Path to picture-in-picture video
            output_path: Path for output
            pip_position: Position of PiP as ratio (x, y)
            pip_scale: Scale of PiP relative to main video
            pip_border: Whether to add border around PiP
            
        Returns:
            Path to output video
        """
        main_video = VideoFileClip(main_video_path)
        pip_video = VideoFileClip(pip_video_path)
        
        # Resize for short-form
        main_resized = self._resize_to_fit(
            main_video,
            self.SHORT_FORM_WIDTH,
            self.SHORT_FORM_HEIGHT
        )
        
        # Calculate PiP size
        pip_width = int(self.SHORT_FORM_WIDTH * pip_scale)
        pip_height = int(pip_width * pip_video.size[1] / pip_video.size[0])
        
        pip_resized = pip_video.resize(newsize=(pip_width, pip_height))
        
        # Loop PiP if needed
        if pip_resized.duration < main_resized.duration:
            pip_resized = loop(pip_resized, duration=main_resized.duration)
        else:
            pip_resized = pip_resized.subclip(0, main_resized.duration)
        
        # Calculate position
        x = int((self.SHORT_FORM_WIDTH - pip_width) * pip_position[0])
        y = int((self.SHORT_FORM_HEIGHT - pip_height) * pip_position[1])
        
        pip_positioned = pip_resized.set_position((x, y))
        
        # Add border if requested
        if pip_border:
            border_clip = ColorClip(
                size=(pip_width + 6, pip_height + 6),
                color=(255, 255, 255)
            ).set_duration(main_resized.duration).set_position((x - 3, y - 3))
            
            final = CompositeVideoClip([main_resized, border_clip, pip_positioned])
        else:
            final = CompositeVideoClip([main_resized, pip_positioned])
        
        # Keep audio from main video
        if main_video.audio:
            final = final.set_audio(main_video.audio)
        
        final.write_videofile(
            output_path,
            codec="libx264",
            audio_codec="aac",
            temp_audiofile=f"{output_path}_temp_audio.m4a",
            remove_temp=True,
            fps=30,
            logger=None
        )
        
        # Cleanup
        main_video.close()
        pip_video.close()
        final.close()
        
        return output_path
    
    def get_brainrot_presets(self) -> List[dict]:
        """
        Get available brainrot presets/layouts.
        
        Returns:
            List of preset configurations
        """
        return [
            {
                "id": "classic_split",
                "name": "Classic Split (Top/Bottom)",
                "layout": "vertical",
                "position": "top",
                "main_ratio": 0.5,
                "description": "Main content on bottom, gameplay on top"
            },
            {
                "id": "main_focus",
                "name": "Main Focus (60/40)",
                "layout": "vertical",
                "position": "bottom",
                "main_ratio": 0.6,
                "description": "Larger main content area"
            },
            {
                "id": "brainrot_focus",
                "name": "Brainrot Focus (40/60)",
                "layout": "vertical",
                "position": "top",
                "main_ratio": 0.4,
                "description": "Larger gameplay area"
            },
            {
                "id": "pip_corner",
                "name": "Picture in Picture",
                "layout": "pip",
                "position": (0.7, 0.7),
                "pip_scale": 0.3,
                "description": "Small gameplay in corner"
            },
            {
                "id": "side_by_side",
                "name": "Side by Side",
                "layout": "horizontal",
                "position": "left",
                "main_ratio": 0.5,
                "description": "Horizontal split layout"
            }
        ]
