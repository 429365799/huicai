"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const frequencies = [];
for (let index = 0; index < 24; index += 1) {
  const filename = path.resolve(__dirname, `../assets/audio/paint-${index}.wav`);
  const buffer = fs.readFileSync(filename);
  assert.equal(buffer.toString("ascii", 0, 4), "RIFF");
  assert.equal(buffer.toString("ascii", 8, 12), "WAVE");
  const sampleRate = buffer.readUInt32LE(24);
  const sampleCount = (buffer.length - 44) / 2;
  let upwardCrossings = 0;
  let previous = buffer.readInt16LE(44);
  for (let sampleIndex = 1; sampleIndex < sampleCount; sampleIndex += 1) {
    const current = buffer.readInt16LE(44 + sampleIndex * 2);
    if (previous <= 0 && current > 0) upwardCrossings += 1;
    previous = current;
  }
  frequencies.push(upwardCrossings / (sampleCount / sampleRate));
}

for (let index = 1; index < frequencies.length; index += 1) {
  assert.ok(frequencies[index] > frequencies[index - 1], "二十四阶染色音必须逐级升高");
}

const clearSound = fs.readFileSync(path.resolve(__dirname, "../assets/audio/level-clear.wav"));
assert.equal(clearSound.toString("ascii", 0, 4), "RIFF");
assert.equal(clearSound.toString("ascii", 8, 12), "WAVE");
assert.ok(clearSound.length > 30000, "通关音效应包含完整的短旋律");

console.log("PALETTE_SFX_TEST=PASS");
