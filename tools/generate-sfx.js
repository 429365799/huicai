"use strict";

const fs = require("node:fs");
const path = require("node:path");

const outputDirectory = path.resolve(__dirname, "../assets/audio");
const sampleRate = 24000;
const durationSeconds = 0.13;
// Twenty-four smooth steps over the original C5-to-G6 register. Keeping the
// range fixed preserves the warm timbre instead of adding a shrill octave.
const frequencies = Array.from({ length: 24 }, (_, index) => 523.25 * Math.pow(3, index / 23));

function writeAscii(buffer, offset, value) {
  buffer.write(value, offset, value.length, "ascii");
}

function createTone(frequency) {
  const sampleCount = Math.floor(sampleRate * durationSeconds);
  const dataSize = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  writeAscii(buffer, 0, "RIFF");
  buffer.writeUInt32LE(36 + dataSize, 4);
  writeAscii(buffer, 8, "WAVE");
  writeAscii(buffer, 12, "fmt ");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  writeAscii(buffer, 36, "data");
  buffer.writeUInt32LE(dataSize, 40);

  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate;
    const attack = Math.min(1, time / 0.008);
    const decay = Math.pow(1 - index / sampleCount, 2.5);
    const fundamental = Math.sin(2 * Math.PI * frequency * time);
    const overtone = Math.sin(2 * Math.PI * frequency * 2 * time) * 0.22;
    const sample = Math.max(-1, Math.min(1, (fundamental + overtone) * attack * decay * 0.45));
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + index * 2);
  }

  return buffer;
}

function createLevelClear() {
  const totalDuration = 0.82;
  const notes = [
    { start: 0.00, duration: 0.22, frequency: 523.25 },
    { start: 0.13, duration: 0.24, frequency: 659.25 },
    { start: 0.26, duration: 0.26, frequency: 783.99 },
    { start: 0.41, duration: 0.38, frequency: 1046.50 },
    { start: 0.43, duration: 0.36, frequency: 1318.51 },
  ];
  const sampleCount = Math.floor(sampleRate * totalDuration);
  const dataSize = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  writeAscii(buffer, 0, "RIFF");
  buffer.writeUInt32LE(36 + dataSize, 4);
  writeAscii(buffer, 8, "WAVE");
  writeAscii(buffer, 12, "fmt ");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  writeAscii(buffer, 36, "data");
  buffer.writeUInt32LE(dataSize, 40);

  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate;
    let sample = 0;
    for (const note of notes) {
      const noteTime = time - note.start;
      if (noteTime < 0 || noteTime > note.duration) continue;
      const attack = Math.min(1, noteTime / 0.012);
      const decay = Math.pow(1 - noteTime / note.duration, 1.8);
      sample += (
        Math.sin(2 * Math.PI * note.frequency * noteTime) +
        Math.sin(2 * Math.PI * note.frequency * 2 * noteTime) * 0.16
      ) * attack * decay * 0.19;
    }
    buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32767), 44 + index * 2);
  }

  return buffer;
}

fs.mkdirSync(outputDirectory, { recursive: true });
frequencies.forEach((frequency, index) => {
  fs.writeFileSync(path.join(outputDirectory, `paint-${index}.wav`), createTone(frequency));
});
fs.writeFileSync(path.join(outputDirectory, "level-clear.wav"), createLevelClear());

console.log(`PALETTE_SFX_GENERATED=${frequencies.length + 1}`);
