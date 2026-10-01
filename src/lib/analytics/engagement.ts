// Engaged-time accounting (docs/07): a second counts only while the tab is visible and
// the reader was active (scroll, key, pointer, touch) in the last 15 seconds. Pure logic,
// driven by the tracker with real timestamps and unit-tested with fake ones.

export const ACTIVE_WINDOW_MS = 15_000;
export const MAX_ENGAGED_SECONDS = 1800;

export class EngagementClock {
  private lastActivity: number;
  private lastTick: number;
  private visible: boolean;
  private engagedMs = 0;
  private maxScroll = 0;

  constructor(now: number, visible = true) {
    this.lastActivity = now;
    this.lastTick = now;
    this.visible = visible;
  }

  /** Accrue time since the previous tick (only the part inside the active window). */
  tick(now: number): void {
    if (this.visible) {
      const activeUntil = this.lastActivity + ACTIVE_WINDOW_MS;
      const end = Math.min(now, activeUntil);
      if (end > this.lastTick) this.engagedMs += end - this.lastTick;
    }
    this.lastTick = now;
  }

  activity(now: number): void {
    this.tick(now);
    this.lastActivity = now;
  }

  setVisible(now: number, visible: boolean): void {
    this.tick(now);
    this.visible = visible;
    if (visible) this.lastActivity = now;
  }

  scroll(pct: number): void {
    if (Number.isFinite(pct)) this.maxScroll = Math.max(this.maxScroll, Math.min(100, Math.max(0, Math.round(pct))));
  }

  get seconds(): number {
    return Math.min(MAX_ENGAGED_SECONDS, Math.floor(this.engagedMs / 1000));
  }

  get scrollPct(): number {
    return this.maxScroll;
  }
}

/** % of an element scrolled past the bottom of the viewport (0–100). */
export function scrollPercent(elTop: number, elHeight: number, viewportBottom: number): number {
  if (elHeight <= 0) return 0;
  return Math.max(0, Math.min(100, ((viewportBottom - elTop) / elHeight) * 100));
}
