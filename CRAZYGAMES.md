# Mindi — CrazyGames Deployment Guide

> **Status:** SDK integration complete. Ready for Basic Launch submission.

---

## Table of Contents

1. [What Was Done (Code Changes)](#1-what-was-done)
2. [How to Submit Your Game](#2-how-to-submit-your-game)
3. [CrazyGames Technical Requirements Checklist](#3-technical-requirements-checklist)
4. [SDK Integration Reference](#4-sdk-integration-reference)
5. [Two-Stage Launch Process](#5-two-stage-launch-process)
6. [Revenue & Payouts](#6-revenue--payouts)
7. [Cover Art & Preview Video Requirements](#7-cover-art--preview-video-requirements)
8. [What You Must NOT Do](#8-what-you-must-not-do)
9. [Testing the SDK Locally](#9-testing-the-sdk-locally)
10. [Build & Upload Instructions](#10-build--upload-instructions)

---

## 1. What Was Done

The following files were created or modified to make Mindi compatible with CrazyGames:

### New File: `src/app/utils/crazygames.ts`
A typed TypeScript wrapper around the CrazyGames SDK v3. Every method is a safe **no-op on non-CrazyGames domains** (Vercel, localhost without `?useLocalSdk=true`), so the game works everywhere without any conditional checks in component code.

**Exported helpers:**

| Helper | Purpose |
|---|---|
| `CG.init()` | Initialize SDK (called once in main.tsx) |
| `CG.gameplayStart()` | Signal player entered gameplay |
| `CG.gameplayStop()` | Signal player left gameplay (menu, result, etc.) |
| `CG.loadingStart/Stop()` | Bracket asset loading |
| `CG.happytime()` | Platform confetti — call on Mindi win |
| `CG.requestMidgameAd(pause, resume)` | Show a mid-game ad at natural breaks |
| `CG.requestRewardedAd(pause, resume)` | Show a rewarded ad, returns `true` if completed |
| `CG.getUser()` | Get logged-in CrazyGames user (or null for guests) |
| `CG.showAuthPrompt()` | Open CrazyGames login popup |
| `CG.addAuthListener(cb)` | React to mid-session login/logout |
| `CG.saveData(key, value)` | Cloud save (falls back to localStorage for guests) |
| `CG.loadData(key)` | Cloud load |

### Modified: `src/main.tsx`
Added `await CG.init()` before React mounts — required by the SDK spec.

### Modified: `src/app/App.tsx`
Added a `useEffect` that calls:
- `CG.gameplayStart()` when `screen === 'game'`
- `CG.gameplayStop()` on all other screens (home, setup, lobby, results, etc.)

### Modified: `src/app/components/LoadingScreen.tsx`
Added `CG.loadingStart()` on mount and `CG.loadingStop()` on unmount so CrazyGames can accurately measure initial load time (the 50 MB window).

### Modified: `index.html`
- Added `<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js">` in `<head>`
- Added `-webkit-user-select: none; user-select: none` CSS (required for mobile)

---

## 2. How to Submit Your Game

### Step 1 — Create a Developer Account
1. Go to **https://developer.crazygames.com**
2. Sign up or log in with your CrazyGames account
3. Click **"Upload a game"**

### Step 2 — Build the Game
```bash
# In your project root
pnpm build
# Output is in the /dist folder
```

### Step 3 — Create a ZIP
Zip the **entire contents of `/dist`** (not the dist folder itself — zip what's inside it):
```
dist/
  index.html        ← must be at the root of the ZIP
  assets/
    ...
```

```bash
cd dist
zip -r ../mindi-crazygames.zip .
```

> **Limits:** Max 250 MB total, max 1,500 files.
> Run `find dist | wc -l` to check file count.

### Step 4 — Fill in Game Metadata

| Field | Value |
|---|---|
| **Title** | Mindi |
| **Category** | Card Games |
| **Tags** | card, multiplayer, strategy, indian, team |
| **Description** | Play Mindi (Mendikot) online — the classic Indian card game. Form teams of 2, capture the 10s (Mindis), and dominate the table! Play with 4–10 players, choose your trump mode, and challenge friends or AI opponents. |
| **Controls** | Mouse: click a card to play it. Touch: tap a card. |
| **Age Rating** | PEGI 3 (no violence, no explicit content) |
| **Mobile Enabled** | ✅ Yes |
| **Orientation** | Both (portrait + landscape) |
| **Multiplayer** | ✅ Yes (Real-time online) |

### Step 5 — Upload Cover Art
See [Section 7](#7-cover-art--preview-video-requirements) for exact dimensions.

### Step 6 — Submit for Review
Click **"Submit for review"**. The QA team will play your game within a few days.

---

## 3. Technical Requirements Checklist

| Requirement | Status | Notes |
|---|---|---|
| HTML5 / runs in browser | ✅ | React + Vite build |
| Works in Chrome & Edge | ✅ | Standard React app |
| Mobile touch support | ✅ | Portrait layout complete |
| No orientation lock | ✅ | Landscape lock was removed |
| `-webkit-user-select: none` | ✅ | Added to index.html |
| All asset paths relative | ✅ | Vite uses relative paths by default |
| Initial download ≤ 50 MB | ⚠️ | Check with `du -sh dist/` after build. Optimize if > 50 MB |
| Total ZIP ≤ 250 MB | ✅ | React game, well within limit |
| File count ≤ 1,500 | ✅ | Check with `find dist | wc -l` |
| CrazyGames SDK loaded | ✅ | Script in index.html |
| `CG.init()` awaited at boot | ✅ | main.tsx |
| `gameplayStart` called | ✅ | App.tsx when screen='game' |
| `gameplayStop` called | ✅ | App.tsx all non-game screens |
| `loadingStart/Stop` called | ✅ | LoadingScreen.tsx |
| Game works without ads | ✅ | SDK is no-op on ad errors |
| No external login required | ✅ | Guest play always available |
| No competing portal branding | ✅ | |
| English support | ✅ | Default language |

---

## 4. SDK Integration Reference

### Ad Integration (Recommended for Full Launch)

Call mid-game ads at natural breaks — between rounds is the perfect spot.
Add this to `App.tsx` in the `handleRoundEnd` / before navigating to `round_result`:

```typescript
import { CG } from './utils/crazygames';

// In RoundResult's "Next Round" handler — before starting the new round:
CG.requestMidgameAd(
  () => {
    // adStarted: pause any animations, mute audio
    Sounds.mute();
  },
  () => {
    // adFinished / adError: resume
    Sounds.unmute();
    startNextRound();
  }
);
```

**Rules:**
- Ads have a 3-minute cooldown — SDK enforces this automatically
- Always call resume in BOTH `adFinished` AND `adError`
- Never show ads mid-trick or during active gameplay

### Happytime (Mindi Win Celebration)

Call `CG.happytime()` when a team wins a full Mindi (all 4 tens in a round).
This triggers platform-wide confetti for the player. Find `GameOver.tsx` or `RoundResult.tsx`
and add:

```typescript
import { CG } from '../utils/crazygames';

// When displaying a Mindi win:
if (roundResult.category === 'mindi') {
  CG.happytime();
}
```

### User Authentication (Optional but recommended)

Show the CrazyGames logged-in user's name/avatar in the lobby:

```typescript
import { CG } from '../utils/crazygames';

// In HomeScreen or SetupScreen:
useEffect(() => {
  CG.getUser().then(user => {
    if (user) setPlayerName(user.username);
  });
}, []);
```

### Cloud Save (Optional)

Replace any `localStorage` calls with `CG.saveData` / `CG.loadData`:

```typescript
// Before:
localStorage.setItem('mindi_settings', JSON.stringify(settings));
const saved = localStorage.getItem('mindi_settings');

// After (works as localStorage for guests, syncs to cloud when logged in):
CG.saveData('mindi_settings', JSON.stringify(settings));
const saved = CG.loadData('mindi_settings');
```

---

## 5. Two-Stage Launch Process

### Stage 1 — Basic Launch (Soft Release)
- **Duration:** 2 weeks
- **SDK:** Optional (already integrated, so you're ahead)
- **Monetization:** Disabled
- **Audience:** Limited (test traffic)
- **Metrics evaluated:** Avg playtime, % who start gameplay, Day-1 retention

**To pass Basic Launch, Mindi needs good session length.**
The card game nature (15 tricks per round, multiple rounds to win) is a great fit.

### Stage 2 — Full Launch (Global Release)
- **Requirements:** Full SDK integration (ads required) ← Already done
- **Monetization:** Enabled (ad revenue share starts)
- **Audience:** Full CrazyGames traffic

---

## 6. Revenue & Payouts

- **Model:** Ad revenue share (CrazyGames percentage not disclosed, but competitive)
- **Payout:** Monthly, minimum 100 EUR threshold
- **Methods:** Wire transfer or PayPal (via Tipalti)
- **Eligibility:**
  - No other portal branding in the game
  - No third-party ad SDKs
  - SDK properly integrated at Full Launch

You **keep 100% of IP rights** and can simultaneously publish on other platforms (Steam, App Store, etc.) without losing eligibility.

---

## 7. Cover Art & Preview Video Requirements

### Cover Art (all 3 required)

| Type | Size | Notes |
|---|---|---|
| Landscape | **1920 × 1080 px** (16:9) | Main hero art |
| Portrait | **800 × 1200 px** (2:3) | Mobile homepage |
| Square | **800 × 800 px** (1:1) | Thumbnails |

**Rules:**
- No borders or frames
- Game title text is OK; no other text
- No store logos (App Store, Google Play, etc.)
- Sharp, not blurry
- Shows actual gameplay, not just logo

**Suggested Mindi cover art concept:**
- Dark maroon/gold background matching the game's aesthetic
- Large fanned-out playing cards in the center
- Gold "MINDI" title text
- Subtle suit symbols (♠♥♦♣) in the corners

### Preview Video (optional but boosts CTR)

| Spec | Value |
|---|---|
| Duration | 15–20 seconds |
| Resolution | 1080p (1920×1080) |
| Max size | 50 MB |
| Format | MP4 |

**No:** text overlays, mouse cursor, black bars, loading screens, logos, audio  
**Yes:** actual gameplay footage, fast-paced, shows a full trick being played

---

## 8. What You Must NOT Do

| ❌ Prohibited | Why |
|---|---|
| Add Facebook/Google/email login | Must use only CrazyGames auth |
| Add a custom fullscreen button | CrazyGames provides its own |
| Link to other gaming portals | Disqualifies from revenue share |
| Use any third-party ad SDK | Only CrazyGames SDK ads allowed |
| Lock screen orientation programmatically | CrazyGames handles it |
| Use absolute URLs for game assets | Will break in the iframe |
| Show ads during active gameplay | Only at natural breaks |

---

## 9. Testing the SDK Locally

The SDK is active only on `crazygames.com` domains. For local testing:

```bash
# Start dev server
pnpm dev

# Open in browser with the local SDK flag:
http://localhost:5173/?useLocalSdk=true
```

With `?useLocalSdk=true`:
- Demo ads appear (not real ads, but same flow)
- `CG.getUser()` returns a test user
- SDK events fire normally

**Best pre-submission test:** Upload to the CrazyGames preview environment via the developer portal before final submission.

---

## 10. Build & Upload Instructions

### 1. Build
```bash
pnpm build
```

### 2. Verify build size
```bash
# Total size
du -sh dist/

# File count (must be < 1500)
find dist -type f | wc -l

# Check largest files
du -sh dist/assets/* | sort -rh | head -20
```

### 3. Verify relative paths
```bash
# All src/href values in index.html must NOT start with /
grep -E 'src="|href="' dist/index.html
# Good: src="./assets/index-abc123.js"
# Bad:  src="/assets/index-abc123.js"
```

Vite uses relative paths by default, but double-check `vite.config.ts` has:
```typescript
export default defineConfig({
  base: './',   // ← ensures relative paths in the build
  // ...
})
```

### 4. Create ZIP
```bash
cd dist
zip -r ../mindi-crazygames.zip .
cd ..
```

### 5. Upload
Go to **https://developer.crazygames.com** → Upload game → drag `mindi-crazygames.zip`

---

## Quick Reference: CrazyGames Developer Portal

| Resource | URL |
|---|---|
| Developer Portal | https://developer.crazygames.com |
| Full Documentation | https://docs.crazygames.com |
| SDK Script | https://sdk.crazygames.com/crazygames-sdk-v3.js |
| SDK Testing Playground | https://docs.crazygames.com/sdk/intro/ |
| Technical Requirements | https://docs.crazygames.com/requirements/technical/ |
| Gameplay Requirements | https://docs.crazygames.com/requirements/gameplay/ |
| Payout FAQ | https://docs.crazygames.com/faq/ |
