# AI Video Editor - TODO

> Built with Gemini CLI + Antigravity IDE

---

## ✅ Core Features (Implemented)

### Transcription
- [x] Whisper (OpenAI) integration for local transcription
- [x] Multi-language support
- [x] Word-level timestamps for subtitle alignment
- [x] SRT export

### Video Editing
- [x] Silence detection & auto-cut
- [x] Brainrot mode (half user clip + half doom-scroll footage)
- [x] Color grading / auto color correction
- [x] Subtitle generation from transcription
- [x] Video export (MP4)

---

## 🔄 In Progress

### Scene Detection
- [ ] Detect scene changes for easier editing
- [ ] Auto-generate highlights from long clips
- [ ] Clip fusion (combine parts of multiple videos)

### Audio
- [ ] Audio normalization
- [ ] Noise removal
- [ ] Background music addition (beat-matched)

---

## 📋 Planned Features

### AI Enhancement
- [ ] Style transfer from reference video
- [ ] Video upscaling (ESRGAN / Video2X) for HD/4K
- [ ] Emotion detection → auto-add effects based on speech sentiment
- [ ] Content summarization → auto-cut long clips to highlights

### Subtitle & Overlay
- [ ] Font styling, background box, auto-positioning
- [ ] Highlight keywords
- [ ] AI-generated emojis, effects, annotations

### Export Options
- [ ] WebM, GIF formats
- [ ] TikTok / Instagram / YouTube Shorts ready formats
- [ ] Auto-generate thumbnail (frame extraction + AI enhancement)

---

## 🚀 Next-Level Ideas

### CLI Integration
- [ ] `gemini video remix clip.mp4 --style doom --subtitle auto --download`
- [ ] Pipeline commands: transcription → style → export
- [ ] Cron jobs for automated video production

### IDE Integration (Antigravity)
- [ ] Drag-and-drop video blocks in visual editor
- [ ] Waveform + transcription + clip segments view
- [ ] Real-time preview with effect toggles

### Automation / Bots
- [ ] Pull clips from YouTube / TikTok / Reels API
- [ ] Auto remix, color correct, upload to platform
- [ ] Scheduled "video generation bots"

### Creative Enhancements
- [ ] Auto-generate social media captions
- [ ] AI thumbnail generation
- [ ] Music track suggestions matching video vibe
- [ ] Beat-synced transitions (match music to scene cuts)

### Collaboration
- [ ] Multi-user simultaneous editing
- [ ] Git-like version control for video edits (branch, revert)

### Multi-Modal Input
- [ ] Text-to-video (generate clips from prompts)
- [ ] Audio-to-video (remix music/narration)
- [ ] Image-to-video (Ken Burns effect, AI pan/zoom)

### Monetization & Sharing
- [ ] Platform-optimized exports (TikTok, IG, Shorts)
- [ ] Watermarking for branding
- [ ] Scheduled posting via platform APIs

---

## 💡 Ultimate Goal: AI Video Designer

One-command video generation:
```bash
gemini video-gen clip.mp4 --mood doom --auto-sub --hd
```

AI handles:
- Clip remix
- Color/style transfer  
- Subtitles
- Music
- Export ready-to-post

---

## 📁 Project Structure

```
├── web/                 # Next.js frontend (Editor + AI Tools)
├── backend/             # Python FastAPI (Whisper, MoviePy, OpenCV)
└── server/              # Node.js (Veo video generation - optional)
```

## 🔧 Commands

```bash
# Frontend
cd web && npm run dev

# Backend  
cd backend && source venv/Scripts/activate && python run.py
```