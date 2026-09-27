(function (R) {
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  R.Chain = class {
    constructor(state, emit) {
      this.s = state;
      this.emit = emit;
    }
    ability(o) {
      return o.type === "pearl" ? o.copied : o.type;
    }
    activate(o, source = null, boost = 1) {
      if (o.state !== "idle") return false;
      o.state = "charging";
      o.timer = R.Config.gameplay.chargeTime;
      o.reserved = false;
      o.boost = boost;
      if (o.type === "pearl") o.copied = source;
      this.emit("charge", {
        x: o.x,
        y: o.y,
        color: R.OrbTypes[source || o.type]?.color || "#ddd",
        type: o.type,
      });
      return true;
    }
    radial(o, type, radius, force = 0, boost = 1) {
      for (const target of this.s.orbs) {
        if (target === o || distance(o, target) > radius) continue;
        if (force)
          R.Physics.kick(
            target,
            target.x - o.x,
            target.y - o.y,
            force * (0.45 + 0.55 * (1 - distance(o, target) / radius)),
          );
        this.activate(target, type, boost);
      }
    }
    emitAbility(o, type, radius) {
      this.emit("ability", {
        x: o.x,
        y: o.y,
        type,
        color: R.OrbTypes[type].color,
        radius,
        boost: o.boost,
      });
    }
    fire(o) {
      const s = this.s,
        type = this.ability(o),
        c = R.Config.abilities;
      o.state = "spent";
      s.energy += R.Config.gameplay.coreEnergy;
      s.chainCount++;
      this.emit("energy", {
        x: o.x,
        y: o.y,
        color: R.OrbTypes[type || o.type].color,
        index: s.chainCount,
      });
      if (!type) {
        this.emit("empty", { x: o.x, y: o.y, color: R.OrbTypes.pearl.color });
        return;
      }
      const handler = R.Abilities[type];
      if (handler) handler(this, o, c[type]);
    }
    projectile(o, target, type) {
      if (!target) return;
      target.reserved = true;
      const c = R.Config.abilities,
        delay = type === "gold" ? c.gold.searchTime : 0;
      this.s.projectiles.push({
        type,
        source: o,
        target,
        x: o.x,
        y: o.y,
        sx: o.x,
        sy: o.y,
        delay,
        age: 0,
        boost: o.boost,
      });
      if (type === "green")
        R.Physics.kick(o, o.x - target.x, o.y - target.y, c.green.recoil);
    }
    step(dt) {
      const s = this.s;
      // Snapshot timers before firing: targets activated this tick receive their full charge interval.
      const charging = s.orbs.filter((o) => o.state === "charging");
      for (const o of charging) o.timer -= dt;
      for (const o of charging) if (o.timer <= 0) this.fire(o);
      for (let i = s.jobs.length - 1; i >= 0; i--) {
        const job = s.jobs[i];
        job.left -= dt;
        if (job.left <= 0) {
          s.jobs.splice(i, 1);
          job.run();
        }
      }
      for (let i = s.projectiles.length - 1; i >= 0; i--) {
        const p = s.projectiles[i];
        p.age += dt;
        if (p.delay > 0) {
          p.delay -= dt;
          p.x = p.source.x;
          p.y = p.source.y;
          continue;
        }
        const dx = p.target.x - p.x,
          dy = p.target.y - p.y,
          d = Math.hypot(dx, dy);
        const speed =
          p.type === "green"
            ? R.Config.abilities.green.speed
            : Math.max(
                240,
                Math.hypot(p.target.x - p.sx, p.target.y - p.sy) /
                  R.Config.abilities.gold.travelTime,
              );
        if (d <= speed * dt + p.target.r) {
          if (p.type === "green")
            R.Physics.kick(
              p.target,
              dx,
              dy,
              R.Config.abilities.green.force * p.boost,
            );
          this.activate(p.target, p.type);
          p.target.reserved = false;
          this.emit("hit", {
            x: p.target.x,
            y: p.target.y,
            type: p.type,
            color: R.OrbTypes[p.type].color,
          });
          s.projectiles.splice(i, 1);
        } else {
          p.x += (dx / d) * speed * dt;
          p.y += (dy / d) * speed * dt;
        }
      }
    }
    busy() {
      return (
        this.s.orbs.some((o) => o.state === "charging") ||
        this.s.jobs.length > 0 ||
        this.s.projectiles.length > 0
      );
    }
  };
  R.Abilities = {
    red(chain, o, c) {
      chain.emitAbility(o, "red", c.radius);
      chain.radial(o, "red", c.radius, c.force * o.boost);
    },
    blue(chain, o, c) {
      chain.emitAbility(o, "blue", c.radius);
      chain.radial(o, "blue", c.radius, -c.force * o.boost);
    },
    violet(chain, o, c) {
      chain.emitAbility(o, "violet", c.radius);
      for (const t of chain.s.orbs)
        if (t !== o && distance(o, t) <= c.radius)
          R.Physics.kick(t, t.x - o.x, t.y - o.y, -c.force * o.boost);
      chain.s.jobs.push({
        left: c.pullTime,
        run: () => {
          chain.emit("burst", {
            x: o.x,
            y: o.y,
            type: "violet",
            color: R.OrbTypes.violet.color,
            radius: c.radius,
          });
          chain.radial(o, "violet", c.radius, c.burstForce * o.boost);
        },
      });
    },
    green(chain, o, c) {
      chain.emitAbility(o, "green", c.radius);
      const targets = chain.s.orbs
        .filter(
          (t) =>
            t !== o &&
            t.state === "idle" &&
            !t.reserved &&
            distance(o, t) <= c.radius,
        )
        .sort((a, b) => distance(o, a) - distance(o, b) || a.id - b.id);
      chain.projectile(o, targets[0], "green");
    },
    gold(chain, o) {
      chain.emitAbility(o, "gold", 0);
      const targets = chain.s.orbs.filter(
        (t) => t !== o && t.state === "idle" && !t.reserved,
      );
      if (targets.length)
        chain.projectile(
          o,
          targets[Math.floor(chain.s.rand() * targets.length)],
          "gold",
        );
    },
    orange(chain, o, c) {
      chain.emitAbility(o, "orange", c.radius);
      chain.radial(o, "orange", c.radius, 0, c.multiplier);
    },
  };
})(Resonance);
