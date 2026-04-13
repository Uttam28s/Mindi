/**
 * CrazyGames SDK v3 — Mindi Integration Wrapper
 *
 * Wraps the global window.CrazyGames.SDK so the rest of the app
 * can import typed helpers instead of touching window globals.
 *
 * Safe to call on any domain: when the SDK is not loaded (localhost
 * without ?useLocalSdk=true, Vercel, etc.) all methods are no-ops.
 *
 * Usage:
 *   import { CG } from './utils/crazygames';
 *   await CG.init();
 *   CG.gameplayStart();
 */

/* ── Type definitions for the CrazyGames SDK global ──────────────── */

interface CGUser {
  username: string;
  profilePictureUrl: string;
}

interface CGSystemInfo {
  device: 'desktop' | 'tablet' | 'mobile';
  countryCode: string;
  browser: string;
  os: string;
}

interface CGAdCallbacks {
  adStarted?: () => void;
  adFinished?: () => void;
  adError?: (error: { code: string; message?: string }) => void;
}

interface CGBannerOptions {
  id: string;
  width: number;
  height: number;
}

declare global {
  interface Window {
    CrazyGames?: {
      SDK: {
        init(): Promise<void>;
        game: {
          gameplayStart(): void;
          gameplayStop(): void;
          loadingStart(): void;
          loadingStop(): void;
          happytime(): void;
          sdkGameLoadingStart(): void;
          sdkGameLoadingStop(): void;
        };
        ad: {
          requestAd(type: 'midgame' | 'rewarded', callbacks: CGAdCallbacks): void;
        };
        banner: {
          requestBanner(options: CGBannerOptions): Promise<void>;
          requestResponsiveBanner(containerId: string): Promise<void>;
          clearBanner(containerId: string): void;
          clearAllBanners(): void;
        };
        user: {
          isUserAccountAvailable(): boolean;
          getUser(): Promise<CGUser | null>;
          showAuthPrompt(): void;
          getUserToken(): Promise<string | null>;
          addAuthListener(cb: (user: CGUser | null) => void): void;
          removeAuthListener(cb: (user: CGUser | null) => void): void;
          getSystemInfo(): Promise<CGSystemInfo>;
        };
        data: {
          setItem(key: string, value: string): void;
          getItem(key: string): string | null;
          removeItem(key: string): void;
          clear(): void;
        };
      };
    };
  }
}

/* ── Detect whether the SDK is available ─────────────────────────── */

function sdk() {
  return window.CrazyGames?.SDK ?? null;
}

let _initialized = false;

/* ── Public CG helper ─────────────────────────────────────────────── */

export const CG = {
  /**
   * Initialize the SDK. Must be awaited before calling any other method.
   * Call this once in main.tsx / App.tsx before rendering.
   */
  async init(): Promise<void> {
    if (_initialized) return;
    const s = sdk();
    if (!s) return; // Not on CrazyGames — silent no-op
    try {
      await s.init();
      _initialized = true;
    } catch {
      // SDK throws when not on an allowed domain — ignore
    }
  },

  /** Check if we are actually running inside the CrazyGames platform */
  isActive(): boolean {
    return _initialized && sdk() !== null;
  },

  // ── Game lifecycle ─────────────────────────────────────────────

  /**
   * Call when the player starts or resumes actual gameplay
   * (after loading screens, menus, pauses, death screens, etc.)
   */
  gameplayStart(): void {
    sdk()?.game.gameplayStart();
  },

  /**
   * Call on every break from gameplay:
   * menus, loading, pauses, round results, game over screens, trick pauses.
   */
  gameplayStop(): void {
    sdk()?.game.gameplayStop();
  },

  /** Mark start of asset loading (optional but recommended) */
  loadingStart(): void {
    sdk()?.game.loadingStart();
  },

  /** Mark end of asset loading (optional but recommended) */
  loadingStop(): void {
    sdk()?.game.loadingStop();
  },

  /**
   * Triggers platform-wide celebrations (confetti) for major achievements.
   * Use ONLY for Mindi wins (scoring all 4 tens in a round).
   */
  happytime(): void {
    sdk()?.game.happytime();
  },

  // ── Video Ads ─────────────────────────────────────────────────

  /**
   * Request a mid-game ad. Call at natural breaks (between rounds, on menu open).
   * The game is automatically paused/muted on adStarted and resumed on finish/error.
   *
   * @param onPause  callback to pause game + mute audio before ad
   * @param onResume callback to resume game + unmute audio after ad
   */
  requestMidgameAd(onPause: () => void, onResume: () => void): void {
    sdk()?.ad.requestAd('midgame', {
      adStarted: onPause,
      adFinished: onResume,
      adError: () => onResume(), // Always resume, even on error / adblock
    });
  },

  /**
   * Request a rewarded ad (player-initiated for in-game benefit).
   * Returns true if the ad completed successfully, false otherwise.
   */
  requestRewardedAd(onPause: () => void, onResume: () => void): Promise<boolean> {
    return new Promise((resolve) => {
      const s = sdk();
      if (!s) { resolve(false); return; }
      s.ad.requestAd('rewarded', {
        adStarted: onPause,
        adFinished: () => { onResume(); resolve(true); },
        adError: () => { onResume(); resolve(false); },
      });
    });
  },

  // ── User ──────────────────────────────────────────────────────

  /** Returns the logged-in user or null for guests */
  async getUser(): Promise<CGUser | null> {
    const s = sdk();
    if (!s || !s.user.isUserAccountAvailable()) return null;
    try {
      return await s.user.getUser();
    } catch {
      return null;
    }
  },

  /** Show the CrazyGames login / register popup */
  showAuthPrompt(): void {
    sdk()?.user.showAuthPrompt();
  },

  /** Listen for mid-session login / logout events */
  addAuthListener(cb: (user: CGUser | null) => void): void {
    sdk()?.user.addAuthListener(cb);
  },

  removeAuthListener(cb: (user: CGUser | null) => void): void {
    sdk()?.user.removeAuthListener(cb);
  },

  /** Device / locale info */
  async getSystemInfo(): Promise<CGSystemInfo | null> {
    try {
      return (await sdk()?.user.getSystemInfo()) ?? null;
    } catch {
      return null;
    }
  },

  // ── Cloud Save (Data module) ───────────────────────────────────

  /**
   * Save a value to CrazyGames cloud storage (falls back to localStorage
   * automatically for guests). Use instead of raw localStorage.
   */
  saveData(key: string, value: string): void {
    const d = sdk()?.data;
    if (d) {
      d.setItem(key, value);
    } else {
      localStorage.setItem(key, value);
    }
  },

  loadData(key: string): string | null {
    const d = sdk()?.data;
    return d ? d.getItem(key) : localStorage.getItem(key);
  },

  removeData(key: string): void {
    const d = sdk()?.data;
    if (d) d.removeItem(key);
    else localStorage.removeItem(key);
  },
};
