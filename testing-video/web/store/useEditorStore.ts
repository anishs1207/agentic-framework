import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type AssetType = 'video' | 'image' | 'audio' | 'text';

export interface Asset {
  id: string;
  type: AssetType;
  src: string;
  name: string;
}

export interface Clip {
  id: string;
  assetId: string;
  startOffset: number;
  startTime: number;
  duration: number;
  type: AssetType;
  name: string;
  layer: number;
  properties: {
    x: number;
    y: number;
    scale: number;
    opacity: number;
    volume?: number; 
  };
}

export interface Track {
  id: string;
  type: 'video' | 'audio' | 'text' | 'overlay' | 'image';
  clips: Clip[];
}

interface EditorState {
  assets: Asset[];
  tracks: Track[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  selectedClipId: string | null;
  timelineZoom: number; // pixels per second
  aspectRatio: '9:16' | '16:9' | '1:1';
  
  // Actions
  addAsset: (asset: Omit<Asset, 'id'>) => void;
  addTrack: (type: Track['type']) => void;
  addClip: (trackId: string, asset: Asset, time: number) => void;
  updateClip: (trackId: string, clipId: string, updates: Partial<Clip>) => void;
  moveClip: (fromTrackId: string, toTrackId: string, clipId: string, newStartTime: number) => void;
  splitClip: (trackId: string, clipId: string, splitTime: number) => void;
  removeClip: (trackId: string, clipId: string) => void;
  setSelectedClip: (id: string | null) => void;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setTimelineZoom: (zoom: number) => void;
  setAspectRatio: (ratio: '9:16' | '16:9' | '1:1') => void;
  setDuration: (dur: number) => void;
  
  // Helpers
  applyBrainrotLayout: () => void;
  getSelectedClip: () => { clip: Clip; trackId: string } | null;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  assets: [],
  tracks: [
    { id: 'track-1', type: 'video', clips: [] },
    { id: 'track-2', type: 'video', clips: [] },
    { id: 'track-image', type: 'image', clips: [] },
    { id: 'track-3', type: 'audio', clips: [] },
    { id: 'track-4', type: 'text', clips: [] },
  ],
  currentTime: 0,
  duration: 30,
  isPlaying: false,
  selectedClipId: null,
  timelineZoom: 40,
  aspectRatio: '9:16',

  addAsset: (asset) => set((state) => ({ 
    assets: [...state.assets, { ...asset, id: uuidv4() }] 
  })),

  addTrack: (type) => set((state) => ({
    tracks: [...state.tracks, { id: uuidv4(), type, clips: [] }]
  })),

  addClip: (trackId, asset, time) => set((state) => {
    const newClip: Clip = {
      id: uuidv4(),
      assetId: asset.id,
      startOffset: 0,
      startTime: time,
      duration: 5,
      type: asset.type,
      name: asset.name,
      layer: state.tracks.findIndex(t => t.id === trackId) + 1,
      properties: { x: 0.5, y: 0.5, scale: 1, opacity: 1, volume: 1 },
    };

    return {
      tracks: state.tracks.map(t => 
        t.id === trackId 
          ? { ...t, clips: [...t.clips, newClip] }
          : t
      )
    };
  }),

  updateClip: (trackId, clipId, updates) => set((state) => ({
    tracks: state.tracks.map(t => 
      t.id === trackId
        ? {
            ...t,
            clips: t.clips.map(c => c.id === clipId ? { ...c, ...updates } : c)
          }
        : t
    )
  })),

  moveClip: (fromTrackId, toTrackId, clipId, newStartTime) => set((state) => {
    const fromTrack = state.tracks.find(t => t.id === fromTrackId);
    if (!fromTrack) return state;
    
    const clip = fromTrack.clips.find(c => c.id === clipId);
    if (!clip) return state;

    const movedClip = { ...clip, startTime: Math.max(0, newStartTime) };

    if (fromTrackId === toTrackId) {
      // Just update position
      return {
        tracks: state.tracks.map(t => 
          t.id === fromTrackId
            ? { ...t, clips: t.clips.map(c => c.id === clipId ? movedClip : c) }
            : t
        )
      };
    } else {
      // Move between tracks
      return {
        tracks: state.tracks.map(t => {
          if (t.id === fromTrackId) {
            return { ...t, clips: t.clips.filter(c => c.id !== clipId) };
          }
          if (t.id === toTrackId) {
            return { ...t, clips: [...t.clips, movedClip] };
          }
          return t;
        })
      };
    }
  }),

  removeClip: (trackId, clipId) => set((state) => ({
    tracks: state.tracks.map(t => 
      t.id === trackId
        ? { ...t, clips: t.clips.filter(c => c.id !== clipId) }
        : t
    ),
    selectedClipId: state.selectedClipId === clipId ? null : state.selectedClipId
  })),

  splitClip: (trackId, clipId, splitTime) => set((state) => {
    const track = state.tracks.find(t => t.id === trackId);
    if (!track) return state;

    const clip = track.clips.find(c => c.id === clipId);
    if (!clip) return state;

    if (splitTime <= clip.startTime || splitTime >= clip.startTime + clip.duration) {
        return state;
    }

    const firstDuration = splitTime - clip.startTime;
    const secondDuration = clip.duration - firstDuration;

    const firstClip: Clip = { ...clip, duration: firstDuration };
    const secondClip: Clip = {
        ...clip,
        id: uuidv4(),
        startTime: splitTime,
        startOffset: clip.startOffset + firstDuration,
        duration: secondDuration
    };

    return {
        tracks: state.tracks.map(t => 
            t.id === trackId
            ? { ...t, clips: [...t.clips.filter(c => c.id !== clipId), firstClip, secondClip] }
            : t
        )
    };
  }),

  setSelectedClip: (id) => set({ selectedClipId: id }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setTimelineZoom: (zoom) => set({ timelineZoom: Math.max(10, Math.min(200, zoom)) }),
  setAspectRatio: (ratio) => set({ aspectRatio: ratio }),
  setDuration: (dur) => set({ duration: dur }),

  getSelectedClip: () => {
    const state = get();
    for (const track of state.tracks) {
      const clip = track.clips.find(c => c.id === state.selectedClipId);
      if (clip) return { clip, trackId: track.id };
    }
    return null;
  },

  applyBrainrotLayout: () => set((state) => {
    const activeClips = state.tracks
        .filter(t => t.type === 'video')
        .flatMap(t => t.clips)
        .filter(c => c.startTime <= state.currentTime && c.startTime + c.duration >= state.currentTime)
        .sort((a, b) => a.layer - b.layer);

    if (activeClips.length < 2) {
        console.warn("Need at least 2 active video clips to apply split screen.");
        return state;
    }

    const [topClip, bottomClip] = activeClips;

    const newTracks = state.tracks.map(t => ({
        ...t,
        clips: t.clips.map(c => {
            if (c.id === topClip.id) {
                return { ...c, properties: { ...c.properties, x: 0.5, y: 0.25, scale: 0.5 } };
            }
            if (c.id === bottomClip.id) {
                return { ...c, properties: { ...c.properties, x: 0.5, y: 0.75, scale: 0.5 } };
            }
            return c;
        })
    }));

    return { tracks: newTracks };
  })
}));
