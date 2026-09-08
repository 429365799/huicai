"use strict";

const assert = require("node:assert/strict");
const VictoryEffects = require("../src/victory-effects.js");

const colors = ["#F56C62", "#439DF0", "#F3C557", "#55C49B"];
const effect = VictoryEffects.createConfetti(390, 844, 1, 1000, colors);
assert.equal(effect.particles.length, VictoryEffects.MAX_CONFETTI, "彩带粒子必须受数量上限约束");
assert.equal(effect.emitters.length, 2, "彩带应从地面左右两束喷出");
assert.ok(effect.particles.every((particle) => particle.originY > 844));

const first = effect.particles[0];
const airborne = VictoryEffects.sampleParticle(first, 1000 + first.delay + 300, 1000, effect.duration);
assert.ok(airborne.y < first.originY, "彩带早期运动方向必须向上");
assert.ok(airborne.alpha > 0);

const duplicate = VictoryEffects.createConfetti(390, 844, 1, 1000, colors);
assert.deepEqual(effect.particles, duplicate.particles, "相同关卡的彩带参数应可复现");

console.log("PALETTE_VICTORY_EFFECTS_TEST=PASS");
