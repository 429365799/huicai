"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const projectRoot = path.resolve(__dirname, "..");
const privatePaths = ["wechat", "douyin"].map((target) => path.join(projectRoot, "dist", target, "project.private.config.json"));
const privateBefore = privatePaths.map((file) => fs.existsSync(file) ? fs.readFileSync(file) : null);

execFileSync(process.execPath, ["tools/build.js", "--target", "all"], {
  cwd: projectRoot,
  stdio: "pipe",
});
privatePaths.forEach((file, i) => {
  if (privateBefore[i]) assert.deepEqual(fs.readFileSync(file), privateBefore[i], "构建不能丢失开发者工具私有设置");
});

const targets = {
  wechat: "wx",
  douyin: "tt",
};

for (const [target, runtimeGlobal] of Object.entries(targets)) {
  const outputDirectory = path.join(projectRoot, "dist", target);
  const requiredFiles = [
    "game.js",
    "app.js",
    "game.json",
    "project.config.json",
    "build-manifest.json",
    "src/platform.js",
    "src/ad-service.js",
    "src/theme.js",
    "src/night-ui.js",
    "assets/art/night-spring.jpg",
    "assets/art/night-creek.jpg",
    "assets/art/night-river.jpg",
    "assets/art/night-coast.jpg",
    "assets/art/night-sea.jpg",
    "assets/art/pigments.jpg",
    "assets/audio/paint-0.wav",
    "assets/audio/paint-23.wav",
    "assets/audio/level-clear.wav",
  ];

  requiredFiles.forEach((relativePath) => {
    assert.equal(
      fs.existsSync(path.join(outputDirectory, relativePath)),
      true,
      `${target} 构建缺少 ${relativePath}`,
    );
  });

  const entry = fs.readFileSync(path.join(outputDirectory, "game.js"), "utf8");
  assert.match(entry, new RegExp(`__MINIGAME_TARGET__ = "${target}"`));
  assert.match(entry, new RegExp(`__MINIGAME_RUNTIME__ = ${runtimeGlobal}`));
  assert.match(entry, /__PALETTE_AD_CONFIG__ = \{"rewardedContinueAdUnitId":""\}/);
  assert.doesNotMatch(entry, new RegExp(`__MINIGAME_RUNTIME__ = ${runtimeGlobal === "wx" ? "tt" : "wx"}`));

  const manifest = JSON.parse(fs.readFileSync(path.join(outputDirectory, "build-manifest.json"), "utf8"));
  assert.equal(manifest.target, target);
}

const sourceApplication = fs.readFileSync(path.join(projectRoot, "game.js"), "utf8");
assert.doesNotMatch(sourceApplication, /\b(?:wx|tt)\s*\./, "共享游戏源码不应直接调用平台 API");
assert.equal(fs.existsSync(path.join(projectRoot, "game.json")), false, "源码根目录不应伪装成平台工程");
assert.equal(fs.existsSync(path.join(projectRoot, "project.config.json")), false, "源码根目录不应包含平台工程配置");

const wechatApplication = fs.readFileSync(path.join(projectRoot, "dist", "wechat", "app.js"));
const douyinApplication = fs.readFileSync(path.join(projectRoot, "dist", "douyin", "app.js"));
assert.deepEqual(wechatApplication, douyinApplication, "两个平台必须分发同一份共享游戏实现");

console.log("PALETTE_BUILD_TEST=PASS");
