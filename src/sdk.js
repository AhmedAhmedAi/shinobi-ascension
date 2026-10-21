/* ============================================================
   YouTube Playables SDK wrapper.
   All calls are guarded so the game runs normally in a browser.
   ============================================================ */

const KEY = 'shinobi-ascension-save-v1';

function yt() {
  return typeof window !== 'undefined' ? window.ytgame : undefined;
}

function safe(fn, fallback = undefined) {
  try {
    return fn();
  } catch (err) {
    return fallback;
  }
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export const sdk = {
  get active() {
    const g = yt();
    return !!(g && g.IN_PLAYABLES_ENV);
  },

  firstFrameReady() {
    if (!this.active) return;
    safe(() => yt().game.firstFrameReady());
  },

  gameReady() {
    if (!this.active) return;
    safe(() => yt().game.gameReady());
  },

  onPause(callback) {
    if (!this.active) return;
    safe(() => yt().system.onPause(callback));
  },

  onResume(callback) {
    if (!this.active) return;
    safe(() => yt().system.onResume(callback));
  },

  get audioEnabled() {
    if (!this.active) return true;
    return safe(() => yt().system.isAudioEnabled(), true);
  },

  onAudioEnabledChange(callback) {
    if (!this.active) return;
    safe(() => yt().system.onAudioEnabledChange(callback));
  },

  async load() {
    if (this.active) {
      try {
        const data = await withTimeout(yt().game.loadData(), 1500);
        if (typeof data === 'string' && data.length) return data;
      } catch (err) {
        // fall through to local storage
      }
    }
    try {
      return window.localStorage.getItem(KEY);
    } catch (err) {
      return null;
    }
  },

  async save(dataString) {
    if (this.active) {
      try {
        const result = await withTimeout(
          yt().game.saveData(dataString).then(() => 'ok'),
          1500,
        );
        if (result === 'ok') return true;
      } catch (err) {
        // fall through
      }
    }
    try {
      window.localStorage.setItem(KEY, dataString);
      return true;
    } catch (err) {
      return false;
    }
  },

  sendScore(value) {
    if (!this.active) return;
    const score = Math.max(0, Math.floor(value));
    safe(() => yt().engagement.sendScore({ value: score }));
  },

  get language() {
    if (!this.active) return navigator.language || 'en';
    return safe(() => yt().system.getLanguage(), 'en');
  },

  async interstitial() {
    if (!this.active) return false;
    const ads = safe(() => yt().ads);
    if (!ads || typeof ads.requestInterstitialAd !== 'function') return false;
    try {
      await ads.requestInterstitialAd();
      return true;
    } catch (err) {
      return false;
    }
  },

  async rewarded(rewardId) {
    if (!this.active) return false;
    const ads = safe(() => yt().ads);
    if (!ads || typeof ads.requestRewardedAd !== 'function') return false;
    try {
      return await ads.requestRewardedAd(rewardId);
    } catch (err) {
      return false;
    }
  },
};
