export class BgmSystem {
  private currentAudio: HTMLAudioElement | null = null;
  private currentSrc: string | null = null;
  private unlocked: boolean = false;
  
  unlock() {
    if (this.unlocked) return;
    try {
        const silent = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");
        silent.play().then(() => {
            this.unlocked = true;
        }).catch(() => {});
    } catch (e) { }
  }

  play(src: string, volume: number = 0.5, fadeDuration: number = 1.0) {
    if (this.currentSrc === src) {
        if (this.currentAudio) {
             // Smooth volume change if already playing
             this.fadeVolume(this.currentAudio, volume, 0.5);
        }
        return;
    }

    // Fade out old
    if (this.currentAudio) {
       this.fadeOutAndStop(this.currentAudio, fadeDuration);
    }

    if (!src) {
        this.currentSrc = null;
        this.currentAudio = null;
        return;
    }

    // Start new
    this.currentSrc = src;
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = 0; // Start silent for fade-in
    
    const playPromise = audio.play();
    if (playPromise !== undefined) {
        playPromise.then(() => {
            this.currentAudio = audio;
            this.fadeIn(audio, volume, fadeDuration);
        }).catch(e => {
            console.warn("BGM Play failed (check user interaction)", e);
        });
    }
  }

  stop(fadeDuration: number = 1.0) {
      if (this.currentAudio) {
          this.fadeOutAndStop(this.currentAudio, fadeDuration);
          this.currentAudio = null;
          this.currentSrc = null;
      }
  }

  private fadeVolume(audio: HTMLAudioElement, targetVol: number, duration: number) {
      const startVol = audio.volume;
      const startTime = performance.now();
      
      const fade = () => {
          const elapsed = (performance.now() - startTime) / 1000;
          const t = Math.min(1, elapsed / duration);
          // Lerp
          audio.volume = startVol + (targetVol - startVol) * t;
          
          if (t < 1) requestAnimationFrame(fade);
      };
      requestAnimationFrame(fade);
  }

  private fadeOutAndStop(audio: HTMLAudioElement, duration: number) {
      const startVol = audio.volume;
      const startTime = performance.now();
      
      const fade = () => {
          const elapsed = (performance.now() - startTime) / 1000;
          const t = Math.min(1, elapsed / duration);
          audio.volume = Math.max(0, startVol * (1 - t));
          
          if (t < 1) {
              requestAnimationFrame(fade);
          } else {
              audio.pause();
              audio.currentTime = 0;
          }
      };
      requestAnimationFrame(fade);
  }

  private fadeIn(audio: HTMLAudioElement, targetVol: number, duration: number) {
      const startTime = performance.now();
      
      const fade = () => {
          // If this audio is no longer the current one (switched during fade), stop fading it?
          // Actually, fadeIn is only called on the new current audio.
          if (audio.paused) return; // Safety check

          const elapsed = (performance.now() - startTime) / 1000;
          const t = Math.min(1, elapsed / duration);
          audio.volume = targetVol * t;
          
          if (t < 1) {
              requestAnimationFrame(fade);
          }
      };
      requestAnimationFrame(fade);
  }
}

export const bgmSystem = new BgmSystem();