"use strict";

// 共享游戏实现：不要把源码根目录直接导入平台开发者工具，请先执行对应平台构建。

const Core = typeof require === "function" ? require("./src/game-core.js") : globalThis.PaletteGameCore;
const levelPack = typeof require === "function" ? require("./src/level.js") : globalThis.PaletteGameLevel;
const VictoryEffects = typeof require === "function" ? require("./src/victory-effects.js") : globalThis.PaletteVictoryEffects;
const Platform = typeof require === "function" ? require("./src/platform.js") : globalThis.PalettePlatform;
const Ads = typeof require === "function" ? require("./src/ad-service.js") : globalThis.PaletteAds;
const Theme = typeof require === "function" ? require("./src/theme.js") : globalThis.PaletteTheme;

const NightUI = typeof require === "function" ? require("./src/night-ui.js") : globalThis.PaletteNightUI;
const nightAssets = NightUI.createAssets(Platform);
const canvas = Platform.createCanvas();
const context = canvas.getContext("2d");
const systemInfo = Platform.getSystemInfoSync ? Platform.getSystemInfoSync() : { windowWidth: 390, windowHeight: 844, pixelRatio: 2 };
const pixelRatio = Math.min(systemInfo.pixelRatio || 1, 3);
const PAINT_SETTLE_MS = 180;
const FLOOD_STEP_MAX_MS = 112;
const CELL_INK_MS = 360;
const FLOOD_TOTAL_MAX_MS = 1600;
const NOTE_COUNT = 24;
const PAINT_EFFECT_STYLES = ["ink", "paper", "ripple", "brush", "bloom"];
const PAINT_EFFECT_LABELS = { ink: "墨滴涌色", paper: "柔纸起伏", ripple: "水面涟漪", brush: "湿笔扫染", bloom: "色露绽放" };
const rewardedAds = Ads.createRewardedAdService(Platform, globalThis.__PALETTE_AD_CONFIG__ || {});
const requestedPaintEffect = globalThis.__PALETTE_EFFECT_STYLE__;

function effectStyleForLevel(levelNumber) {
  const number = Number.isFinite(levelNumber) ? Math.max(0, Math.floor(levelNumber)) : 0;
  return PAINT_EFFECT_STYLES[Math.floor(number / 5) % PAINT_EFFECT_STYLES.length];
}
// Opt-in browser story study. Native targets retain their existing presentation.
const storyMode = Platform.target === "browser" && globalThis.__PALETTE_STORY_MODE__ === true;
const scrollStory = storyMode && globalThis.__PALETTE_SCROLL_MODE__ === true;
const storySignal = (type) => { if (storyMode) globalThis.__PALETTE_STORY_SIGNAL__?.(type); };

let width = systemInfo.windowWidth;
let height = systemInfo.windowHeight;
let layout = null;
let toast = null;
let changedCells = new Map();
let hint = null;
let modalShownAt = 0;
let paintAnimation = null;
let confettiEffect = null;
let adBusy = false;
let adFeedback = null;
let albumOpen = false;
let levelIndex = 0;
let tabScroll = 0;
let tabGesture = null;
let paintEffectMode = PAINT_EFFECT_STYLES.includes(requestedPaintEffect) ? "manual" : "auto";
let paintEffectStyle = "ink";
// Development-only preview override. Platform builds start at the introduction.
if (Platform.target === "browser") {
  const previewIndex = globalThis.__PALETTE_PREVIEW_LEVEL__;
  if (Number.isInteger(previewIndex) && previewIndex >= 0 && previewIndex < levelPack.levels.length) {
    levelIndex = previewIndex;
  }
}
let level = levelPack.levels[levelIndex];
paintEffectStyle = paintEffectMode === "auto" ? effectStyleForLevel(level.number) : requestedPaintEffect;
let game = new Core.PaletteGame(level);

// The approved illustration includes the title and button artwork. Retain the original
// pixels and map input to the painted button instead of redrawing its material.
let coverVisible = !storyMode && !!Platform.createImage;
let coverReady = false;
let coverStartedAt = null;
let coverTouch = null;
const coverImage = coverVisible ? Platform.createImage() : null;
if (coverImage) {
  coverImage.onload = () => { coverReady = true; };
  coverImage.onerror = () => { coverVisible = false; };
  coverImage.src = "assets/art/spring-cover.png";
}

function coverGeometry() {
  const insets = NightUI.safeInsets(systemInfo);
  const availableHeight = height - insets.top - insets.bottom;
  const scale = Math.min(width / 941, availableHeight / 1672);
  const w = 941 * scale, h = 1672 * scale;
  const x = (width - w) / 2, y = insets.top + (availableHeight - h) / 2;
  return { x, y, w, h, button: { x: x + w * 0.205, y: y + h * 0.793, w: w * 0.59, h: Math.max(48, h * 0.087) } };
}

function drawCover(now) {
  if (!coverVisible) return;
  const age = coverStartedAt === null ? 0 : now - coverStartedAt;
  if (coverStartedAt !== null && age >= 640) { coverVisible = false; return; }
  const fade = coverStartedAt === null ? 1 : 1 - Math.min(1, age / 640);
  context.save();
  context.globalAlpha = fade;
  context.fillStyle = "#020B10";
  context.fillRect(0, 0, width, height);
  const r = coverGeometry();
  if (coverReady) context.drawImage(coverImage, r.x, r.y, r.w, r.h);
  else drawSerifText("泉光渐醒…", width / 2, height / 2, 17, "#D6C79D", "center");
  if (coverTouch) {
    context.fillStyle = "rgba(0, 9, 13, .16)";
    roundedRect(context, r.button.x, r.button.y, r.button.w, r.button.h, r.button.h / 2);
    context.fill();
  }
  context.restore();
}

function createSoundEngine() {
  const sources = Array.from({ length: NOTE_COUNT }, (_, index) => `assets/audio/paint-${index}.wav`);
  const players = Platform.createInnerAudioContext
    ? sources.map((source) => {
      const player = Platform.createInnerAudioContext();
      player.src = source;
      player.volume = 0.28;
      player.obeyMuteSwitch = true;
      return player;
    })
    : [];
  const clearPlayer = Platform.createInnerAudioContext ? Platform.createInnerAudioContext() : null;
  if (clearPlayer) {
    clearPlayer.src = "assets/audio/level-clear.wav";
    clearPlayer.volume = 0.38;
    clearPlayer.obeyMuteSwitch = true;
  }
  let enabled = true;

  return {
    get enabled() {
      return enabled;
    },
    toggle() {
      enabled = !enabled;
      return enabled;
    },
    playLayer(layerIndex, totalLayers) {
      if (!enabled || players.length === 0) return;
      const progress = totalLayers <= 1 ? 0 : layerIndex / (totalLayers - 1);
      const noteIndex = Math.min(NOTE_COUNT - 1, Math.max(0, Math.round(progress * (NOTE_COUNT - 1))));
      const player = players[noteIndex];
      if (typeof player.stop === "function") player.stop();
      player.src = sources[noteIndex];
      const playResult = player.play();
      if (playResult && typeof playResult.catch === "function") playResult.catch(() => {});
    },
    playLevelClear() {
      if (!enabled || !clearPlayer) return;
      if (typeof clearPlayer.stop === "function") clearPlayer.stop();
      clearPlayer.src = "assets/audio/level-clear.wav";
      const playResult = clearPlayer.play();
      if (playResult && typeof playResult.catch === "function") playResult.catch(() => {});
    },
  };
}

const soundEngine = createSoundEngine();

