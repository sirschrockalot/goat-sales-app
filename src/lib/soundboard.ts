/**
 * Soundboard Utility
 * Manages audio feedback for gamification
 */

// Logger - conditional to avoid winston in client bundles
const logger = typeof window === 'undefined' 
  ? require('./logger').default 
  : {
      error: (msg: string, meta?: any) => console.error(`[ERROR] ${msg}`, meta),
      info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta),
      warn: (msg: string, meta?: any) => console.warn(`[WARN] ${msg}`, meta),
    };

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
        logger.error('Error playing chime', { error });
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
        logger.error('Error playing horn', { error });
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
        logger.error('Error playing bleat', { error });
      }
    }
  }

  /**
   * Play mechanical click sound for script visibility toggle
   */
  playMechanicalClick() {
    if (typeof window === 'undefined' || !this.audioContext) return;
    
    try {
      // Create a sharp mechanical click sound
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      const filter = this.audioContext.createBiquadFilter();

      oscillator.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Sharp click: high frequency, quick attack/decay
      oscillator.frequency.value = 2000;
      oscillator.type = 'square';

      // Filter for mechanical sound
      filter.type = 'highpass';
      filter.frequency.value = 1000;

      // Quick attack and decay
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.4, this.audioContext.currentTime + 0.001);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.05);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        logger.error('Error playing mechanical click', { error });
      }
    }
  }

  /**
   * Play a sound by name
   */
  play(soundName: string) {
    switch (soundName) {
      case 'chime':
        this.playChime();
        break;
      case 'horn':
        this.playHorn();
        break;
      case 'bleat':
        this.playBleat();
        break;
      case 'mechanicalClick':
        this.playMechanicalClick();
        break;
      default:
        logger.warn('Unknown sound requested', { soundName });
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
