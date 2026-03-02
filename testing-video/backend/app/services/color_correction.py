"""
Color Correction Service
Provides color grading and correction for video content
"""

import os
import cv2
import numpy as np
from typing import Optional

# Configure FFmpeg path from imageio-ffmpeg before importing moviepy
try:
    import imageio_ffmpeg
    os.environ["IMAGEIO_FFMPEG_EXE"] = imageio_ffmpeg.get_ffmpeg_exe()
    ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
except ImportError:
    ffmpeg_path = None

from moviepy.editor import VideoFileClip, VideoClip

# Configure moviepy to use the bundled ffmpeg
if ffmpeg_path:
    from moviepy.config import change_settings
    change_settings({"FFMPEG_BINARY": ffmpeg_path})


class ColorCorrector:
    """Service for applying color correction and grading to videos"""
    
    def process_frame(
        self,
        frame: np.ndarray,
        brightness: float = 0,
        contrast: float = 1,
        saturation: float = 1,
        temperature: float = 0,
        vibrance: float = 0,
        auto_enhance: bool = False
    ) -> np.ndarray:
        """
        Apply color correction to a single frame.
        
        Args:
            frame: Input frame (RGB)
            brightness: Brightness adjustment (-100 to 100)
            contrast: Contrast multiplier (0.5 to 2.0)
            saturation: Saturation multiplier (0 to 2.0)
            temperature: Color temperature (-100 to 100, negative = cooler)
            vibrance: Vibrance boost (0 to 100)
            auto_enhance: Whether to apply automatic enhancement
            
        Returns:
            Corrected frame
        """
        # Convert to float for processing
        img = frame.astype(np.float32) / 255.0
        
        # Auto enhancement (histogram equalization on luminance)
        if auto_enhance:
            img = self._auto_enhance(img)
        
        # Brightness adjustment
        if brightness != 0:
            img = img + (brightness / 100.0)
        
        # Contrast adjustment
        if contrast != 1:
            img = (img - 0.5) * contrast + 0.5
        
        # Color temperature adjustment
        if temperature != 0:
            img = self._adjust_temperature(img, temperature)
        
        # Convert to HSV for saturation/vibrance
        if saturation != 1 or vibrance != 0:
            img = self._adjust_saturation_vibrance(img, saturation, vibrance)
        
        # Clip and convert back to uint8
        img = np.clip(img, 0, 1)
        return (img * 255).astype(np.uint8)
    
    def _auto_enhance(self, img: np.ndarray) -> np.ndarray:
        """Apply automatic histogram equalization on luminance"""
        # Convert to LAB color space
        lab = cv2.cvtColor((img * 255).astype(np.uint8), cv2.COLOR_RGB2LAB)
        
        # Apply CLAHE to L channel
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        lab[:, :, 0] = clahe.apply(lab[:, :, 0])
        
        # Convert back to RGB
        enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
        return enhanced.astype(np.float32) / 255.0
    
    def _adjust_temperature(self, img: np.ndarray, temperature: float) -> np.ndarray:
        """
        Adjust color temperature.
        Positive = warmer (more red/yellow)
        Negative = cooler (more blue)
        """
        temp_factor = temperature / 100.0
        
        result = img.copy()
        
        if temp_factor > 0:
            # Warmer: boost red, reduce blue
            result[:, :, 0] = result[:, :, 0] + temp_factor * 0.3  # Red
            result[:, :, 2] = result[:, :, 2] - temp_factor * 0.3  # Blue
        else:
            # Cooler: boost blue, reduce red
            result[:, :, 0] = result[:, :, 0] + temp_factor * 0.3  # Red (will subtract)
            result[:, :, 2] = result[:, :, 2] - temp_factor * 0.3  # Blue (will add)
        
        return result
    
    def _adjust_saturation_vibrance(
        self,
        img: np.ndarray,
        saturation: float,
        vibrance: float
    ) -> np.ndarray:
        """
        Adjust saturation and vibrance.
        Vibrance boosts less-saturated colors more than already-saturated ones.
        """
        # Convert to HSV
        hsv = cv2.cvtColor((img * 255).astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)
        
        # Saturation adjustment
        hsv[:, :, 1] = hsv[:, :, 1] * saturation
        
        # Vibrance adjustment (boost low saturation pixels more)
        if vibrance != 0:
            # Calculate boost factor based on current saturation
            sat_normalized = hsv[:, :, 1] / 255.0
            boost = (1 - sat_normalized) * (vibrance / 100.0) * 50
            hsv[:, :, 1] = hsv[:, :, 1] + boost
        
        # Clip saturation to valid range
        hsv[:, :, 1] = np.clip(hsv[:, :, 1], 0, 255)
        
        # Convert back to RGB
        result = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2RGB)
        return result.astype(np.float32) / 255.0
    
    def apply_lut(
        self,
        frame: np.ndarray,
        lut_path: str
    ) -> np.ndarray:
        """
        Apply a 3D LUT (Look-Up Table) to a frame.
        
        Args:
            frame: Input frame (RGB)
            lut_path: Path to .cube LUT file
            
        Returns:
            Color graded frame
        """
        # Load LUT from .cube file
        lut = self._load_cube_lut(lut_path)
        
        if lut is None:
            return frame
        
        # Apply LUT
        return self._apply_3d_lut(frame, lut)
    
    def _load_cube_lut(self, lut_path: str) -> Optional[np.ndarray]:
        """Load a .cube LUT file"""
        try:
            with open(lut_path, 'r') as f:
                lines = f.readlines()
            
            size = 0
            data = []
            
            for line in lines:
                line = line.strip()
                if line.startswith('LUT_3D_SIZE'):
                    size = int(line.split()[-1])
                elif line and not line.startswith('#') and not line.startswith('TITLE') and not line.startswith('DOMAIN'):
                    try:
                        values = [float(v) for v in line.split()]
                        if len(values) == 3:
                            data.append(values)
                    except ValueError:
                        continue
            
            if size > 0 and len(data) == size ** 3:
                lut = np.array(data).reshape((size, size, size, 3))
                return lut
            
            return None
        except Exception:
            return None
    
    def _apply_3d_lut(self, frame: np.ndarray, lut: np.ndarray) -> np.ndarray:
        """Apply a 3D LUT to a frame using trilinear interpolation"""
        # This is a simplified implementation
        # For production, consider using cv2.LUT or a dedicated library
        
        size = lut.shape[0]
        img = frame.astype(np.float32) / 255.0
        
        # Scale to LUT size
        scaled = img * (size - 1)
        
        # Get integer and fractional parts
        low = np.floor(scaled).astype(np.int32)
        high = np.minimum(low + 1, size - 1)
        frac = scaled - low
        
        # Trilinear interpolation
        result = np.zeros_like(img)
        
        for c in range(3):
            c000 = lut[low[:,:,0], low[:,:,1], low[:,:,2], c]
            c001 = lut[low[:,:,0], low[:,:,1], high[:,:,2], c]
            c010 = lut[low[:,:,0], high[:,:,1], low[:,:,2], c]
            c011 = lut[low[:,:,0], high[:,:,1], high[:,:,2], c]
            c100 = lut[high[:,:,0], low[:,:,1], low[:,:,2], c]
            c101 = lut[high[:,:,0], low[:,:,1], high[:,:,2], c]
            c110 = lut[high[:,:,0], high[:,:,1], low[:,:,2], c]
            c111 = lut[high[:,:,0], high[:,:,1], high[:,:,2], c]
            
            c00 = c000 * (1 - frac[:,:,0]) + c100 * frac[:,:,0]
            c01 = c001 * (1 - frac[:,:,0]) + c101 * frac[:,:,0]
            c10 = c010 * (1 - frac[:,:,0]) + c110 * frac[:,:,0]
            c11 = c011 * (1 - frac[:,:,0]) + c111 * frac[:,:,0]
            
            c0 = c00 * (1 - frac[:,:,1]) + c10 * frac[:,:,1]
            c1 = c01 * (1 - frac[:,:,1]) + c11 * frac[:,:,1]
            
            result[:,:,c] = c0 * (1 - frac[:,:,2]) + c1 * frac[:,:,2]
        
        return (np.clip(result, 0, 1) * 255).astype(np.uint8)
    
    def process_video(
        self,
        video_path: str,
        output_path: str,
        brightness: float = 0,
        contrast: float = 1,
        saturation: float = 1,
        temperature: float = 0,
        vibrance: float = 0,
        auto_enhance: bool = False,
        lut_path: Optional[str] = None
    ) -> str:
        """
        Apply color correction to an entire video.
        
        Args:
            video_path: Path to input video
            output_path: Path for output video
            brightness: Brightness adjustment
            contrast: Contrast multiplier
            saturation: Saturation multiplier
            temperature: Color temperature adjustment
            vibrance: Vibrance boost
            auto_enhance: Whether to auto-enhance
            lut_path: Optional path to LUT file
            
        Returns:
            Path to the output video
        """
        video = VideoFileClip(video_path)
        
        def make_frame(t):
            frame = video.get_frame(t)
            
            # Apply color correction
            corrected = self.process_frame(
                frame,
                brightness=brightness,
                contrast=contrast,
                saturation=saturation,
                temperature=temperature,
                vibrance=vibrance,
                auto_enhance=auto_enhance
            )
            
            # Apply LUT if provided
            if lut_path:
                corrected = self.apply_lut(corrected, lut_path)
            
            return corrected
        
        # Create new video with corrected frames
        corrected_video = VideoClip(make_frame, duration=video.duration)
        corrected_video = corrected_video.set_fps(video.fps)
        
        # Keep original audio
        if video.audio:
            corrected_video = corrected_video.set_audio(video.audio)
        
        corrected_video.write_videofile(
            output_path,
            codec="libx264",
            audio_codec="aac",
            temp_audiofile=f"{output_path}_temp_audio.m4a",
            remove_temp=True,
            logger=None
        )
        
        video.close()
        
        return output_path
    
    def generate_preview(
        self,
        video_path: str,
        timestamp: float,
        brightness: float = 0,
        contrast: float = 1,
        saturation: float = 1,
        temperature: float = 0,
        vibrance: float = 0,
        auto_enhance: bool = False
    ) -> np.ndarray:
        """
        Generate a preview frame with color correction applied.
        
        Args:
            video_path: Path to input video
            timestamp: Time in video to capture frame
            Other args: Color correction parameters
            
        Returns:
            Corrected frame as numpy array
        """
        video = VideoFileClip(video_path)
        
        # Get frame at timestamp
        frame = video.get_frame(timestamp)
        
        # Apply correction
        corrected = self.process_frame(
            frame,
            brightness=brightness,
            contrast=contrast,
            saturation=saturation,
            temperature=temperature,
            vibrance=vibrance,
            auto_enhance=auto_enhance
        )
        
        video.close()
        
        return corrected
