/**
 * Soundboard Utility
 * Manages audio feedback for gamification
 */

class Soundboard {
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, HTMLAudioElement> = new Map();

  constructor() {
    // Initialize audio context (only in browser)
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.preloadSounds();
    }
  }

  private preloadSounds() {
    // Create audio elements for each sound
    // Note: In production, these would be actual audio files
    // For now, we'll use Web Audio API to generate tones
    
    // Chime sound (gate passed)
    this.createChimeSound();
    
    // Epic horn (95+ score)
    this.createHornSound();
    
    // Goat bleat (perfect execution)
    this.createBleatSound();
  }

  private createChimeSound() {
    // Generate a pleasant chime using Web Audio API
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.5);
  }

  private createHornSound() {
    // Generate an epic horn sound
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.3);
    oscillator.type = 'sawtooth';

    gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.8);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.8);
  }

  private createBleatSound() {
    // Generate a goat bleat sound (fun!)
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Goat bleat: quick frequency modulation
    oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(250, this.audioContext.currentTime + 0.1);
    oscillator.frequency.exponentialRampToValueAtTime(350, this.audioContext.currentTime + 0.2);
    oscillator.type = 'square';

    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.3);
  }

  /**
   * Play chime sound when a logic gate is passed
   */
  playChime() {
    if (typeof window === 'undefined' || !this.audioContext) return;
    
    try {
      this.createChimeSound();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error playing chime:', error);
      }
    }
  }

  /**
   * Play epic horn for 95+ score
   */
  playHorn() {
    if (typeof window === 'undefined' || !this.audioContext) return;
    
    try {
      this.createHornSound();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error playing horn:', error);
      }
    }
  }

  /**
   * Play goat bleat for perfect execution
   */
  playBleat() {
    if (typeof window === 'undefined' || !this.audioContext) return;
    
    try {
      this.createBleatSound();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error playing bleat:', error);
      }
    }
  }
}

// Singleton instance
let soundboardInstance: Soundboard | null = null;

export function getSoundboard(): Soundboard {
  if (!soundboardInstance) {
    soundboardInstance = new Soundboard();
  }
  return soundboardInstance;
}
