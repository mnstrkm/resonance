(function (R) {
  // Modi entscheiden Aufbau, Zugbudget und Ergebnis. Physik und Darstellung bleiben gleich.
  R.Modes = {
    resonance: {
      name: "Freies Spiel",
      create: (seed) => R.generate(seed),
      requiredEnergy: (n) => Math.ceil(n * R.Config.gameplay.requiredRatio),
      impulses: () => R.Config.gameplay.impulses,
      outcome: (state) =>
        state.energy >= state.required
          ? "won"
          : state.impulses <= 0
            ? "lost"
            : "continue",
    },
  };
  R.Modes.editor = {
    ...R.Modes.resonance,
    name: "Eigenes Feld",
    create: () => R.LevelData.empty(),
    requiredEnergy: (n) => n,
  };
  R.Modes.level = {
    ...R.Modes.resonance,
    name: "Level",
    create: (seed, snapshot) => snapshot,
    requiredEnergy: (n) => n, // Alle Orbs müssen aktiviert werden
  };
  
  R.Stars = function(state) {
    if (state.energy < state.required) return 0;
    const used = state.initialImpulses - state.impulses;
    if (used <= 1) return 3;
    if (used === 2) return 2;
    return 1;
  };
  R.createState = function (seed, mode = "resonance", snapshot = null) {
    const layout = snapshot || R.Modes[mode].create(seed);
    return {
      seed: layout.seed,
      mode,
      snapshot: JSON.parse(JSON.stringify(layout)),
      orbs: layout.orbs.map((o) => ({
        ...o,
        vx: 0,
        vy: 0,
        r: R.Config.gameplay.orbRadius,
        state: "idle",
        timer: 0,
        boost: 1,
        rangeBoost: 1,
        copied: null,
        reserved: false,
        collisionAt: -10,
      })),
      energy: 0,
      required: R.Modes[mode].requiredEnergy(layout.count),
      impulses: R.Modes[mode].impulses(),
      initialImpulses: R.Modes[mode].impulses(),
      phase: "ready",
      time: 0,
      quiet: 0,
      chainCount: 0,
      completeTime: 0,
      jobs: [],
      projectiles: [],
      rand: R.random(layout.seed ^ 0x9e3779b9),
      modeData: {},
    };
  };
})(Resonance);
