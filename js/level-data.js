(function (R) {
  const copy = (value) => JSON.parse(JSON.stringify(value));
  R.LevelData = {
    formatVersion: 1,
    maxOrbs: 100,
    empty() {
      return { seed: R.createSeed(), count: 0, orbs: [] };
    },
    validPosition(orbs, x, y, ignoreId = null) {
      const a = R.Config.arena,
        r = R.Config.gameplay.orbRadius;
      return (
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        x >= a.padding + r &&
        x <= a.width - a.padding - r &&
        y >= a.padding + r &&
        y <= a.height - a.padding - r &&
        !orbs.some(
          (o) => o.id !== ignoreId && Math.hypot(o.x - x, o.y - y) < 2 * r,
        )
      );
    },
    validate(value) {
      if (
        !value ||
        !Array.isArray(value.orbs) ||
        value.orbs.length > this.maxOrbs ||
        !Number.isInteger(value.seed) ||
        value.seed < 0 ||
        value.seed > 4294967295
      )
        return null;
      const orbs = [];
      for (const o of value.orbs) {
        if (
          !o ||
          !Object.hasOwn(R.OrbTypes, o.type) ||
          !this.validPosition(orbs, o.x, o.y)
        )
          return null;
        orbs.push({ id: orbs.length, type: o.type, x: o.x, y: o.y });
      }
      return { seed: value.seed, count: orbs.length, orbs };
    },
    // Explicit positions and the gameplay seed survive changes to the generator.
    export(layout) {
      const clean = this.validate(layout);
      if (!clean || !clean.count)
        throw new Error("Bitte zuerst Orbs platzieren.");
      return {
        format: "resonanz-level",
        formatVersion: this.formatVersion,
        gameVersion: R.version,
        name: "Eigenes Feld",
        arena: copy(R.Config.arena),
        layout: clean,
        rules: { impulses: R.Config.gameplay.impulses, target: "all" },
        balance: {
          gameplay: copy(R.Config.gameplay),
          abilities: copy(R.Config.abilities),
          physics: copy(R.Config.physics),
        },
      };
    },
  };
})(Resonance);
