/**
 * Kill Switch Utilities
 * Shared state for kill-switch functionality
 * Used by both API routes and autonomous battle scripts
 */

// In-memory flag to track kill-switch state
// In production, you might want to use Redis or a database
let killSwitchActive = false;
let killSwitchActivatedAt: Date | null = null;

export function isKillSwitchActive(): boolean {
  return killSwitchActive;
}

export function getKillSwitchStatus(): { active: boolean; activatedAt: Date | null } {
  return {
    active: killSwitchActive,
    activatedAt: killSwitchActivatedAt,
  };
}

export function setKillSwitchActive(active: boolean): void {
  killSwitchActive = active;
  if (active) {
    killSwitchActivatedAt = new Date();
  } else {
    killSwitchActivatedAt = null;
  }
}
