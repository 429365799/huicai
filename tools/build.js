"use strict";

const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const distRoot = path.join(projectRoot, "dist");
const supportedTargets = ["wechat", "douyin"];

function readTargetArgument() {
  const argumentIndex = process.argv.indexOf("--target");
  const value = argumentIndex >= 0 ? process.argv[argumentIndex + 1] : "all";
  if (value === "all") return supportedTargets;
  if (!supportedTargets.includes(value)) {
    throw new Error(`BUILD_TARGET_INVALID: ${value}. 可选值为 ${supportedTargets.join(", ")}, all`);
  }
  return [value];
}

function copy(source, destination) {
  fs.cpSync(source, destination, { recursive: true });
}

function buildTarget(target) {
  const outputDirectory = path.join(distRoot, target);
  if (!outputDirectory.startsWith(`${distRoot}${path.sep}`)) {
    throw new Error(`BUILD_OUTPUT_OUT_OF_RANGE: ${outputDirectory}`);
  }

  // IDE-owned settings (notably the selected WeChat base library) must survive
  // a normal rebuild. Preserve exact bytes; never synthesize private settings.
  const privateConfigPath = path.join(outputDirectory, "project.private.config.json");
  const privateConfig = fs.existsSync(privateConfigPath) ? fs.readFileSync(privateConfigPath) : null;
  fs.rmSync(outputDirectory, { recursive: true, force: true });
  fs.mkdirSync(outputDirectory, { recursive: true });
  if (privateConfig) fs.writeFileSync(privateConfigPath, privateConfig);

  copy(path.join(projectRoot, "src"), path.join(outputDirectory, "src"));
  copy(path.join(projectRoot, "assets"), path.join(outputDirectory, "assets"));
  fs.copyFileSync(path.join(projectRoot, "game.js"), path.join(outputDirectory, "app.js"));
  fs.copyFileSync(path.join(projectRoot, "platforms", target, "game.json"), path.join(outputDirectory, "game.json"));
  fs.copyFileSync(
    path.join(projectRoot, "platforms", target, "project.config.json"),
    path.join(outputDirectory, "project.config.json"),
  );

  const runtimeGlobal = target === "wechat" ? "wx" : "tt";
  const adConfig = JSON.parse(fs.readFileSync(path.join(projectRoot, "platforms", target, "ads.json"), "utf8"));
  const entry = [
    '"use strict";',
    "",
    `globalThis.__MINIGAME_TARGET__ = ${JSON.stringify(target)};`,
    `globalThis.__MINIGAME_RUNTIME__ = ${runtimeGlobal};`,
    `globalThis.__PALETTE_AD_CONFIG__ = ${JSON.stringify(adConfig)};`,
    'require("./app.js");',
    "",
  ].join("\n");
  fs.writeFileSync(path.join(outputDirectory, "game.js"), entry, "utf8");

  const manifest = {
    target,
    entry: "game.js",
    sharedApplication: "app.js",
    generatedFiles: ["game.js", "game.json", "project.config.json"],
  };
  fs.writeFileSync(
    path.join(outputDirectory, "build-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  console.log(`PALETTE_BUILD_${target.toUpperCase()}=${outputDirectory}`);
}

readTargetArgument().forEach(buildTarget);
