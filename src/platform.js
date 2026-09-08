(function (root, factory) {
  const api = factory(root);
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.PalettePlatform = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  const runtime = root.__MINIGAME_RUNTIME__;
  if (!runtime) {
    throw new Error("MINIGAME_RUNTIME_NOT_CONFIGURED: 请从平台构建入口或 preview.html 启动");
  }

  function bindRequired(name) {
    if (typeof runtime[name] !== "function") {
      throw new Error(`MINIGAME_API_MISSING: ${name}`);
    }
    return runtime[name].bind(runtime);
  }

  function bindOptional(name) {
    return typeof runtime[name] === "function" ? runtime[name].bind(runtime) : null;
  }

  const requestFrame = typeof root.requestAnimationFrame === "function"
    ? root.requestAnimationFrame.bind(root)
    : (callback) => setTimeout(() => callback(Date.now()), 16);

  return {
    target: root.__MINIGAME_TARGET__ || "unknown",
    createCanvas: bindRequired("createCanvas"),
    createImage: bindOptional("createImage"),
    createRewardedVideoAd: bindOptional("createRewardedVideoAd"),
    createInnerAudioContext: bindOptional("createInnerAudioContext"),
    getSystemInfoSync: bindOptional("getSystemInfoSync"),
    onTouchStart: bindRequired("onTouchStart"),
    onTouchMove: bindOptional("onTouchMove"),
    onTouchEnd: bindOptional("onTouchEnd"),
    onTouchCancel: bindOptional("onTouchCancel"),
    onWheel: bindOptional("onWheel"),
    onWindowResize: bindOptional("onWindowResize"),
    requestAnimationFrame: requestFrame,
  };
});
