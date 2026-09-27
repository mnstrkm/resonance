(function (R) {
  R.random = function (seed) {
    let a = seed >>> 0;
    return function () {
      a += 0x6d2b79f5;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  R.createSeed = () => {
    const a = new Uint32Array(1);
    if (globalThis.crypto?.getRandomValues) crypto.getRandomValues(a);
    else a[0] = Date.now();
    return a[0];
  };
  R.generate = function (seed) {
    const c = R.Config,
      rand = R.random(seed),
      g = c.gameplay,
      a = c.arena;
    const count = g.minOrbs + Math.floor(rand() * (g.maxOrbs - g.minOrbs + 1));
    const types = Object.keys(R.OrbTypes),
      bag = [];
    for (let i = 0; i < count; i++)
      bag.push(
        c.generator.includeEveryType && i < types.length
          ? types[i]
          : types[Math.floor(rand() * types.length)],
      );
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    const anchors = Array.from({ length: 3 }, () => ({
      x: 65 + rand() * 260,
      y: 90 + rand() * 440,
    }));
    const points = [];
    for (let id = 0; id < count; id++) {
      let best = null,
        clearance = -1;
      for (let k = 0; k < c.generator.attempts; k++) {
        const anchor = anchors[id % anchors.length];
        let x, y;
        if (k < 100) {
          x = anchor.x + (rand() - 0.5) * 190;
          y = anchor.y + (rand() - 0.5) * 190;
        } else {
          x =
            a.padding +
            g.orbRadius +
            rand() * (a.width - 2 * (a.padding + g.orbRadius));
          y =
            a.padding +
            g.orbRadius +
            rand() * (a.height - 2 * (a.padding + g.orbRadius));
        }
        if (
          x < a.padding + g.orbRadius ||
          x > a.width - a.padding - g.orbRadius ||
          y < a.padding + g.orbRadius ||
          y > a.height - a.padding - g.orbRadius
        )
          continue;
        const d = points.length
          ? Math.min(...points.map((p) => Math.hypot(p.x - x, p.y - y)))
          : Infinity;
        if (d > clearance) {
          best = { x, y };
          clearance = d;
        }
        if (d >= c.generator.minDistance) break;
      }
      if (!best || clearance < g.orbRadius * 2 + 1)
        throw new Error(
          "Zu viele Orbs für diese Arena. Anzahl oder Mindestabstand reduzieren.",
        );
      points.push({ id, ...best, type: bag[id] });
    }
    return { seed, count, orbs: points };
  };
})(Resonance);
