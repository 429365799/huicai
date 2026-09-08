"use strict";

const assert = require("node:assert/strict");
const Ads = require("../src/ad-service.js");

function createPlatform(target) {
  const listeners = {};
  let loadCount = 0;
  let showCount = 0;
  const ad = {
    load() { loadCount += 1; return Promise.resolve(); },
    show() { showCount += 1; return Promise.resolve(); },
    onLoad(listener) { listeners.load = listener; },
    onError(listener) { listeners.error = listener; },
    onClose(listener) { listeners.close = listener; },
  };
  return {
    platform: {
      target,
      createRewardedVideoAd: ({ adUnitId }) => {
        assert.equal(adUnitId, `${target}-continue`);
        return ad;
      },
    },
    listeners,
    counts: () => ({ loadCount, showCount }),
  };
}

(async () => {
  const unavailable = Ads.createRewardedAdService({ target: "browser" }, {});
  assert.equal(unavailable.isConfigured(), false);
  assert.equal(await unavailable.showRewarded(), "unavailable");

  const wechat = createPlatform("wechat");
  const wechatService = Ads.createRewardedAdService(wechat.platform, { rewardedContinueAdUnitId: "wechat-continue" });
  assert.equal(wechatService.isConfigured(), true);
  const dismissed = wechatService.showRewarded();
  assert.equal(await wechatService.showRewarded(), "busy");
  await Promise.resolve();
  wechat.listeners.close({ isEnded: false });
  assert.equal(await dismissed, "dismissed");

  const completed = wechatService.showRewarded();
  await Promise.resolve();
  wechat.listeners.close({ isEnded: true });
  assert.equal(await completed, "completed");
  assert.ok(wechat.counts().showCount >= 2);

  const douyin = createPlatform("douyin");
  const douyinService = Ads.createRewardedAdService(douyin.platform, { rewardedContinueAdUnitId: "douyin-continue" });
  const sharedFallback = douyinService.showRewarded();
  await Promise.resolve();
  douyin.listeners.close({ isEnded: false, count: 1 });
  assert.equal(await sharedFallback, "completed", "抖音返回 count 时应优先判断完整次数");

  const failed = douyinService.showRewarded();
  await Promise.resolve();
  douyin.listeners.error({ errCode: 1004 });
  assert.equal(await failed, "error");

  console.log("PALETTE_AD_SERVICE_TEST=PASS");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
