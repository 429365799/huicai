(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.PaletteVictoryEffects = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MAX_CONFETTI = 56;
  const EFFECT_DURATION_MS = 2300;

  function createRandom(seed) {
    let state = seed >>> 0;
    return function random() {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function createConfetti(width, height, levelIndex, startedAt, colors) {
    const random = createRandom(20260906 + levelIndex * 7919);
    const particles = [];
    const palette = colors.concat(["#FFFFFF", "#FFD86B"]);

    for (let index = 0; index < MAX_CONFETTI; index += 1) {
      const emitter = index % 2;
      const centerAngle = emitter === 0 ? -76 : -104;
      const angle = (centerAngle + (random() - 0.5) * 48) * Math.PI / 180;
      const speed = 510 + random() * 330;
      particles.push({
        originX: width * (emitter === 0 ? 0.22 : 0.78),
        originY: height + 12,
        delay: random() * 280,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        gravity: 760 + random() * 180,
        rotation: random() * Math.PI * 2,
        angularVelocity: (random() - 0.5) * 12,
        width: 5 + random() * 6,
        height: 9 + random() * 10,
        color: palette[Math.floor(random() * palette.length)],
        shape: random() < 0.22 ? "ribbon" : (random() < 0.28 ? "circle" : "paper"),
      });
    }

    return {
      startedAt,
      duration: EFFECT_DURATION_MS,
      particles,
      emitters: [width * 0.22, width * 0.78],
      groundY: height,
    };
  }

  function sampleParticle(particle, now, startedAt, duration) {
    const ageMs = now - startedAt - particle.delay;
    if (ageMs < 0 || ageMs > duration) return null;
    const time = ageMs / 1000;
    const life = ageMs / duration;
    return {
      x: particle.originX + particle.velocityX * time,
      y: particle.originY + particle.velocityY * time + 0.5 * particle.gravity * time * time,
      rotation: particle.rotation + particle.angularVelocity * time,
      alpha: life < 0.78 ? 1 : Math.max(0, (1 - life) / 0.22),
    };
  }

  return {
    EFFECT_DURATION_MS,
    MAX_CONFETTI,
    createConfetti,
    sampleParticle,
  };
});
