"""
AI Video Processing Backend
Main FastAPI application for video processing, transcription, and auto-editing
"""

import os
import uuid
import shutil
from pathlib import Path
from typing import Optional, List
from dotenv import load_dotenv

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from .services.transcription import TranscriptionService
from .services.video_processor import VideoProcessor
from .services.audio_analyzer import AudioAnalyzer
from .services.color_correction import ColorCorrector
from .services.brainrot import BrainrotProcessor

load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="AI Video Editor Backend",
    description="Backend API for AI-powered video processing, transcription, and auto-editing",
    version="1.0.0"
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
UPLOAD_FOLDER = Path(os.getenv("UPLOAD_FOLDER", "./uploads"))
OUTPUT_FOLDER = Path(os.getenv("OUTPUT_FOLDER", "./outputs"))
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
OUTPUT_FOLDER.mkdir(parents=True, exist_ok=True)

# Initialize services
transcription_service = TranscriptionService()
video_processor = VideoProcessor()
audio_analyzer = AudioAnalyzer()
color_corrector = ColorCorrector()
brainrot_processor = BrainrotProcessor()


# Pydantic Models
class TranscriptionResponse(BaseModel):
    job_id: str
    status: str
    text: Optional[str] = None
    segments: Optional[List[dict]] = None
    word_timestamps: Optional[List[dict]] = None


class AutoCutRequest(BaseModel):
    silence_threshold: float = -40  # dB
    min_silence_duration: float = 0.5  # seconds
    padding: float = 0.1  # seconds padding around cuts


class BrainrotRequest(BaseModel):
    main_video_id: str
    brainrot_video_id: str
    layout: str = "vertical"  # vertical (top/bottom) or horizontal (side by side)
    brainrot_position: str = "top"  # top, bottom, left, right
    main_video_ratio: float = 0.5  # ratio of screen for main video


class ColorCorrectionParams(BaseModel):
    brightness: float = 0
    contrast: float = 1
    saturation: float = 1
    temperature: float = 0
    vibrance: float = 0
    auto_enhance: bool = False


# Store for job status
job_store = {}


