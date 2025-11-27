
import { UploadedAsset } from "../types";

export class AudioSystem {
  private clips: Map<string, HTMLAudioElement> = new Map();
  private unlocked: boolean = false;

  constructor() {
    this.clips = new Map();
  }

  public loadClips(assets: UploadedAsset[]) {
    // Keep existing clips if possible to avoid reloading, 
    // or just clear and reload to ensure freshness.
    // For simplicity, we reload based on ID.
    const audioAssets = assets.filter(a => a.type === 'audio');
    
    // Remove deleted clips
    const assetIds = new Set(audioAssets.map(a => a.id));
    for (const [id] of this.clips) {
        if (!assetIds.has(id)) {
            this.clips.delete(id);
        }
    }

    // Add new clips
    audioAssets.forEach(asset => {
        if (!this.clips.has(asset.id)) {
            const audio = new Audio(asset.src);
            audio.preload = 'auto';
            this.clips.set(asset.id, audio);
        }
    });
  }

  public unlock() {
    if (this.unlocked) return;
    
    // Create a short silent buffer to unlock the AudioContext/Audio subsystem on interaction
    // Note: We are using HTML5 Audio elements, but triggering a play on user interaction 
    // helps whitelist the document for autoplay.
    try {
        const silent = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");
        silent.play().then(() => {
            this.unlocked = true;
        }).catch(() => {
            // Ignore error if unlocking fails (e.g. no interaction yet)
        });
    } catch (e) {
        console.warn("Audio unlock failed", e);
    }
  }

  public play(clipId: string, volume: number = 1.0, allowOverlap: boolean = true) {
    const clip = this.clips.get(clipId);
    if (!clip) return;

    if (allowOverlap) {
        // Clone the node to allow multiple instances of the same sound
        const clone = clip.cloneNode() as HTMLAudioElement;
        clone.volume = Math.max(0, Math.min(1, volume));
        clone.play().catch(e => console.warn("Failed to play audio", e));
    } else {
        clip.currentTime = 0;
        clip.volume = Math.max(0, Math.min(1, volume));
        clip.play().catch(e => console.warn("Failed to play audio", e));
    }
  }
}

export const audioSystem = new AudioSystem();
