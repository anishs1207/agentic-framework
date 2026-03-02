import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import { Track, Asset } from '@/store/useEditorStore';

let ffmpeg: FFmpeg | null = null;
let ffmpegLoaded = false;

async function loadFFmpeg() {
  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
  }
  
  if (!ffmpegLoaded) {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    
    ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg]', message);
    });
    
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    ffmpegLoaded = true;
  }
  
  return ffmpeg;
}

export async function exportVideo(
  tracks: Track[], 
  assets: Asset[], 
  duration: number,
  onProgress?: (progress: number) => void
): Promise<string> {
  
  const ff = await loadFFmpeg();
  
  // Get all clips that should be rendered
  const allClips = tracks
    .flatMap(t => t.clips.map(c => ({ ...c, trackId: t.id })))
    .filter(c => c.type === 'video' || c.type === 'image')
    .sort((a, b) => a.startTime - b.startTime);
  
  if (allClips.length === 0) {
    throw new Error('No video or image clips to export. Add some media to the timeline first.');
  }
  
  // Get unique assets used
  const usedAssetIds = new Set(allClips.map(c => c.assetId));
  const usedAssets = assets.filter(a => usedAssetIds.has(a.id));
  
  if (usedAssets.length === 0) {
    throw new Error('Could not find assets for the clips. Try re-importing your media.');
  }
  
  onProgress?.(10);
  
  // Write assets to virtual filesystem
  const assetFiles: Map<string, string> = new Map();
  
  for (const asset of usedAssets) {
    try {
      const data = await fetchFile(asset.src);
      // Use simple sequential names to avoid filesystem issues
      const ext = getExtension(asset.name, asset.type);
      const filename = `input_${asset.id.replace(/[^a-zA-Z0-9]/g, '_')}.${ext}`;
      await ff.writeFile(filename, data);
      assetFiles.set(asset.id, filename);
      console.log(`Loaded asset: ${asset.name} -> ${filename}`);
    } catch (e) {
      console.error('Failed to load asset:', asset.name, e);
      throw new Error(`Failed to load asset: ${asset.name}`);
    }
  }
  
  onProgress?.(30);
  
  // Build ffmpeg command
  // Simple approach: just take first video clip and encode it
  // Complex filter graphs often fail in wasm, so we keep it simple
  
  const firstClip = allClips[0];
  const firstAssetFile = assetFiles.get(firstClip.assetId);
  
  if (!firstAssetFile) {
    throw new Error('Asset file not found for clip');
  }
  
  // Encode with audio support
  const args = [
    '-i', firstAssetFile,
    '-t', Math.min(duration, firstClip.duration).toString(),
    '-vf', `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black`,
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '28',
    '-c:a', 'aac',        // Encode audio as AAC
    '-b:a', '128k',       // Audio bitrate
    '-ac', '2',           // Stereo audio
    '-movflags', '+faststart',
    '-y',
    'output.mp4'
  ];
  
  console.log('FFmpeg args:', args);
  onProgress?.(50);
  
  try {
    await ff.exec(args);
  } catch (execError) {
    console.error('FFmpeg exec error:', execError);
    throw new Error('Video encoding failed. Try with a different video format.');
  }
  
  onProgress?.(90);
  
  // Read output
  try {
    const data = await ff.readFile('output.mp4');
    const u8 = data as Uint8Array;
    
    // Clean up
    try {
      await ff.deleteFile('output.mp4');
      for (const filename of assetFiles.values()) {
        await ff.deleteFile(filename);
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    
    onProgress?.(100);
    
    return URL.createObjectURL(new Blob([u8.buffer as ArrayBuffer], { type: 'video/mp4' }));
  } catch (readError) {
    console.error('Failed to read output:', readError);
    throw new Error('Failed to read exported video. The encoding may have failed.');
  }
}

function getExtension(filename: string, type: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext && ['mp4', 'webm', 'mov', 'avi', 'mkv', 'png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
    return ext;
  }
  // Fallback based on type
  return type === 'image' ? 'png' : 'mp4';
}