function resize(nextWidth, nextHeight) {
  width = nextWidth || systemInfo.windowWidth;
  height = nextHeight || systemInfo.windowHeight;
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  if (canvas.style) {
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  layout = createLayout();
  tabGesture = null;
  revealSelectedTab();
}

function createLayout() {
  if (!storyMode) return NightUI.createLayout(width, height, level, levelPack.levels, tabScroll, NightUI.safeInsets(systemInfo));
  const compact = height < 730;
  const margin = Math.max(18, Math.min(26, width * 0.06));
  const boardSize = scrollStory ? Math.min(width-margin*2-28, Math.max(160,height*.26),240) : Math.min(width - margin * 2 - 28, Math.max(160, height - 418), 330);
  const cardTop = scrollStory ? 112 : 148;
  const cardHeight = boardSize + 108;
  const boardX = (width - boardSize) / 2;
  const boardY = cardTop + 54;
  const paletteY = cardTop + cardHeight + 28;
  const buttonSize = Math.min(56, (width - margin * 2 - 36) / 4);
  const paletteWidth = buttonSize * 4 + 12 * 3;
  const tabGap = 8;
  const tabWidth = 74;
  const tabsWidth = levelPack.levels.length * (tabWidth + tabGap) - tabGap;
  const tabBar = { x: margin, y: 91, w: width - margin * 2, h: 44 };
  const maxTabScroll = Math.max(0, tabsWidth - tabBar.w);
  tabScroll = Math.max(0, Math.min(tabScroll, maxTabScroll));

  return {
    compact,
    margin,
    card: { x: margin, y: cardTop, w: width - margin * 2, h: cardHeight },
    board: { x: boardX, y: boardY, size: boardSize, cell: boardSize / level.cols },
    undo: { x: margin, y: 48, w: 42, h: 42 },
    sound: { x: width - margin - 92, y: 48, w: 42, h: 42 },
    restart: { x: width - margin - 42, y: 48, w: 42, h: 42 },
    hint: { x: width - margin - 82, y: paletteY + buttonSize + 12, w: 82, h: 44 },
    tabBar, tabWidth, tabGap, maxTabScroll, tabsWidth,
    tabs: levelPack.levels.map((_, i) => ({ x: tabBar.x + i * (tabWidth + tabGap) - tabScroll, y: 91, w: tabWidth, h: 44 })),
    palette: { x: (width - paletteWidth) / 2, y: paletteY, size: buttonSize, gap: 12 },
  };
}

function scrollTabs(next) {
  tabScroll = Math.max(0, Math.min(next, layout.maxTabScroll));
  layout.tabs.forEach((rect, i) => { rect.x = layout.tabBar.x + i * (layout.tabWidth + layout.tabGap) - tabScroll; });
}

function revealSelectedTab() {
  if (!storyMode) {
    scrollTabs((levelIndex - 2) * (layout.tabWidth + layout.tabGap));
    return;
  }
  const left = levelIndex * (layout.tabWidth + layout.tabGap);
  if (left < tabScroll) scrollTabs(left);
  else if (left + layout.tabWidth > tabScroll + layout.tabBar.w) scrollTabs(left + layout.tabWidth - layout.tabBar.w);
}

function roundedRect(ctx, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawText(text, x, y, size, color, align, weight) {
  context.fillStyle = color;
  context.textAlign = align || "left";
  context.textBaseline = "middle";
  context.font = `${weight || 500} ${size}px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif`;
  context.fillText(text, x, y);
}

function drawSerifText(text, x, y, size, color, align, weight) {
  context.fillStyle = color;
  context.textAlign = align || "left";
  context.textBaseline = "middle";
  context.font = `${weight || 400} ${size}px "Songti SC", "Noto Serif CJK SC", "Source Han Serif SC", serif`;
  context.fillText(text, x, y);
}

function drawTrackedSerifText(text, centerX, y, size, color, tracking, weight) {
  context.font = `${weight || 500} ${size}px "Songti SC", "Noto Serif CJK SC", "Source Han Serif SC", serif`;
  context.textBaseline = "middle";
  context.textAlign = "left";
  context.fillStyle = color;
  const glyphs = Array.from(text);
  const widths = glyphs.map((glyph) => context.measureText(glyph).width);
  const totalWidth = widths.reduce((sum, glyphWidth) => sum + glyphWidth, 0) + Math.max(0, glyphs.length - 1) * tracking;
  let cursor = centerX - totalWidth / 2;
  glyphs.forEach((glyph, index) => {
    context.fillText(glyph, cursor, y);
    cursor += widths[index] + tracking;
  });
}

function nightView(now = Date.now()) {
  return { width, height, level, levels: levelPack.levels, levelIndex, layout, game,
    theme: Theme.get(level.number), assets: nightAssets, now, hint, paintAnimation, adBusy, soundEnabled: soundEngine.enabled,
    portalActive: level.portals?.some(([a,b]) => getDisplayColor(...a, now) === getDisplayColor(...b, now)) };
}

function drawBackground(now) {
  if (!storyMode) return NightUI.background(context, nightView(now), nightAssets);
  if (storyMode) { context.clearRect(0, 0, width, height); return; }
  const theme=Theme.get(level.number),[deep,mid,mist,accent]=theme.palette;
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, deep);gradient.addColorStop(.58,mid);gradient.addColorStop(1,deep);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.save();
  context.globalAlpha=.18;context.fillStyle=mist;
  for(let i=0;i<7;i++){context.beginPath();context.arc((i*97+level.number*31)%width,(i*173+level.number*47)%height,46+(i%3)*22,0,Math.PI*2);context.fill();}
  context.globalAlpha=.34;context.strokeStyle=accent;context.fillStyle=accent;context.lineWidth=1.2;
  const variant=level.number%4;
  if(theme.kind==="spring"){
    context.beginPath();context.ellipse(width*.18,height*.24,92,54,-.35,0,Math.PI*2);context.stroke();
    for(let i=0;i<4;i++){context.beginPath();context.arc(width*(.08+i*.27),height*(.72+(i%2)*.12),34+i*5,0,Math.PI*2);context.stroke();}
    if(variant===0){context.beginPath();context.moveTo(0,height*.08);context.lineTo(width*.16,height*.18);context.lineTo(width*.1,height*.31);context.stroke();}
    if(variant===1){for(let i=0;i<3;i++){context.beginPath();context.ellipse(width*.84,height*.74,24+i*17,12+i*9,.15,0,Math.PI*2);context.stroke();}}
    if(variant===2){for(let i=0;i<5;i++){context.beginPath();context.moveTo(width*(.68+i*.07),0);context.quadraticCurveTo(width*(.67+i*.07),38,width*(.68+i*.07),66);context.stroke();}}
    if(variant===3){for(let i=0;i<4;i++){context.beginPath();context.ellipse(width*.78,height*.78,26+i*18,10+i*7,-.2,0,Math.PI*2);context.stroke();}}
  }else if(theme.kind==="creek"){
    context.beginPath();context.moveTo(-20,40);context.bezierCurveTo(width*.85,height*.18,width*.1,height*.64,width+20,height*.9);context.stroke();
    for(let i=0;i<6;i++){const x=16+i*72;context.beginPath();context.moveTo(x,height);context.quadraticCurveTo(x-12,height-75,x+4,height-128);context.stroke();}
    if(variant===0){for(let i=0;i<5;i++){context.beginPath();context.moveTo(8+i*12,height);context.lineTo(18+i*11,height-96-i*7);context.stroke();}}
    if(variant===1){for(let i=0;i<9;i++){context.beginPath();context.arc((i*83)%width,90+(i*107)%(height-180),1.5+(i%2),0,Math.PI*2);context.fill();}}
    if(variant===2){for(let i=0;i<11;i++){const x=i*43;context.beginPath();context.moveTo(x,0);context.lineTo(x-30,92);context.stroke();}}
    if(variant===3){for(const [x,y] of [[.12,.24],[.86,.72],[.18,.82]]){context.beginPath();context.ellipse(width*x,height*y,28,10,.2,0,Math.PI*2);context.stroke();context.beginPath();context.arc(width*x,height*y-12,10,Math.PI,0);context.stroke();}}
  }else if(theme.kind==="river"){
    context.beginPath();context.moveTo(-30,height*.25);context.quadraticCurveTo(width*.28,height*.05,width*.6,height*.27);context.quadraticCurveTo(width*.83,height*.46,width+30,height*.2);context.lineTo(width+30,height*.53);context.quadraticCurveTo(width*.5,height*.7,-30,height*.48);context.closePath();context.fill();
    if(variant===0){context.beginPath();context.moveTo(0,height*.26);context.lineTo(width*.2,height*.12);context.lineTo(width*.38,height*.26);context.lineTo(width*.56,height*.08);context.lineTo(width*.8,height*.28);context.stroke();}
    if(variant===1){context.beginPath();context.arc(width*.5,height*.22,72,Math.PI,0);context.stroke();context.moveTo(width*.28,height*.22);context.lineTo(width*.72,height*.22);context.stroke();}
    if(variant===2){for(let i=0;i<7;i++){const x=width*.72+i*14;context.beginPath();context.moveTo(x,height);context.quadraticCurveTo(x-22,height*.68,x+4,height*.48);context.stroke();}}
    if(variant===3){context.beginPath();context.moveTo(width*.1,height*.76);context.lineTo(width*.29,height*.76);context.lineTo(width*.25,height*.82);context.lineTo(width*.14,height*.82);context.closePath();context.stroke();context.moveTo(width*.2,height*.76);context.lineTo(width*.2,height*.62);context.stroke();}
  }else if(theme.kind==="coast"){
    for(let i=0;i<4;i++){context.beginPath();context.arc(width*(.18+i*.27),height*(.2+i*.17),42+i*7,Math.PI,Math.PI*2);context.stroke();}
    context.beginPath();context.moveTo(0,height*.72);context.bezierCurveTo(width*.3,height*.65,width*.65,height*.82,width,height*.7);context.stroke();
    if(variant===0){for(let i=0;i<4;i++){context.beginPath();context.moveTo(0,height*(.82+i*.035));context.quadraticCurveTo(width*.18,height*(.78+i*.035),width*.36,height*(.82+i*.035));context.stroke();}}
    if(variant===1){context.beginPath();context.moveTo(width*.72,height);context.lineTo(width*.82,height*.67);context.lineTo(width,height*.76);context.stroke();}
    if(variant===2){context.beginPath();context.moveTo(width*.14,height*.18);context.lineTo(width*.42,height*.34);context.moveTo(width*.86,height*.18);context.lineTo(width*.58,height*.34);context.stroke();}
    if(variant===3){for(let i=0;i<9;i++){context.beginPath();context.arc((i*71+30)%width,38+(i*37)%150,1.3,0,Math.PI*2);context.fill();}}
  }else{
    context.globalAlpha=.44;context.beginPath();context.arc(width*.76,height*.17,32,0,Math.PI*2);context.fill();
    for(let i=0;i<4;i++){context.beginPath();context.moveTo(0,height*(.62+i*.07));context.bezierCurveTo(width*.3,height*(.56+i*.07),width*.7,height*(.68+i*.07),width,height*(.61+i*.07));context.stroke();}
    context.beginPath();context.moveTo(width*.18,height*.43);context.lineTo(width*.31,height*.43);context.lineTo(width*.25,height*.37);context.closePath();context.stroke();
    if(variant===0){context.moveTo(width*.25,height*.37);context.lineTo(width*.25,height*.23);context.lineTo(width*.35,height*.37);context.stroke();}
    if(variant===1){context.beginPath();context.arc(width*.18,height*.2,48,0,Math.PI*2);context.stroke();}
    if(variant===2){context.beginPath();context.arc(width*.2,height*.76,54,Math.PI,Math.PI*2);context.stroke();for(let i=0;i<5;i++){context.moveTo(width*.2,height*.66);context.lineTo(width*(.04+i*.08),height*.55);context.stroke();}}
    if(variant===3){for(let i=0;i<4;i++){context.beginPath();context.arc(width*(.12+i*.25),height*(.78-(i%2)*.06),18+i*4,0,Math.PI*2);context.stroke();}}
  }
  const shade=context.createRadialGradient(width/2,height*.44,70,width/2,height*.44,width*.75);shade.addColorStop(0,"rgba(8,14,16,.02)");shade.addColorStop(1,"rgba(5,9,12,.58)");context.fillStyle=shade;context.globalAlpha=1;context.fillRect(0,0,width,height);
  context.restore();
}

function drawHeader() {
  if (!storyMode) return NightUI.header(context, nightView());
  if (storyMode) {
    context.fillStyle = "rgba(250,247,239,.84)";
    roundedRect(context, layout.margin, scrollStory ? 12 : 24, width-layout.margin*2, scrollStory ? 86 : 110, 24); context.fill();
    drawText(levelIndex === 0 ? "洄彩 · 唤泉" : "洄彩 · 溪行", width/2, 47, 19, "#304C46", "center", 700);
    drawText(`第 ${levelIndex} 关 · ${level.title} · ${level.moveLimit}步${levelIndex === 0 ? "唤醒泉水" : "汇成溪流"}`, width/2, scrollStory ? 85 : 110, 13, "#304C46", "center", 600);
    drawCircleButton(layout.undo, "↶", "#304C46", 24);
    drawCircleButton(layout.sound, soundEngine.enabled ? "♪" : "×", "#304C46", 24);
    drawCircleButton(layout.restart, "↻", "#304C46", 24);
    return;
  }
  const theme=Theme.get(level.number);
  drawText("洄彩", width / 2, 35, 22, "#F3EBD5", "center", 700);
  drawText(`${theme.chapter} · ${theme.title} · ${level.moveLimit}步`, width / 2, 62, 12, "#C8C2AE", "center", 600);

  context.save();
  context.beginPath();
  context.rect(layout.tabBar.x, layout.tabBar.y, layout.tabBar.w, layout.tabBar.h);
  context.clip();
  levelPack.levels.forEach((item, index) => {
    const rect = layout.tabs[index];
    const selected = index === levelIndex;
    context.fillStyle = selected ? "#C4A85F" : "rgba(13,24,27,0.72)";
    roundedRect(context, rect.x, rect.y, rect.w, rect.h, 13);
    context.fill();
    drawText(`${item.number} ${item.title}`, rect.x + rect.w / 2, rect.y + rect.h / 2, 13, selected ? "#172326" : "#D7D1BD", "center", 600);
  });
  context.restore();
  if (layout.maxTabScroll > 0) {
    const bar = layout.tabBar;
    context.fillStyle = "rgba(71,77,88,0.10)";
    roundedRect(context, bar.x, bar.y + bar.h + 5, bar.w, 2, 1);
    context.fill();
    const thumbWidth = bar.w * bar.w / layout.tabsWidth;
    context.fillStyle = "rgba(71,77,88,0.38)";
    roundedRect(context, bar.x + (bar.w - thumbWidth) * tabScroll / layout.maxTabScroll, bar.y + bar.h + 5, thumbWidth, 2, 1);
    context.fill();
  }

  drawCircleButton(layout.undo, "↶", game.history.length > 0 ? "#263348" : "#BDB6AB", 24);
  drawCircleButton(layout.sound, soundEngine.enabled ? "♪" : "×", soundEngine.enabled ? "#263348" : "#A59D93", 20);
  drawCircleButton(layout.restart, "↻", "#263348", 24);
}

function drawCircleButton(rect, glyph, color, fontSize) {
  context.save();
  context.fillStyle = "rgba(255,255,255,0.72)";
  context.shadowColor = "rgba(55,45,35,0.08)";
  context.shadowBlur = 12;
  roundedRect(context, rect.x, rect.y, rect.w, rect.h, 15);
  context.fill();
  context.restore();
  drawText(glyph, rect.x + rect.w / 2, rect.y + rect.h / 2 - 1, fontSize, color, "center", 600);
}

function drawCard() {
  if (!storyMode) return NightUI.status(context, nightView());
  const card = layout.card;
  context.save();
  context.shadowColor = "rgba(70, 55, 35, 0.13)";
  context.shadowBlur = 26;
  context.shadowOffsetY = 10;
  context.fillStyle = storyMode ? "rgba(250,247,239,0.72)" : "rgba(244,240,225,0.88)";
  roundedRect(context, card.x, card.y, card.w, card.h, 28);
  context.fill();
  context.restore();

  const target = level.colors[level.targetColor];
  drawText("目标", card.x + 24, card.y + 30, 12, "#9A9188", "left", 600);
  context.fillStyle = target.value;
  context.beginPath();
  context.arc(card.x + 70, card.y + 30, 8, 0, Math.PI * 2);
  context.fill();
  drawText(target.name, card.x + 84, card.y + 30, 14, "#263348", "left", 700);

  drawText(level.number === 0 ? "第 0 关 · 入门" : `第 ${level.number} 关`, card.x + card.w / 2, card.y + 30, 11, "#8B847C", "center", 600);
  drawText("剩余", card.x + card.w - 93, card.y + 30, 12, "#9A9188", "left", 600);
  drawText(String(game.movesRemaining), card.x + card.w - 26, card.y + 30, 22, game.movesRemaining <= 1 ? "#E45E57" : "#263348", "right", 800);
  const rules = (level.rules || []).slice();
  if (level.portals?.some(([a, b]) => getDisplayColor(...a, Date.now()) === getDisplayColor(...b, Date.now()))) {
    rules[1] = "◎ 已接通：两端区域将一起染色。";
  }
  rules.forEach((line, i) => {
    drawText(line, card.x + card.w / 2, card.y + card.h - 32 + i * 18, 12, "#655D56", "center", 500);
  });
}

function getDisplayColor(row, col, now) {
  if (!paintAnimation) return game.board[row][col];
  if (!paintAnimation.cellOrder.has(`${row},${col}`)) return game.board[row][col];
  return paintCellState(row,col,now).linear<.5?paintAnimation.fromColor:game.board[row][col];
}

function paintCellState(row,col,now) {
  if(!paintAnimation)return {linear:1,progress:1,entryRow:0,entryCol:0};
  const step=paintAnimation.steps.get(`${row},${col}`);
  if(!step)return {linear:1,progress:1,entryRow:0,entryCol:0};
  const linear=Math.max(0,Math.min(1,(now-paintAnimation.startedAt-step.depth*paintAnimation.stepMs)/CELL_INK_MS));
  const entryRow=step.parent?step.parent[0]-row:0,entryCol=step.parent?step.parent[1]-col:0;
  const adjacent=Math.abs(entryRow)+Math.abs(entryCol)===1;
  return {linear,progress:1-Math.pow(1-linear,3),entryRow:adjacent?entryRow:0,entryCol:adjacent?entryCol:0};
}

function paintTileMotion(state,size,style=paintEffectStyle){
  const wave=Math.sin(Math.PI*state.linear),direction=state.entryCol||-state.entryRow||1;
  if(style==="paper")return {scaleX:1,scaleY:1-wave*.018,lift:-wave*Math.min(5,size*.1),rotation:direction*wave*.065,bloom:state.progress};
  if(style==="ripple")return {scaleX:1+wave*.028,scaleY:1+wave*.028,lift:-wave*Math.min(4.5,size*.09),rotation:0,bloom:state.progress};
  if(style==="brush")return {scaleX:1,scaleY:1,lift:-wave*Math.min(4,size*.08),rotation:0,bloom:state.progress};
  if(style==="bloom")return {scaleX:1+wave*.055,scaleY:1+wave*.055,lift:-wave*Math.min(5,size*.1),rotation:0,bloom:state.progress};
  return {scaleX:1+wave*.035,scaleY:1+wave*.035,lift:-wave*Math.min(6,size*.12),rotation:0,bloom:state.progress};
}

function colorAlpha(hex,alpha){
  const value=parseInt(hex.slice(1),16);return `rgba(${value>>16},${value>>8&255},${value&255},${alpha})`;
}

function drawInkBloom(x,y,size,color,state,row,col){
  if(state.progress<=0)return;
  const radius=Math.max(1,size*(.08+1.5*state.progress));
  const cx=x+size*(.5+state.entryCol*.44),cy=y+size*(.5+state.entryRow*.44);
  context.save();roundedRect(context,x,y,size,size,Math.max(2,size*.065));context.clip();
  const wash=context.createRadialGradient(cx,cy,radius*.34,cx,cy,radius);
  wash.addColorStop(0,color);wash.addColorStop(.7,color);wash.addColorStop(1,colorAlpha(color,0));
  context.fillStyle=wash;context.fillRect(x,y,size,size);
  for(let i=0;i<3;i++){
    const seed=Math.sin((row+1)*12.9898+(col+1)*78.233+i*37.719)*43758.5453;
    const unit=seed-Math.floor(seed),angle=unit*Math.PI*2,orbit=radius*(.42+i*.12);
    const bx=cx+Math.cos(angle)*orbit,by=cy+Math.sin(angle)*orbit,br=radius*(.18+i*.025);
    const blot=context.createRadialGradient(bx,by,0,bx,by,br);blot.addColorStop(0,colorAlpha(color,.72));blot.addColorStop(1,colorAlpha(color,0));context.fillStyle=blot;context.fillRect(bx-br,by-br,br*2,br*2);
  }
  if(state.progress>.82){context.globalAlpha=(state.progress-.82)/.18;context.fillStyle=color;context.fillRect(x,y,size,size);}
  context.restore();
}

function drawDirectionalWash(x,y,size,color,state,row,col,roughness,alpha=1){
  const progress=Math.max(0,Math.min(1,state.progress));
  if(progress<=0)return;
  const horizontal=Math.abs(state.entryCol)>0||(!state.entryRow&&!state.entryCol);
  const reverse=horizontal?state.entryCol>0:state.entryRow>0;
  const segments=7,edge=(index)=>{
    const wobble=Math.sin((row+1)*2.37+(col+1)*4.91+index*1.73)*size*roughness*(1-progress);
    return (reverse?1-progress:progress)*size+wobble;
  };
  context.save();roundedRect(context,x,y,size,size,Math.max(2,size*.065));context.clip();
  context.globalAlpha=alpha;context.fillStyle=color;context.beginPath();
  if(horizontal){
    context.moveTo(reverse?x+size:x,y);
    context.lineTo(reverse?x+size:x,y+size);
    for(let i=segments;i>=0;i--){const yy=y+size*i/segments;context.lineTo(x+edge(i),yy);}
  }else{
    context.moveTo(x,reverse?y+size:y);
    context.lineTo(x+size,reverse?y+size:y);
    for(let i=segments;i>=0;i--){const xx=x+size*i/segments;context.lineTo(xx,y+edge(i));}
  }
  context.closePath();context.fill();context.restore();
}

function drawPaperWave(x,y,size,color,state,row,col){
  drawDirectionalWash(x,y,size,color,state,row,col,.018,1);
  if(state.progress<=0||state.progress>=1)return;
  const horizontal=Math.abs(state.entryCol)>0||(!state.entryRow&&!state.entryCol),reverse=horizontal?state.entryCol>0:state.entryRow>0;
  const edge=(reverse?1-state.progress:state.progress)*size;
  context.save();roundedRect(context,x,y,size,size,Math.max(2,size*.065));context.clip();
  context.strokeStyle="rgba(255,255,255,.42)";context.lineWidth=Math.max(1.2,size*.035);context.beginPath();
  if(horizontal){context.moveTo(x+edge,y+size*.08);context.quadraticCurveTo(x+edge+Math.sin((row+col)*2.1)*2,y+size*.5,x+edge,y+size*.92);}
  else{context.moveTo(x+size*.08,y+edge);context.quadraticCurveTo(x+size*.5,y+edge+Math.sin((row+col)*2.1)*2,x+size*.92,y+edge);}
  context.stroke();context.restore();
}

function drawRippleWash(x,y,size,color,state,row,col){
  drawInkBloom(x,y,size,color,state,row,col);
  if(state.linear<=0||state.linear>=.9)return;
  const cx=x+size*(.5+state.entryCol*.38),cy=y+size*(.5+state.entryRow*.38);
  context.save();roundedRect(context,x,y,size,size,Math.max(2,size*.065));context.clip();
  context.strokeStyle=colorAlpha(color,.34*(1-state.linear));context.lineWidth=Math.max(1,size*.025);
  for(let ring=0;ring<2;ring++){const radius=size*(.18+state.linear*.72+ring*.18);context.beginPath();context.arc(cx,cy,radius,0,Math.PI*2);context.stroke();}
  context.restore();
}

function drawBrushWash(x,y,size,color,state,row,col){
  drawDirectionalWash(x,y,size,color,{...state,progress:Math.min(1,state.progress*1.12)},row,col,.075,.72);
  drawDirectionalWash(x,y,size,color,{...state,progress:Math.max(0,(state.progress-.1)/.9)},row+2,col+3,.045,.72);
  if(state.progress>.82){context.save();context.globalAlpha=(state.progress-.82)/.18;context.fillStyle=color;roundedRect(context,x,y,size,size,Math.max(2,size*.065));context.fill();context.restore();}
}

function drawBloomWash(x,y,size,color,state,row,col){
  if(state.progress<=0)return;
  context.save();roundedRect(context,x,y,size,size,Math.max(2,size*.065));context.clip();
  const points=[[.5,.5],[.24,.5],[.76,.5],[.5,.24],[.5,.76]];
  for(let i=0;i<points.length;i++){
    const [px,py]=points[i],delay=i*.055,p=Math.max(0,Math.min(1,(state.progress-delay)/(1-delay))),radius=size*(.05+p*(i? .52:.66));
    const glow=context.createRadialGradient(x+size*px,y+size*py,0,x+size*px,y+size*py,radius);
    glow.addColorStop(0,color);glow.addColorStop(.72,colorAlpha(color,.9));glow.addColorStop(1,colorAlpha(color,0));context.fillStyle=glow;context.fillRect(x,y,size,size);
  }
  if(state.progress>.76){context.globalAlpha=(state.progress-.76)/.24;context.fillStyle=color;context.fillRect(x,y,size,size);}
  context.restore();
}

function drawPaintEffect(x,y,size,color,state,row,col,style=paintEffectStyle){
  if(style==="paper")return drawPaperWave(x,y,size,color,state,row,col);
  if(style==="ripple")return drawRippleWash(x,y,size,color,state,row,col);
  if(style==="brush")return drawBrushWash(x,y,size,color,state,row,col);
  if(style==="bloom")return drawBloomWash(x,y,size,color,state,row,col);
  return drawInkBloom(x,y,size,color,state,row,col);
}

function drawObstacleTile(x, y, size) {
  const radius = Math.max(6, size * 0.2);
  const stoneGradient = context.createLinearGradient(x, y, x + size, y + size);
  stoneGradient.addColorStop(0, "#756F72");
  stoneGradient.addColorStop(0.5, "#514F58");
  stoneGradient.addColorStop(1, "#353945");

  context.save();
  context.shadowColor = "rgba(31, 34, 43, 0.34)";
  context.shadowBlur = Math.max(4, size * 0.18);
  context.shadowOffsetY = Math.max(2, size * 0.08);
  context.fillStyle = stoneGradient;
  roundedRect(context, x, y, size, size, radius);
  context.fill();
  context.restore();

  context.strokeStyle = "rgba(255,255,255,0.19)";
  context.lineWidth = Math.max(1, size * 0.035);
  context.beginPath();
  context.moveTo(x + size * 0.22, y + size * 0.3);
  context.lineTo(x + size * 0.5, y + size * 0.22);
  context.lineTo(x + size * 0.76, y + size * 0.36);
  context.moveTo(x + size * 0.28, y + size * 0.72);
  context.lineTo(x + size * 0.48, y + size * 0.55);
  context.lineTo(x + size * 0.74, y + size * 0.69);
  context.stroke();
}

function drawBoard(now) {
  const board = layout.board;
  const gap = storyMode ? Math.max(3, board.cell * 0.055) : Math.max(2, board.cell * 0.05);

  if (!storyMode) NightUI.boardFrame(context, board);
  else {
  context.save();
  context.shadowColor="rgba(0,0,0,.58)";context.shadowBlur=20;context.shadowOffsetY=8;
  const frameGradient=context.createLinearGradient(board.x-12,board.y-12,board.x+board.size+12,board.y+board.size+12);
  frameGradient.addColorStop(0,"#9D8750");frameGradient.addColorStop(.08,"#24383A");frameGradient.addColorStop(.88,"#172729");frameGradient.addColorStop(1,"#B79B56");
  context.fillStyle=frameGradient;roundedRect(context,board.x-12,board.y-12,board.size+24,board.size+24,18);context.fill();context.restore();
  context.strokeStyle="rgba(235,213,151,.68)";context.lineWidth=1.5;roundedRect(context,board.x-7,board.y-7,board.size+14,board.size+14,14);context.stroke();
  context.fillStyle="rgba(8,16,18,.76)";roundedRect(context,board.x-3,board.y-3,board.size+6,board.size+6,11);context.fill();
  for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){const x=board.x+(sx>0?board.size:-0),y=board.y+(sy>0?board.size:0);context.fillStyle="#D2B866";context.beginPath();context.arc(x,y,3.2,0,Math.PI*2);context.fill();}

  context.save();
  context.globalAlpha = 0.18;
  context.strokeStyle = "#8A735F";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(width / 2, board.y + board.size - 2);
  context.quadraticCurveTo(width / 2 + 20, board.y + board.size + 22, width / 2 + 2, board.y + board.size + 34);
  context.stroke();
  context.restore();

  }
  for (let row = 0; row < level.rows; row += 1) {
    for (let col = 0; col < level.cols; col += 1) {
      const colorIndex = game.board[row][col];
      const key = `${row},${col}`;
      const baseX = board.x + col * board.cell + gap / 2;
      const baseY = board.y + row * board.cell + gap / 2;
      const tileSize = board.cell - gap;

      if (colorIndex === Core.BLOCKED_CELL) {
        drawObstacleTile(baseX, baseY, tileSize);
        continue;
      }
      if (colorIndex < 0) continue;

      const age = now - (changedCells.get(key) || -1000);
      const isPainting=paintAnimation?.cellOrder.has(key);
      const state=isPainting?paintCellState(row,col,now):null;
      const pulse = !isPainting&&!storyMode&&age>=0&&age<220?1+Math.sin((age/220)*Math.PI)*.025:1;
      const isHint = hint && hint.row === row && hint.col === col && now < hint.until;
      const scaledSize = tileSize * pulse;
      const x = baseX + (tileSize - scaledSize) / 2;
      const y = baseY + (tileSize - scaledSize) / 2;
      const color = level.colors[colorIndex];
      const oldColor=isPainting?level.colors[paintAnimation.fromColor]:color;
      const activeEffectStyle=isPainting?paintAnimation.effectStyle:paintEffectStyle;
      const motion=isPainting?paintTileMotion(state,scaledSize,activeEffectStyle):{scaleX:1,scaleY:1,lift:0,bloom:1};

      context.save();
      context.translate(x+scaledSize/2,y+scaledSize/2+motion.lift);
      context.rotate(motion.rotation||0);
      context.scale(motion.scaleX,motion.scaleY);
      context.translate(-x-scaledSize/2,-y-scaledSize/2);

      context.save();
      context.shadowColor = isPainting?`${color.shadow}88`:`${color.shadow}44`;
      context.shadowBlur = isHint?18:isPainting?10:2;
      context.shadowOffsetY = isPainting?6:1;
      context.fillStyle = oldColor.value;
      roundedRect(context, x, y, scaledSize, scaledSize, Math.max(2, tileSize * 0.065));
      context.fill();
      context.restore();

      if (!storyMode) NightUI.surface(context,x,y,scaledSize,isPainting?paintAnimation.fromColor:colorIndex,nightAssets);
      if(isPainting){
        drawPaintEffect(x,y,scaledSize,color.value,{...state,progress:motion.bloom},row,col,activeEffectStyle);
        if (!storyMode) NightUI.surface(context,x,y,scaledSize,colorIndex,nightAssets,Math.pow(state.progress,12));
      }

      const shine = context.createLinearGradient(x, y, x + scaledSize, y + scaledSize);
      shine.addColorStop(0, "rgba(255,255,255,0.27)");
      shine.addColorStop(0.52, "rgba(255,255,255,0.03)");
      shine.addColorStop(1, "rgba(0,0,0,0.08)");
      context.fillStyle = shine;
      roundedRect(context, x, y, scaledSize, scaledSize, Math.max(2, tileSize * 0.065));
      context.fill();

      if (!storyMode) {
        context.strokeStyle = "rgba(255,242,194,.5)";
        context.lineWidth = .65;
        roundedRect(context, x+.4, y+.4, scaledSize-.8, scaledSize-.8, Math.max(2,tileSize*.065));
        context.stroke();
        context.save();
        context.strokeStyle = "rgba(255,245,211,.07)";
        context.lineWidth = .7;
        for(let mark=0;mark<7;mark++){
          const mx=x+((row*13+col*7+mark*17)%31)/31*scaledSize;
          const my=y+((row*19+col*11+mark*13)%29)/29*scaledSize;
          context.beginPath();context.moveTo(mx,my);context.lineTo(Math.min(x+scaledSize,mx+2),Math.min(y+scaledSize,my+3));context.stroke();
        }
        context.restore();
      }
      if (isHint) {
        context.strokeStyle = "#FFFFFF";
        context.lineWidth = 3;
        roundedRect(context, x - 2, y - 2, scaledSize + 4, scaledSize + 4, Math.max(11, tileSize * 0.27));
        context.stroke();
      }
      context.restore();
    }
  }
  drawPortalMarkers(now);
}

