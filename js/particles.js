(function (R) {
  R.Particles = class {
    constructor() {
      this.items = [];
      this.effects = [];
    }
    clear() {
      this.items = [];
      this.effects = [];
    }
    emit(name, d) {
      const c = R.Config.effects;
      const radius = d.radius || 28;
      this.effects.push({
        name,
        ...d,
        radius,
        age: 0,
        life:
          name === "energy"
            ? c.trailTime
            : name === "complete"
              ? 2
              : name === "ability" && d.type === "blue"
                ? 0.65
                : 0.65,
      });
      if (this.effects.length > c.maxEffects) this.effects.shift();
      if (c.reducedMotion || ["charge", "energy", "full"].includes(name))
        return;
      const count =
        name === "collision" ? 3 : name === "complete" ? 40 : c.particles;
      for (let i = 0; i < count && this.items.length < c.maxParticles; i++) {
        const angle = Math.random() * Math.PI * 2,
          speed =
            name === "collision"
              ? 15 + Math.random() * 30
              : 20 + Math.random() * 60;
        this.items.push({
          x: d.x,
          y: d.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          age: 0,
          life: 0.3 + Math.random() * 0.55,
          size: 0.6 + Math.random() * 1.2,
          color: d.color || "#dcd6b9",
        });
      }
    }
    step(dt) {
      for (const p of this.items) {
        p.age += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= Math.exp(-2 * dt);
        p.vy *= Math.exp(-2 * dt);
      }
      this.items = this.items.filter((p) => p.age < p.life);
      for (const e of this.effects) e.age += dt;
      this.effects = this.effects.filter((e) => e.age < e.life);
    }
  };
})(Resonance);
