/**
 * CrazyGames SDK v3 — Mindi Integration Wrapper
 *
 * Wraps the global window.CrazyGames.SDK so the rest of the app
 * can import typed helpers instead of touching window globals.
 *
 * Safe to call on any domain: when the SDK is not loaded (localhost
 * without ?useLocalSdk=true, Vercel, etc.) all methods are no-ops.
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
          /** Returns a shareable invite URL with the given params */
          inviteLink(params: Record<string, string>): string;
          /** Shows CrazyGames' built-in invite button overlay */
          showInviteButton(params: Record<string, string>): void;
          /** Hides CrazyGames' invite button overlay */
          hideInviteButton(): void;
          /** Reads an invite parameter from the URL (e.g. roomName) */
          getInviteParam(key: string): string | null;
          /**
           * True when the SDK has placed the user into a multiplayer session
           * as the party leader. Game must skip setup and auto-create a room.
           */
          isInstantMultiplayer: boolean;
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
        analytics: {
          /** Track a completed Xsolla purchase order. Only call after a real payment. */
          trackOrder(orderId: string, amount: number, currency: string): void;
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
  /** Initialize the SDK. Must be awaited before calling any other method. */
  async init(): Promise<void> {
    if (_initialized) return;
    const s = sdk();
    if (!s) return;
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

  gameplayStart(): void { sdk()?.game.gameplayStart(); },
  gameplayStop(): void  { sdk()?.game.gameplayStop(); },
  loadingStart(): void  { sdk()?.game.loadingStart(); },
  loadingStop(): void   { sdk()?.game.loadingStop(); },

  /**
   * Triggers platform-wide celebrations (confetti).
   * Call ONLY on Mindi wins (whitewash or mendikot).
   */
  happytime(): void { sdk()?.game.happytime(); },

  // ── Invite Link / Button ──────────────────────────────────────

  /**
   * Show CrazyGames' built-in invite button with the current room code.
   * Call when the lobby is open and waiting for players.
   */
  showInviteButton(roomCode: string): void {
    sdk()?.game.showInviteButton({ roomName: roomCode });
  },

  /** Hide the invite button (call when leaving lobby or game starts). */
  hideInviteButton(): void {
    sdk()?.game.hideInviteButton();
  },

  /**
   * Generate a shareable invite URL for the room.
   * Returns empty string if not on CrazyGames.
   */
  getInviteLink(roomCode: string): string {
    return sdk()?.game.inviteLink({ roomName: roomCode }) ?? '';
  },

  /**
   * Read an invite parameter from the launch URL.
   * Returns null if the param is missing or SDK is inactive.
   * Use on startup to detect if the player followed an invite link.
   */
  getInviteParam(key: string): string | null {
    return sdk()?.game.getInviteParam(key) ?? null;
  },

  /**
   * True when the CrazyGames platform has placed the user into a
   * multiplayer session as the party leader. When true, skip the setup
   * screen and auto-create a room with default settings immediately.
   */
  isInstantMultiplayer(): boolean {
    return sdk()?.game.isInstantMultiplayer ?? false;
  },

  // ── Video Ads ─────────────────────────────────────────────────

  /**
   * Request a mid-game ad. Call at natural breaks (between rounds).
   * @param onPause  pause game + mute audio before ad
   * @param onResume resume game + unmute audio after ad
   */
  requestMidgameAd(onPause: () => void, onResume: () => void): void {
    sdk()?.ad.requestAd('midgame', {
      adStarted: onPause,
      adFinished: onResume,
      adError: () => onResume(),
    });
  },

  /**
   * Request a rewarded ad (player-initiated).
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

  // ── Banners ───────────────────────────────────────────────────

  /**
   * Request a responsive banner in a container element.
   * The container div must already exist in the DOM with the given ID.
   */
  async requestResponsiveBanner(containerId: string): Promise<void> {
    try { await sdk()?.banner.requestResponsiveBanner(containerId); } catch { /* ignore */ }
  },

  /**
   * Request a fixed-size banner in a container element.
   * Standard CrazyGames sizes: 970×250, 728×90, 300×250.
   */
  async requestBanner(id: string, width: number, height: number): Promise<void> {
    try { await sdk()?.banner.requestBanner({ id, width, height }); } catch { /* ignore */ }
  },

  clearBanner(containerId: string): void {
    sdk()?.banner.clearBanner(containerId);
  },

  clearAllBanners(): void {
    sdk()?.banner.clearAllBanners();
  },

  // ── User ──────────────────────────────────────────────────────

  async getUser(): Promise<CGUser | null> {
    const s = sdk();
    if (!s) return null;
    // isUserAccountAvailable was removed in SDK v3.8 — guard defensively
    if (typeof s.user.isUserAccountAvailable === 'function' && !s.user.isUserAccountAvailable()) return null;
    try { return await s.user.getUser(); } catch { return null; }
  },

  showAuthPrompt(): void { sdk()?.user.showAuthPrompt(); },

  addAuthListener(cb: (user: CGUser | null) => void): void {
    sdk()?.user.addAuthListener(cb);
  },

  removeAuthListener(cb: (user: CGUser | null) => void): void {
    sdk()?.user.removeAuthListener(cb);
  },

  async getSystemInfo(): Promise<CGSystemInfo | null> {
    try { return (await sdk()?.user.getSystemInfo()) ?? null; } catch { return null; }
  },

  // ── Cloud Save (Data module) ───────────────────────────────────

  /**
   * Save a value. Uses CrazyGames cloud storage when available,
   * falls back to localStorage for guests / non-CG environments.
   * Also migrates existing localStorage values into CG storage on first use.
   */
  saveData(key: string, value: string): void {
    const d = sdk()?.data;
    if (d) {
      d.setItem(key, value);
    } else {
      localStorage.setItem(key, value);
    }
    // Always keep localStorage in sync so other tools can read it
    localStorage.setItem(key, value);
  },

  loadData(key: string): string | null {
    const d = sdk()?.data;
    if (d) {
      const cgVal = d.getItem(key);
      if (cgVal !== null) return cgVal;
      // Migrate from localStorage on first load with CG active
      const localVal = localStorage.getItem(key);
      if (localVal !== null) { d.setItem(key, localVal); }
      return localVal;
    }
    return localStorage.getItem(key);
  },

  removeData(key: string): void {
    const d = sdk()?.data;
    if (d) d.removeItem(key);
    localStorage.removeItem(key);
  },

  // ── Analytics ─────────────────────────────────────────────────

  /**
   * Track a completed Xsolla purchase order.
   * Only relevant if Xsolla in-app purchases are enabled (Full Launch).
   * Do NOT call this for free games.
   */
  trackOrder(orderId: string, amount: number, currency: string): void {
    sdk()?.analytics?.trackOrder(orderId, amount, currency);
  },
};