function drawPortalMarkers(now) {
  for (const [a, b] of level.portals || []) {
    const active = getDisplayColor(...a, now) === getDisplayColor(...b, now);
    const point = ([r, c]) => [layout.board.x + (c + 0.5) * layout.board.cell, layout.board.y + (r + 0.5) * layout.board.cell];
    const [ax, ay] = point(a), [bx, by] = point(b);
    context.save();
    // A thin dashed connection shows the pair without hiding tile colors.
    context.strokeStyle = active ? "rgba(38,51,72,0.55)" : "rgba(38,51,72,0.24)";
    context.lineWidth = active ? 2 : 1;
    context.setLineDash([3, 6]);
    context.beginPath();
    context.moveTo(ax, ay);
    context.lineTo(bx, by);
    context.stroke();
    context.setLineDash([]);
    for (const cell of [a, b]) {
      const [x, y] = point(cell);
      const radius = Math.min(10, layout.board.cell * 0.25);
      context.strokeStyle = "#263348";
      context.lineWidth = 4;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.stroke();
      context.strokeStyle = "#FFFFFF";
      context.lineWidth = 2;
      context.stroke();
      context.fillStyle = active ? "#FFFFFF" : "#263348";
      context.beginPath();
      context.arc(x, y, radius * 0.4, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }
}

function drawPalette(now) {
  if (!storyMode) return NightUI.palette(context, nightView(now));
  if (storyMode) {
    context.fillStyle = "rgba(250,247,239,.86)";
    roundedRect(context, layout.margin-4, layout.palette.y-39, width-layout.margin*2+8, layout.hint.y+layout.hint.h-layout.palette.y+45, 22); context.fill();
  }
  drawText("选择一种颜料", layout.margin, layout.palette.y - 24, 13, "#716960", "left", 600);

  level.colors.forEach((color, index) => {
    const x = layout.palette.x + index * (layout.palette.size + layout.palette.gap);
    const y = layout.palette.y;
    const selected = game.selectedColor === index;
    const hinted = hint && hint.color === index && now < hint.until;

    context.save();
    context.shadowColor = selected ? `${color.shadow}66` : "rgba(60,45,30,0.10)";
    context.shadowBlur = selected ? 15 : 8;
    context.shadowOffsetY = 4;
    context.fillStyle = selected ? "#FFFFFF" : "rgba(255,255,255,0.76)";
    roundedRect(context, x, y, layout.palette.size, layout.palette.size, 20);
    context.fill();
    context.restore();

    context.fillStyle = color.value;
    context.beginPath();
    context.arc(x + layout.palette.size / 2, y + layout.palette.size / 2 - 7, selected ? 16 : 15, 0, Math.PI * 2);
    context.fill();
    if (selected || hinted) {
      context.strokeStyle = hinted ? "#263348" : color.shadow;
      context.lineWidth = 2.5;
      context.beginPath();
      context.arc(x + layout.palette.size / 2, y + layout.palette.size / 2 - 7, 20, 0, Math.PI * 2);
      context.stroke();
    }
    drawText(color.name, x + layout.palette.size / 2, y + layout.palette.size - 9, 10, "#655D56", "center", selected ? 700 : 500);
  });

  const instruction = paintAnimation ? "颜料正在扩散…" : storyMode ? "让颜色相连，让泉水前行" : "左右滑动上方关卡条可选关";
  drawText(instruction, layout.margin, layout.hint.y + 22, 12, "#655D56", "left", 500);
  context.fillStyle = "rgba(255,255,255,0.72)";
  roundedRect(context, layout.hint.x, layout.hint.y, layout.hint.w, layout.hint.h, 14);
  context.fill();
  drawText(adBusy ? "准备视频…" : "视频提示", layout.hint.x + layout.hint.w / 2, layout.hint.y + layout.hint.h / 2, 11, paintAnimation || adBusy ? "#B3ACA4" : "#536176", "center", 700);
}

function drawToast(now) {
  if (!toast || now >= toast.until) return;
  context.save();
  context.globalAlpha = Math.min(1, (toast.until - now) / 240);
  context.font = '600 13px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
  const toastWidth = Math.min(width - 48, context.measureText(toast.text).width + 36);
  const x = (width - toastWidth) / 2;
  const y = layout.card.y + layout.card.h - 50;
  context.fillStyle = "rgba(38,51,72,0.90)";
  roundedRect(context, x, y, toastWidth, 36, 18);
  context.fill();
  drawText(toast.text, width / 2, y + 18, 13, "#FFFFFF", "center", 600);
  context.restore();
}

function drawConfetti(now) {
  if (!confettiEffect) return;
  const effectAge = now - confettiEffect.startedAt;
  if (effectAge > confettiEffect.duration) {
    confettiEffect = null;
    return;
  }

  if (effectAge >= 0 && effectAge < 520) {
    const burstProgress = effectAge / 520;
    const rayLength = 34 + Math.sin(burstProgress * Math.PI) * 58;
    context.save();
    context.globalAlpha = Math.max(0, 1 - burstProgress);
    context.lineCap = "round";
    context.lineWidth = 4;
    confettiEffect.emitters.forEach((originX, emitterIndex) => {
      for (let rayIndex = 0; rayIndex < 5; rayIndex += 1) {
        const centerAngle = emitterIndex === 0 ? -76 : -104;
        const angle = (centerAngle + (rayIndex - 2) * 13) * Math.PI / 180;
        context.strokeStyle = level.colors[(rayIndex + emitterIndex) % level.colors.length].value;
        context.beginPath();
        context.moveTo(originX, confettiEffect.groundY);
        context.lineTo(
          originX + Math.cos(angle) * rayLength,
          confettiEffect.groundY + Math.sin(angle) * rayLength,
        );
        context.stroke();
      }
    });
    context.restore();
  }

  context.save();
  for (const particle of confettiEffect.particles) {
    const state = VictoryEffects.sampleParticle(
      particle,
      now,
      confettiEffect.startedAt,
      confettiEffect.duration,
    );
    if (!state || state.x < -30 || state.x > width + 30 || state.y < -40 || state.y > height + 30) continue;

    context.save();
    context.globalAlpha = state.alpha;
    context.translate(state.x, state.y);
    context.rotate(state.rotation);
    context.fillStyle = particle.color;
    context.strokeStyle = particle.color;
    if (particle.shape === "ribbon") {
      context.lineWidth = 3;
      context.lineCap = "round";
      context.beginPath();
      context.moveTo(-particle.height * 0.8, 0);
      context.quadraticCurveTo(0, particle.width, particle.height * 0.8, 0);
      context.stroke();
    } else if (particle.shape === "circle") {
      context.beginPath();
      context.arc(0, 0, particle.width * 0.55, 0, Math.PI * 2);
      context.fill();
    } else {
      roundedRect(context, -particle.width / 2, -particle.height / 2, particle.width, particle.height, 2);
      context.fill();
    }
    context.restore();
  }
  context.restore();
}

// Fixed mineral grain: deterministic marks stay attached to the surface, never shimmer.
function drawJadeGrain(x, y, w, h, strength = 1) {
  context.save();
  let seed = 7193;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 1250; i += 1) {
    const px = x + random() * w, py = y + random() * h;
    context.fillStyle = i % 3 ? `rgba(156,205,196,${0.035 * strength})` : `rgba(0,8,13,${0.18 * strength})`;
    const size = 0.3 + random() * 0.65;
    context.fillRect(px, py, size, size * 0.65);
  }
  context.lineWidth = 0.45;
  for (let i = 0; i < 22; i += 1) {
    const py = y + h * (0.2 + random() * 0.8);
    const px = x + random() * w;
    context.strokeStyle = `rgba(107,183,182,${0.045 * strength})`;
    context.beginPath(); context.moveTo(px - 50, py);
    context.bezierCurveTo(px + 15, py - 18, px - 27, py + 12, px + 60, py - 6);
    context.bezierCurveTo(px + 82, py - 8, px + 58, py + 9, px + 115, py + 1);
    context.stroke();
  }
  context.restore();
}

function drawSuccessModal(now, x, y, modalWidth, ease) {
  const modalHeight = 352;
  const centerX = x + modalWidth / 2;
  const panelTop = y + 26;
  const panelHeight = modalHeight - 26;
  const paleGold = "#F2DCA0";
  const ivory = "#F1E7C9";
  const muted = "#B4BCB3";

  // The completed board remains visible through smoked mineral glass.
  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.68)";
  context.shadowBlur = 30;
  context.shadowOffsetY = 12;
  const panelGradient = context.createLinearGradient(x, panelTop, x + modalWidth, panelTop + panelHeight);
  panelGradient.addColorStop(0, "rgba(15, 34, 39, 0.98)");
  panelGradient.addColorStop(0.52, "rgba(4, 18, 24, 0.98)");
  panelGradient.addColorStop(1, "rgba(7, 25, 30, 0.98)");
  context.fillStyle = panelGradient;
  roundedRect(context, x, panelTop, modalWidth, panelHeight, 22);
  context.fill();
  context.restore();

  const edgeGradient = context.createLinearGradient(x, panelTop, x + modalWidth, panelTop + panelHeight);
  edgeGradient.addColorStop(0, "rgba(239, 219, 155, 0.82)");
  edgeGradient.addColorStop(0.48, "rgba(137, 124, 79, 0.54)");
  edgeGradient.addColorStop(1, "rgba(234, 218, 162, 0.76)");
  context.strokeStyle = edgeGradient;
  context.lineWidth = 1.15;
  roundedRect(context, x + 0.5, panelTop + 0.5, modalWidth - 1, panelHeight - 1, 22);
  context.stroke();
  context.strokeStyle = "rgba(220, 204, 151, 0.34)";
  context.lineWidth = 0.65;
  roundedRect(context, x + 8.5, panelTop + 8.5, modalWidth - 17, panelHeight - 17, 16);
  context.stroke();

  // Quiet mineral veins keep the large dark surface from reading as flat CSS.
  context.save();
  roundedRect(context, x + 9, panelTop + 9, modalWidth - 18, panelHeight - 18, 15);
  context.clip();
  drawJadeGrain(x, panelTop, modalWidth, panelHeight, 1.5);
  context.strokeStyle = "rgba(143, 191, 191, 0.075)";
  context.lineWidth = 0.7;
  for (let vein = 0; vein < 4; vein += 1) {
    const veinY = panelTop + 88 + vein * 62;
    context.beginPath();
    context.moveTo(x - 12, veinY);
    context.bezierCurveTo(x + modalWidth * 0.25, veinY - 11, x + modalWidth * 0.68, veinY + 13, x + modalWidth + 12, veinY - 4);
    context.stroke();
  }
  context.restore();

  // The seal is a droplet waking the spring, not a generic success checkmark.
  const sealY = panelTop + 12;
  const pulse = (now % 2400) / 2400;
  context.save();
  context.strokeStyle = "rgba(122, 207, 211, 0.42)";
  context.lineWidth = 0.8;
  for (let ripple = 0; ripple < 3; ripple += 1) {
    const phase = (pulse + ripple / 3) % 1;
    context.globalAlpha = (1 - phase) * 0.72;
    context.beginPath();
    context.ellipse(centerX, sealY + 32, 32 + phase * 93, 5 + phase * 15, 0, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();

  context.save();
  context.shadowColor = "rgba(91, 205, 211, 0.25)";
  context.shadowBlur = 18;
  const sealGradient = context.createRadialGradient(centerX - 11, sealY - 15, 2, centerX, sealY, 40);
  sealGradient.addColorStop(0, "#356F73");
  sealGradient.addColorStop(0.56, "#103D46");
  sealGradient.addColorStop(1, "#071E28");
  context.fillStyle = sealGradient;
  context.beginPath();
  context.arc(centerX, sealY, 38, 0, Math.PI * 2);
  context.fill();
  context.restore();
  context.save();
  context.beginPath(); context.arc(centerX, sealY, 36, 0, Math.PI * 2); context.clip();
  drawJadeGrain(centerX - 38, sealY - 38, 76, 76, 2.3);
  context.restore();
  context.strokeStyle = paleGold;
  context.lineWidth = 1.25;
  context.beginPath();
  context.arc(centerX, sealY, 38, 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = "rgba(229, 216, 168, 0.48)";
  context.lineWidth = 0.65;
  context.beginPath();
  context.arc(centerX, sealY, 32.5, 0, Math.PI * 2);
  context.stroke();

  context.save();
  context.shadowColor = "rgba(232, 220, 165, 0.72)";
  context.shadowBlur = 9;
  const dropGradient = context.createLinearGradient(centerX, sealY - 19, centerX, sealY + 19);
  dropGradient.addColorStop(0, "#FFF2BF");
  dropGradient.addColorStop(0.46, "#DCE8D7");
  dropGradient.addColorStop(1, "#77C4CC");
  context.strokeStyle = dropGradient;
  context.lineWidth = 1.7;
  context.fillStyle = "rgba(155,216,202,0.16)";
  context.beginPath();
  context.moveTo(centerX, sealY - 20);
  context.bezierCurveTo(centerX - 3, sealY - 9, centerX - 13, sealY + 2, centerX - 13, sealY + 9);
  context.bezierCurveTo(centerX - 13, sealY + 19, centerX - 6, sealY + 24, centerX, sealY + 24);
  context.bezierCurveTo(centerX + 7, sealY + 24, centerX + 13, sealY + 18, centerX + 13, sealY + 9);
  context.bezierCurveTo(centerX + 13, sealY + 2, centerX + 3, sealY - 9, centerX, sealY - 20);
  context.closePath();
  context.fill();
  context.stroke();
  context.restore();
  // Reflected rings inside the jade seal, with uneven light on the water surface.
  for (let ring = 0; ring < 4; ring += 1) {
    context.strokeStyle = ring % 2 ? "rgba(121,206,202,.55)" : "rgba(210,234,208,.76)";
    context.lineWidth = ring === 1 ? 1 : 0.5;
    context.beginPath();
    context.ellipse(centerX, sealY + 23, 8 + ring * 8, 1.5 + ring * 2, 0, 0, Math.PI * 2);
    context.stroke();
  }

  // Sparse pigment motes keep the celebration controlled.
  const moteColors = ["#F0D58A", "#79BBC3", level.colors[level.targetColor].value, "#A7C692"];
  for (let mote = 0; mote < 6; mote += 1) {
    const side = mote % 2 === 0 ? -1 : 1;
    const moteX = centerX + side * (49 + (mote % 3) * 24);
    const moteY = panelTop + 22 + (mote % 3) * 18 + Math.sin(now / 700 + mote) * 2;
    context.save();
    context.globalAlpha = 0.34 + (mote % 2) * 0.15;
    context.fillStyle = moteColors[mote % moteColors.length];
    context.beginPath();
    context.arc(moteX, moteY, mote % 3 === 0 ? 1.5 : 1, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  const title = level.number === 0 ? "初染成画" : "完美通关";
  drawTrackedSerifText(title, centerX, panelTop + 101, modalWidth < 310 ? 32 : 38, "#F1E3BE", 3, 500);
  const titleWing = Math.min(48, modalWidth * 0.15);
  context.strokeStyle = "rgba(214, 192, 123, 0.5)";
  context.lineWidth = 0.7;
  context.beginPath();
  context.moveTo(x + 31, panelTop + 91);
  context.lineTo(centerX - titleWing - 55, panelTop + 91);
  context.moveTo(centerX + titleWing + 55, panelTop + 91);
  context.lineTo(x + modalWidth - 31, panelTop + 91);
  context.stroke();
  drawSerifText(`${level.chapter} · ${level.title}`, centerX, panelTop + 128, 14, ivory, "center", 500);

  const achievement = { x: x + 32, y: panelTop + 151, w: modalWidth - 64, h: 48 };
  const achievementGradient = context.createLinearGradient(achievement.x, achievement.y, achievement.x + achievement.w, achievement.y + achievement.h);
  achievementGradient.addColorStop(0, "rgba(28, 77, 78, 0.86)");
  achievementGradient.addColorStop(0.5, "rgba(39, 91, 88, 0.72)");
  achievementGradient.addColorStop(1, "rgba(17, 56, 62, 0.9)");
  context.fillStyle = achievementGradient;
  roundedRect(context, achievement.x, achievement.y, achievement.w, achievement.h, 16);
  context.fill();
  context.save();
  roundedRect(context, achievement.x, achievement.y, achievement.w, achievement.h, 16); context.clip();
  drawJadeGrain(achievement.x, achievement.y, achievement.w, achievement.h, 2);
  context.restore();
  context.strokeStyle = "rgba(224, 204, 137, 0.68)";
  context.lineWidth = 0.85;
  roundedRect(context, achievement.x + 0.5, achievement.y + 0.5, achievement.w - 1, achievement.h - 1, 16);
  context.stroke();
  drawSerifText("最优解 ·", centerX - 16, achievement.y + 24, 15, paleGold, "right", 400);
  drawSerifText(String(level.moveLimit - game.movesRemaining), centerX + 2, achievement.y + 23, 28, paleGold, "center", 400);
  drawSerifText("步完成", centerX + 17, achievement.y + 24, 15, paleGold, "left", 400);

  const button = { x: x + 27, y: panelTop + 224, w: modalWidth - 54, h: 54 };
  const buttonGradient = context.createLinearGradient(button.x, button.y, button.x, button.y + button.h);
  buttonGradient.addColorStop(0, "rgba(27, 65, 70, 0.98)");
  buttonGradient.addColorStop(1, "rgba(7, 31, 39, 0.98)");
  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.42)";
  context.shadowBlur = 13;
  context.shadowOffsetY = 6;
  context.fillStyle = buttonGradient;
  roundedRect(context, button.x, button.y, button.w, button.h, 20);
  context.fill();
  context.restore();
  context.strokeStyle = paleGold;
  context.lineWidth = 1.1;
  context.save();
  roundedRect(context, button.x, button.y, button.w, button.h, 20); context.clip();
  drawJadeGrain(button.x, button.y, button.w, button.h, 2);
  context.restore();
  roundedRect(context, button.x + 0.5, button.y + 0.5, button.w - 1, button.h - 1, 20);
  context.stroke();
  context.strokeStyle = "rgba(154, 190, 181, 0.34)";
  context.lineWidth = 0.6;
  roundedRect(context, button.x + 5.5, button.y + 5.5, button.w - 11, button.h - 11, 15);
  context.stroke();

  // A very slow reflected highlight gives the glass button life without bouncing it.
  context.save();
  roundedRect(context, button.x + 3, button.y + 3, button.w - 6, button.h - 6, 17);
  context.clip();
  context.globalAlpha = 0.07;
  context.fillStyle = "#D8FFFF";
  const gleamX = button.x - 32 + ((now % 3200) / 3200) * (button.w + 64);
  context.translate(gleamX, button.y);
  context.rotate(-0.22);
  context.fillRect(-1.5, -8, 3, button.h + 16);
  context.restore();

  const nextLevel = levelPack.levels[levelIndex + 1];
  const buttonLabel = nextLevel ? `下一幅 · ${nextLevel.title}` : "再赏一轮";
  drawSerifText(`${buttonLabel}  ›`, centerX, button.y + 27, 19, ivory, "center", 400);
  drawSerifText(level.number === 0 ? "第一幅小画，已收入花册" : `第 ${level.number} 关画作已收入花册`, centerX, panelTop + 303, 12, muted, "center", 400);
  layout.modalButton = button;
}

function shouldOfferRewardedContinue() {
  return level.number !== 0 && rewardedAds.isConfigured() && !game.continuationUsed;
}

function drawFailureModal(x, y, modalWidth) {
  const offerRewarded = shouldOfferRewardedContinue();
  const modalHeight = offerRewarded ? 326 : 262;
  context.fillStyle = "#FFFDF8";
  context.shadowColor = "rgba(20,25,35,0.22)";
  context.shadowBlur = 30;
  roundedRect(context, x, y, modalWidth, modalHeight, 28);
  context.fill();
  context.shadowBlur = 0;
  context.fillStyle = "#F3C557";
  context.beginPath();
  context.arc(width / 2, y + 58, 31, 0, Math.PI * 2);
  context.fill();
  drawText("!", width / 2, y + 58, 28, "#FFFFFF", "center", 800);
  drawText("还差一点", width / 2, y + 112, 22, "#263348", "center", 800);
  drawText("换一种连接顺序，再试试看", width / 2, y + 143, 13, "#827970", "center", 500);

  if (offerRewarded) {
    const rewardedButton = { x: x + 30, y: y + 166, w: modalWidth - 60, h: 50 };
    context.fillStyle = adBusy ? "#B8B1A8" : "#D49A32";
    roundedRect(context, rewardedButton.x, rewardedButton.y, rewardedButton.w, rewardedButton.h, 16);
    context.fill();
    drawText(adBusy ? "正在准备视频…" : "看视频 · 续画 2 步", width / 2, rewardedButton.y + 25, 15, "#FFFFFF", "center", 700);

    const restartButton = { x: x + 30, y: y + 228, w: modalWidth - 60, h: 46 };
    context.fillStyle = "#E66B60";
    roundedRect(context, restartButton.x, restartButton.y, restartButton.w, restartButton.h, 16);
    context.fill();
    drawText("重新挑战", width / 2, restartButton.y + 23, 14, "#FFFFFF", "center", 700);
    if (adFeedback) drawText(adFeedback, width / 2, y + 297, 11, "#827970", "center", 500);
    layout.rewardedContinueButton = rewardedButton;
    layout.modalButton = restartButton;
  } else {
    const button = { x: x + 30, y: y + 184, w: modalWidth - 60, h: 48 };
    context.fillStyle = "#E66B60";
    roundedRect(context, button.x, button.y, button.w, button.h, 16);
    context.fill();
    drawText("重新挑战", width / 2, button.y + 24, 15, "#FFFFFF", "center", 700);
    layout.rewardedContinueButton = null;
    layout.modalButton = button;
  }
}

function drawModal(now) {
  if (scrollStory && game.status === "won") return;
  if (game.status === "playing" || paintAnimation || modalShownAt === 0 || now < modalShownAt) return;
  if (storyMode) {
    const y = Math.min(layout.card.y+layout.card.h-115, height-180);
    context.fillStyle = "rgba(250,247,239,.97)";
    roundedRect(context, 34, y, width-68, 105, 20); context.fill();
    drawText(game.status === "won" ? "泉水醒了，小叶继续向前。" : "再借一次颜色，试试看。", width/2, y+28, 16, "#304C46", "center", 600);
    const button = { x: 66, y: y+49, w: width-132, h: 44 };
    context.fillStyle = "#355E50"; roundedRect(context, button.x, button.y, button.w, button.h, 14); context.fill();
    drawText("再染一次", width/2, y+71, 15, "#FFFAF0", "center", 600);
    layout.modalButton = button;
    return;
  }
  const elapsed = Math.max(0, Math.min(1, (now - modalShownAt) / 340));
  const ease = 1 - Math.pow(1 - elapsed, 3);
  context.save();
  context.globalAlpha = ease;
  context.fillStyle = "rgba(0, 10, 16, 0.67)";
  context.fillRect(0, 0, width, height);
  const focus = context.createRadialGradient(width / 2, height * 0.49, 40, width / 2, height * 0.49, Math.max(width, height) * 0.58);
  focus.addColorStop(0, "rgba(29, 78, 83, 0.11)");
  focus.addColorStop(0.55, "rgba(0, 11, 16, 0.02)");
  focus.addColorStop(1, "rgba(0, 5, 10, 0.32)");
  context.fillStyle = focus;
  context.fillRect(0, 0, width, height);

  const won = game.status === "won";
  const modalWidth = Math.min(width - 38, 342);
  const modalHeight = won ? 352 : shouldOfferRewardedContinue() ? 326 : 262;
  const x = (width - modalWidth) / 2;
  const y = (height - modalHeight) / 2 + (1 - ease) * 28;
  if (won) drawSuccessModal(now, x, y, modalWidth, ease);
  else drawFailureModal(x, y, modalWidth);
  context.restore();
}

function updatePaintAnimation(now) {
  if (!paintAnimation) return;
  while (
    paintAnimation.nextSoundIndex < paintAnimation.soundLayers.length &&
    now >= paintAnimation.soundLayers[paintAnimation.nextSoundIndex].time
  ) {
    const layer = paintAnimation.soundLayers[paintAnimation.nextSoundIndex];
    for (const [row, col] of layer.cells) changedCells.set(`${row},${col}`, layer.time);
    soundEngine.playLayer(layer.depth, paintAnimation.soundLayers.length);
    paintAnimation.nextSoundIndex += 1;
  }

  const finishAt = paintAnimation.startedAt + paintAnimation.totalDuration + PAINT_SETTLE_MS;
  if (now >= finishAt) {
    const finalStatus = paintAnimation.finalStatus;
    paintAnimation = null;
    if (finalStatus === "won") {
      soundEngine.playLevelClear();
      if (storyMode) { storySignal("won"); modalShownAt = now+2200; return; }
      confettiEffect = VictoryEffects.createConfetti(
        width,
        height,
        levelIndex,
        now,
        level.colors.map((color) => color.value),
      );
      modalShownAt = now + 820;
    } else if (finalStatus === "lost") {
      modalShownAt = now;
    }
  }
}

function draw() {
  const now = Date.now();
  if (coverVisible && coverStartedAt === null) { drawCover(now); Platform.requestAnimationFrame(draw); return; }
  updatePaintAnimation(now);
  drawBackground(now);
  drawCard();
  drawBoard(now);
  drawPalette(now);
  drawToast(now);
  drawConfetti(now);
  // Result overlay dims every gameplay layer, including the header, so the jade seal owns focus.
  drawHeader();
  drawModal(now);
  if (albumOpen && !storyMode) NightUI.album(context, nightView(now));
  drawCover(now);
  Platform.requestAnimationFrame(draw);
}

function contains(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function showToast(text, duration) {
  toast = { text, until: Date.now() + (duration || 1300) };
}

function loadLevel(nextLevelIndex) {
  if (storyMode) { nextLevelIndex = scrollStory ? levelIndex : 0; storySignal("reset"); }
  albumOpen = false;
  levelIndex = nextLevelIndex;
  level = levelPack.levels[levelIndex];
  if (paintEffectMode === "auto") paintEffectStyle = effectStyleForLevel(level.number);
  game = new Core.PaletteGame(level);
  changedCells = new Map();
  hint = null;
  toast = null;
  paintAnimation = null;
  confettiEffect = null;
  modalShownAt = 0;
  adBusy = false;
  adFeedback = null;
  layout = createLayout();
  tabGesture = null;
  revealSelectedTab();
  if (Platform.target === "browser" && globalThis.history?.replaceState) {
    const url = new URL(globalThis.location.href);
    url.searchParams.set("level", String(level.number));
    globalThis.history.replaceState(null, "", url);
  }
}

function restart() {
  loadLevel(levelIndex);
}

function setPaintEffectStyle(style) {
  if (style !== "auto" && !PAINT_EFFECT_STYLES.includes(style)) return paintEffectStyle;
  paintEffectMode = style === "auto" ? "auto" : "manual";
  paintEffectStyle = paintEffectMode === "auto" ? effectStyleForLevel(level.number) : style;
  if (Platform.target === "browser") {
    restart();
    showToast(paintEffectMode === "auto" ? `每五关一换：${PAINT_EFFECT_LABELS[paintEffectStyle]}` : `已切换：${PAINT_EFFECT_LABELS[paintEffectStyle]}`);
  }
  return paintEffectStyle;
}

function buildFloodSteps(cells,originRow,originCol,portals){
  const cellSet=new Set(cells.map(([row,col])=>`${row},${col}`)),steps=new Map(),queue=[[originRow,originCol]],ordered=[];
  steps.set(`${originRow},${originCol}`,{depth:0,parent:null});
  for(let cursor=0;cursor<queue.length;cursor++){
    const [row,col]=queue[cursor],current=steps.get(`${row},${col}`);ordered.push([row,col]);
    const neighbors=[[row-1,col],[row+1,col],[row,col-1],[row,col+1]];
    for(const pair of portals||[]){const [a,b]=pair;if(a[0]===row&&a[1]===col)neighbors.push(b);if(b[0]===row&&b[1]===col)neighbors.push(a);}
    for(const [nextRow,nextCol] of neighbors){const key=`${nextRow},${nextCol}`;if(!cellSet.has(key)||steps.has(key))continue;steps.set(key,{depth:current.depth+1,parent:[row,col]});queue.push([nextRow,nextCol]);}
  }
  return {steps,ordered,maxDepth:Math.max(0,...[...steps.values()].map(step=>step.depth))};
}

function startPaintAnimation(result, fromColor, originRow, originCol) {
  const now = Date.now();
  const cellOrder = new Map();
  result.cells.forEach(([row, col], index) => cellOrder.set(`${row},${col}`, index));
  const flood=buildFloodSteps(result.cells,originRow,originCol,level.portals);
  const stepMs=flood.maxDepth?Math.min(FLOOD_STEP_MAX_MS,(FLOOD_TOTAL_MAX_MS-CELL_INK_MS)/flood.maxDepth):FLOOD_STEP_MAX_MS;
  const startedAt=now+24;
  const soundLayers=Array.from({length:flood.maxDepth+1},(_,depth)=>({
    depth,
    time:startedAt+depth*stepMs,
    cells:flood.ordered.filter(([row,col])=>flood.steps.get(`${row},${col}`).depth===depth),
  }));
  paintAnimation = {
    cells: flood.ordered,
    cellOrder,
    steps:flood.steps,
    fromColor,
    effectStyle:paintEffectStyle,
    stepMs,
    startedAt,
    originRow,
    originCol,
    maxDepth:flood.maxDepth,
    totalDuration:flood.maxDepth*stepMs+CELL_INK_MS,
    soundLayers,
    nextSoundIndex: 0,
    finalStatus: result.status,
  };
}

async function continueWithRewardedAd() {
  if (adBusy || !shouldOfferRewardedContinue()) return;
  adBusy = true;
  adFeedback = null;
  const outcome = await rewardedAds.showRewarded();
  adBusy = false;
  if (outcome === "completed" && game.continueWithMoves(2)) {
    modalShownAt = 0;
    layout.rewardedContinueButton = null;
    layout.modalButton = null;
    showToast("已续画 2 步");
    return;
  }
  if (outcome === "dismissed") adFeedback = "完整观看后才能续画";
  else if (outcome === "busy") adFeedback = "视频正在展示，请稍候";
  else adFeedback = "暂时没有可用广告，请重新挑战";
}

function revealHint() {
  const move = game.getHint();
  if (move) {
    game.selectColor(move.color);
    hint = { ...move, until: Date.now() + 2600 };
    showToast(`试试用${level.colors[move.color].name}点击高亮色块`, 2400);
  } else {
    showToast("当前步数内没有找到解法");
  }
}

async function showHintWithRewardedAd() {
  if (adBusy || game.status !== "playing") return;
  // Browser preview has no platform ad inventory. Keep this explicit bypass
  // development-only so puzzle design and solver QA remain usable.
  if (Platform.target === "browser") {
    revealHint();
    return;
  }
  if (!rewardedAds.isConfigured()) {
    showToast("提示广告暂不可用");
    return;
  }
  adBusy = true;
  const outcome = await rewardedAds.showRewarded();
  adBusy = false;
  if (outcome === "completed" && game.status === "playing") {
    revealHint();
  } else if (outcome === "dismissed") {
    showToast("完整观看后才能获得提示");
  } else if (outcome !== "busy") {
    showToast("暂时没有可用广告");
  }
}

function handlePress(x, y) {
  if (coverVisible) return;
  if (paintAnimation || adBusy) return;

  if (!storyMode && albumOpen) {
    const index = (layout.albumTabs || []).findIndex(rect => contains(rect, x, y));
    albumOpen = false;
    if (index >= 0) loadLevel(index);
    return;
  }
  if (!storyMode && contains(layout.book, x, y)) { albumOpen = true; return; }

  const selectedTab = !storyMode && contains(layout.tabBar, x, y) ? layout.tabs.findIndex((rect) => contains(rect, x, y)) : -1;
  if (selectedTab >= 0) {
    if (selectedTab !== levelIndex) loadLevel(selectedTab);
    return;
  }
  if (contains(layout.restart, x, y)) {
    restart();
    showToast("画布已复原");
    return;
  }
  if (contains(layout.undo, x, y)) {
    if (game.undo()) {
      storySignal("reset");
      modalShownAt = 0;
      layout.modalButton = null;
      confettiEffect = null;
      changedCells = new Map();
      showToast("已撤回上一步");
    } else showToast("还没有可以撤回的步骤");
    hint = null;
    return;
  }
  if (contains(layout.sound, x, y)) {
    const enabled = soundEngine.toggle();
    showToast(enabled ? "染色音效已开启" : "染色音效已关闭");
    return;
  }

  if (game.status !== "playing") {
    if (layout.rewardedContinueButton && contains(layout.rewardedContinueButton, x, y)) {
      continueWithRewardedAd();
      return;
    }
    if (layout.modalButton && contains(layout.modalButton, x, y)) {
      if (game.status === "won" && levelIndex < levelPack.levels.length - 1) {
        loadLevel(levelIndex + 1);
      } else if (game.status === "won") {
        loadLevel(0);
      } else {
        restart();
      }
    }
    return;
  }

  if (contains(layout.hint, x, y)) {
    showHintWithRewardedAd();
    return;
  }

  for (let index = 0; index < level.colors.length; index += 1) {
    const rect = {
      x: layout.palette.x + index * (layout.palette.size + layout.palette.gap),
      y: layout.palette.y,
      w: layout.palette.size,
      h: layout.palette.size,
    };
    if (contains(rect, x, y)) {
      game.selectColor(index);
      hint = null;
      return;
    }
  }

  const board = layout.board;
  if (x >= board.x && x <= board.x + board.size && y >= board.y && y <= board.y + board.size) {
    const col = Math.floor((x - board.x) / board.cell);
    const row = Math.floor((y - board.y) / board.cell);
    const fromColor = game.board[row] && game.board[row][col];
    const result = game.paint(row, col);
    if (result.changed) {
      storySignal("paint");
      hint = null;
      startPaintAnimation(result, fromColor, row, col);
    } else if (result.reason === "same-color") {
      showToast("这片区域已经是所选颜色");
    } else if (result.reason === "blocked") {
      showToast("石墙挡住了颜料，换一片色块试试");
    }
  }
}

function handleTouchStart(event) {
  tabGesture = null;
  if (coverVisible) {
    const touch = event.touches?.length === 1 ? event.touches[0] : null;
    coverTouch = coverReady && coverStartedAt === null && touch && contains(coverGeometry().button, touch.clientX, touch.clientY) ? {x:touch.clientX,y:touch.clientY,id:touch.identifier} : null;
    return;
  }
  if (paintAnimation || event.touches?.length !== 1) return;
  const touch = event.touches && event.touches[0];
  if (!touch) return;
  if (!storyMode && !albumOpen && Platform.onTouchMove && Platform.onTouchEnd && contains(layout.tabBar, touch.clientX, touch.clientY)) {
    // A swipe must never reset a puzzle. Activate a tab only after release.
    tabGesture = { x: touch.clientX, y: touch.clientY, startScroll: tabScroll, moved: false, id: touch.identifier };
  } else handlePress(touch.clientX, touch.clientY);
}

function handleTouchMove(event) {
  if (coverVisible) {
    const touch = event.touches?.[0];
    if (!touch || event.touches.length !== 1 || !coverTouch || Math.hypot(touch.clientX-coverTouch.x,touch.clientY-coverTouch.y)>12) coverTouch = null;
    return;
  }
  if (!tabGesture) return;
  if (event.touches?.length !== 1) { tabGesture = null; return; }
  const touch = event.touches[0];
  if (touch.identifier !== tabGesture.id) return;
  const dx = touch.clientX - tabGesture.x;
  const dy = touch.clientY - tabGesture.y;
  if (Math.hypot(dx, dy) > 8) tabGesture.moved = true;
  if (tabGesture.moved && Math.abs(dx) >= Math.abs(dy)) scrollTabs(tabGesture.startScroll - dx);
}

function handleTouchEnd(event) {
  if (coverVisible) {
    const touch = event.changedTouches?.find(t => t.identifier === coverTouch?.id);
    if (coverTouch && touch && contains(coverGeometry().button,touch.clientX,touch.clientY)) coverStartedAt = Date.now();
    coverTouch = null;
    return;
  }
  const gesture = tabGesture;
  tabGesture = null;
  if (!gesture) return;
  const touch = event.changedTouches?.find((t) => t.identifier === gesture.id);
  if (!touch || gesture.moved || Math.hypot(touch.clientX - gesture.x, touch.clientY - gesture.y) > 8) return;
  if (contains(layout.tabBar, touch.clientX, touch.clientY)) handlePress(touch.clientX, touch.clientY);
}

Platform.onTouchStart(handleTouchStart);
if (Platform.onTouchMove) Platform.onTouchMove(handleTouchMove);
if (Platform.onTouchEnd) Platform.onTouchEnd(handleTouchEnd);
if (Platform.onTouchCancel) Platform.onTouchCancel(() => { tabGesture = null; coverTouch = null; });
if (Platform.onWheel) Platform.onWheel((event) => {
  if (coverVisible || storyMode || paintAnimation || !contains(layout.tabBar, event.clientX, event.clientY)) return false;
  scrollTabs(tabScroll + (Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY));
  return true;
});

if (Platform.onWindowResize) {
  Platform.onWindowResize((event) => resize(event.windowWidth, event.windowHeight));
}

if (Platform.target === "browser") {
  globalThis.__PALETTE_SET_EFFECT_STYLE__ = setPaintEffectStyle;
  globalThis.__PALETTE_GET_EFFECT_STYLE__ = () => paintEffectStyle;
  globalThis.__PALETTE_GET_EFFECT_MODE__ = () => paintEffectMode;
}

resize(width, height);
Platform.requestAnimationFrame(draw);