@app.get("/")
async def root():
    return {"message": "AI Video Editor Backend Running", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# ============================================
# VIDEO UPLOAD ENDPOINTS
# ============================================

@app.post("/api/upload")
async def upload_video(file: UploadFile = File(...)):
    """Upload a video file for processing"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    # Generate unique ID
    file_id = str(uuid.uuid4())
    
    # Get file extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v']:
        raise HTTPException(status_code=400, detail="Unsupported video format")
    
    # Save file
    file_path = UPLOAD_FOLDER / f"{file_id}{ext}"
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Get video metadata
    try:
        metadata = video_processor.get_metadata(str(file_path))
    except Exception as e:
        metadata = {"error": str(e)}
    
    return {
        "file_id": file_id,
        "filename": file.filename,
        "path": str(file_path),
        "metadata": metadata
    }


@app.delete("/api/upload/{file_id}")
async def delete_upload(file_id: str):
    """Delete an uploaded file"""
    # Find file with any extension
    for file_path in UPLOAD_FOLDER.glob(f"{file_id}.*"):
        file_path.unlink()
        return {"message": "File deleted", "file_id": file_id}
    
    raise HTTPException(status_code=404, detail="File not found")


# ============================================
# TRANSCRIPTION ENDPOINTS
# ============================================

@app.post("/api/transcribe/{file_id}")
async def transcribe_video(file_id: str, background_tasks: BackgroundTasks):
    """Start transcription for a video"""
    # Find the uploaded file
    file_path = None
    for path in UPLOAD_FOLDER.glob(f"{file_id}.*"):
        file_path = path
        break
    
    if not file_path:
        raise HTTPException(status_code=404, detail="Video file not found")
    
    # Create job
    job_id = str(uuid.uuid4())
    job_store[job_id] = {"status": "processing", "file_id": file_id}
    
    # Run transcription in background
    background_tasks.add_task(
        run_transcription,
        job_id,
        str(file_path)
    )
    
    return {"job_id": job_id, "status": "processing"}


async def run_transcription(job_id: str, file_path: str):
    """Background task for transcription"""
    try:
        result = transcription_service.transcribe(file_path)
        job_store[job_id] = {
            "status": "completed",
            "text": result["text"],
            "segments": result["segments"],
            "word_timestamps": result.get("word_timestamps", [])
        }
    except Exception as e:
        job_store[job_id] = {"status": "failed", "error": str(e)}


@app.get("/api/transcribe/status/{job_id}")
async def get_transcription_status(job_id: str):
    """Get transcription job status"""
    if job_id not in job_store:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return job_store[job_id]


# ============================================
# AUTO-CUT ENDPOINTS
# ============================================

@app.post("/api/autocut/{file_id}")
async def auto_cut_video(
    file_id: str,
    background_tasks: BackgroundTasks,
    silence_threshold: float = -40,
    min_silence_duration: float = 0.5,
    padding: float = 0.1
):
    """Auto-cut video based on audio (remove silences)"""
    # Find the uploaded file
    file_path = None
    for path in UPLOAD_FOLDER.glob(f"{file_id}.*"):
        file_path = path
        break
    
    if not file_path:
        raise HTTPException(status_code=404, detail="Video file not found")
    
    # Create job
    job_id = str(uuid.uuid4())
    job_store[job_id] = {"status": "processing", "type": "autocut"}
    
    # Run auto-cut in background
    background_tasks.add_task(
        run_auto_cut,
        job_id,
        str(file_path),
        silence_threshold,
        min_silence_duration,
        padding
    )
    
    return {"job_id": job_id, "status": "processing"}


async def run_auto_cut(
    job_id: str,
    file_path: str,
    silence_threshold: float,
    min_silence_duration: float,
    padding: float
):
    """Background task for auto-cutting"""
    try:
        # Analyze audio
        segments = audio_analyzer.detect_speech_segments(
            file_path,
            silence_threshold=silence_threshold,
            min_silence_len=int(min_silence_duration * 1000)
        )
        
        # Generate output filename
        output_filename = f"autocut_{uuid.uuid4()}.mp4"
        output_path = OUTPUT_FOLDER / output_filename
        
        # Process video with auto-cuts
        video_processor.auto_cut(
            file_path,
            str(output_path),
            segments,
            padding=padding
        )
        
        job_store[job_id] = {
            "status": "completed",
            "output_path": str(output_path),
            "output_filename": output_filename,
            "segments": segments,
            "original_duration": audio_analyzer.get_duration(file_path),
            "new_duration": video_processor.get_duration(str(output_path))
        }
    except Exception as e:
        job_store[job_id] = {"status": "failed", "error": str(e)}


@app.get("/api/analyze-audio/{file_id}")
async def analyze_audio(file_id: str, silence_threshold: float = -40):
    """Analyze audio to detect speech segments without cutting"""
    # Find the uploaded file
    file_path = None
    for path in UPLOAD_FOLDER.glob(f"{file_id}.*"):
        file_path = path
        break
    
    if not file_path:
        raise HTTPException(status_code=404, detail="Video file not found")
    
    try:
        segments = audio_analyzer.detect_speech_segments(
            str(file_path),
            silence_threshold=silence_threshold
        )
        
        return {
            "file_id": file_id,
            "segments": segments,
            "total_speech_duration": sum(s["end"] - s["start"] for s in segments),
            "total_duration": audio_analyzer.get_duration(str(file_path))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# BRAINROT MODE ENDPOINTS
# ============================================

@app.post("/api/brainrot/combine")
async def combine_brainrot(
    request: BrainrotRequest,
    background_tasks: BackgroundTasks
):
    """Combine main video with brainrot background video"""
    # Find both videos
    main_video_path = None
    brainrot_video_path = None
    
    for path in UPLOAD_FOLDER.glob(f"{request.main_video_id}.*"):
        main_video_path = path
        break
    
    for path in UPLOAD_FOLDER.glob(f"{request.brainrot_video_id}.*"):
        brainrot_video_path = path
        break
    
    if not main_video_path:
        raise HTTPException(status_code=404, detail="Main video not found")
    if not brainrot_video_path:
        raise HTTPException(status_code=404, detail="Brainrot video not found")
    
    # Create job
    job_id = str(uuid.uuid4())
    job_store[job_id] = {"status": "processing", "type": "brainrot"}
    
    # Run in background
    background_tasks.add_task(
        run_brainrot_combine,
        job_id,
        str(main_video_path),
        str(brainrot_video_path),
        request.layout,
        request.brainrot_position,
        request.main_video_ratio
    )
    
    return {"job_id": job_id, "status": "processing"}


async def run_brainrot_combine(
    job_id: str,
    main_path: str,
    brainrot_path: str,
    layout: str,
    position: str,
    ratio: float
):
    """Background task for brainrot video combination"""
    try:
        output_filename = f"brainrot_{uuid.uuid4()}.mp4"
        output_path = OUTPUT_FOLDER / output_filename
        
        brainrot_processor.combine_videos(
            main_path,
            brainrot_path,
            str(output_path),
            layout=layout,
            position=position,
            main_ratio=ratio
        )
        
        job_store[job_id] = {
            "status": "completed",
            "output_path": str(output_path),
            "output_filename": output_filename
        }
    except Exception as e:
        job_store[job_id] = {"status": "failed", "error": str(e)}


# ============================================
# COLOR CORRECTION ENDPOINTS
# ============================================

@app.post("/api/color-correct/{file_id}")
async def apply_color_correction(
    file_id: str,
    params: ColorCorrectionParams,
    background_tasks: BackgroundTasks
):
    """Apply color correction to video"""
    # Find the uploaded file
    file_path = None
    for path in UPLOAD_FOLDER.glob(f"{file_id}.*"):
        file_path = path
        break
    
    if not file_path:
        raise HTTPException(status_code=404, detail="Video file not found")
    
    # Create job
    job_id = str(uuid.uuid4())
    job_store[job_id] = {"status": "processing", "type": "color_correction"}
    
    # Run in background
    background_tasks.add_task(
        run_color_correction,
        job_id,
        str(file_path),
        params
    )
    
    return {"job_id": job_id, "status": "processing"}


async def run_color_correction(
    job_id: str,
    file_path: str,
    params: ColorCorrectionParams
):
    """Background task for color correction"""
    try:
        output_filename = f"colorcorrect_{uuid.uuid4()}.mp4"
        output_path = OUTPUT_FOLDER / output_filename
        
        color_corrector.process_video(
            file_path,
            str(output_path),
            brightness=params.brightness,
            contrast=params.contrast,
            saturation=params.saturation,
            temperature=params.temperature,
            vibrance=params.vibrance,
            auto_enhance=params.auto_enhance
        )
        
        job_store[job_id] = {
            "status": "completed",
            "output_path": str(output_path),
            "output_filename": output_filename
        }
    except Exception as e:
        job_store[job_id] = {"status": "failed", "error": str(e)}


# ============================================
# JOB STATUS AND DOWNLOAD ENDPOINTS
# ============================================

@app.get("/api/job/{job_id}")
async def get_job_status(job_id: str):
    """Get status of any processing job"""
    if job_id not in job_store:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return job_store[job_id]


@app.get("/api/download/{filename}")
async def download_file(filename: str):
    """Download a processed video file"""
    file_path = OUTPUT_FOLDER / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type="video/mp4"
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
