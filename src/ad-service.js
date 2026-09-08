(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.PaletteAds = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function createRewardedAdService(platform, config = {}) {
    const adUnitId = String(config.rewardedContinueAdUnitId || "").trim();
    const supported = Boolean(adUnitId && typeof platform.createRewardedVideoAd === "function");
    let ad = null;
    let loaded = false;
    let pending = null;

    function settle(result) {
      if (!pending) return;
      const resolve = pending;
      pending = null;
      resolve(result);
      preload();
    }

    function completed(result) {
      if (platform.target === "douyin" && typeof result?.count === "number") {
        return result.count > 0;
      }
      return result?.isEnded === true;
    }

    function ensureAd() {
      if (!supported || ad) return ad;
      try {
        ad = platform.createRewardedVideoAd({ adUnitId });
        ad.onLoad?.(() => { loaded = true; });
        ad.onError?.(() => {
          loaded = false;
          settle("error");
        });
        ad.onClose?.((result) => {
          loaded = false;
          settle(completed(result) ? "completed" : "dismissed");
        });
      } catch (_) {
        ad = null;
      }
      return ad;
    }

    function preload() {
      const instance = ensureAd();
      if (!instance || typeof instance.load !== "function") return;
      try {
        const loading = instance.load();
        if (loading && typeof loading.then === "function") {
          loading.then(() => { loaded = true; }).catch(() => { loaded = false; });
        }
      } catch (_) {
        loaded = false;
      }
    }

    async function showRewarded() {
      if (!supported) return "unavailable";
      if (pending) return "busy";
      const instance = ensureAd();
      if (!instance || typeof instance.show !== "function") return "unavailable";

      return new Promise((resolve) => {
        pending = resolve;
        (async () => {
          try {
            if (!loaded && typeof instance.load === "function") await instance.load();
            await instance.show();
          } catch (_) {
            try {
              if (typeof instance.load !== "function") throw new Error("AD_LOAD_UNAVAILABLE");
              await instance.load();
              await instance.show();
            } catch (_) {
              loaded = false;
              settle("error");
            }
          }
        })();
      });
    }

    if (supported) preload();

    return {
      isConfigured: () => supported,
      showRewarded,
    };
  }

  return { createRewardedAdService };
});
