(function (R) {
  R.Physics = {
    kick(o, x, y, force) {
      const d = Math.hypot(x, y) || 1;
      o.vx += (x / d) * force;
      o.vy += (y / d) * force;
    },
    step(s, dt, emit) {
      const c = R.Config.physics,
        a = R.Config.arena,
        pad = a.padding;
      const impact = (o, x, y, speed) => {
        if (
          speed < c.collisionThreshold ||
          s.time - o.collisionAt < c.collisionCooldown
        )
          return;
        o.collisionAt = s.time;
        emit("collision", {
          x,
          y,
          strength: Math.min(speed / 150, 1),
          color: R.OrbTypes[o.type].color,
        });
      };
      for (const o of s.orbs) {
        const v = Math.hypot(o.vx, o.vy);
        if (v > c.maxSpeed) {
          o.vx *= c.maxSpeed / v;
          o.vy *= c.maxSpeed / v;
        }
        o.vx *= Math.exp(-c.damping * dt);
        o.vy *= Math.exp(-c.damping * dt);
        if (Math.hypot(o.vx, o.vy) < c.stopSpeed) {
          o.vx = 0;
          o.vy = 0;
        }
        o.x += o.vx * dt;
        o.y += o.vy * dt;
        for (const [axis, vel, max] of [
          ["x", "vx", a.width],
          ["y", "vy", a.height],
        ]) {
          const low = pad + o.r,
            high = max - pad - o.r;
          if (o[axis] < low) {
            o[axis] = low;
            if (o[vel] < 0) {
              impact(o, o.x, o.y, Math.abs(o[vel]));
              o[vel] *= -c.restitution;
            }
          }
          if (o[axis] > high) {
            o[axis] = high;
            if (o[vel] > 0) {
              impact(o, o.x, o.y, Math.abs(o[vel]));
              o[vel] *= -c.restitution;
            }
          }
        }
      }
      // Two contact passes resolve compact groups without a heavyweight physics dependency.
      for (let pass = 0; pass < 2; pass++)
        for (let i = 0; i < s.orbs.length; i++)
          for (let j = i + 1; j < s.orbs.length; j++) {
            const a = s.orbs[i],
              b = s.orbs[j],
              dx = b.x - a.x,
              dy = b.y - a.y,
              d = Math.hypot(dx, dy),
              min = a.r + b.r;
            if (d >= min) continue;
            const nx = d ? dx / d : 1,
              ny = d ? dy / d : 0,
              over = (min - d) / 2 + 0.001;
            a.x -= nx * over;
            a.y -= ny * over;
            b.x += nx * over;
            b.y += ny * over;
            const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (rv < 0) {
              const impulse = (-(1 + c.restitution) * rv) / 2;
              a.vx -= impulse * nx;
              a.vy -= impulse * ny;
              b.vx += impulse * nx;
              b.vy += impulse * ny;
              impact(a, (a.x + b.x) / 2, (a.y + b.y) / 2, -rv);
            }
          }
      for (const o of s.orbs) {
        o.x = Math.max(pad + o.r, Math.min(a.width - pad - o.r, o.x));
        o.y = Math.max(pad + o.r, Math.min(a.height - pad - o.r, o.y));
      }
    },
  };
})(Resonance);
