(function (R) {
  const TAU = Math.PI * 2;
  function circle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.01, r), 0, TAU);
  }
  R.Renderer = class {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d", { alpha: false });
      this.scaleX = 1;
      this.scaleY = 1;
      this.resize();
      new ResizeObserver(() => this.resize()).observe(canvas);
    }
    resize() {
      const box = this.canvas.getBoundingClientRect(),
        dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.max(1, Math.round(box.width * dpr));
      this.canvas.height = Math.max(1, Math.round(box.height * dpr));
      this.scaleX = this.canvas.width / R.Config.arena.width;
      this.scaleY = this.canvas.height / R.Config.arena.height;
    }
    draw(s, particles, drag) {
      const ctx = this.ctx,
        a = R.Config.arena;
      // Clear EVERY backing pixel before drawing in logical arena units.
      // Rounded CSS dimensions can differ by a pixel in their aspect ratio.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#04070f";
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.setTransform(this.scaleX, 0, 0, this.scaleY, 0, 0);
      const bg = ctx.createRadialGradient(a.width/2, a.height/2, 0, a.width/2, a.height/2, 400);
      bg.addColorStop(0, "#0f1b2d");
      bg.addColorStop(1, "#04070f");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, a.width, a.height);
      this.core(s);
      // Fine play boundary, not a tiled surface.
      ctx.strokeStyle = "rgba(215, 230, 245, 0.08)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.roundRect(15, 15, a.width - 30, a.height - 30, 28);
      ctx.stroke();
      for (let i = 0; i < 22; i++) {
        const x = 25 + ((i * 137.4) % 340),
          y = 30 + ((i * 81.37) % 560);
        ctx.globalAlpha = 0.04 + 0.04 * Math.sin(s.time * 0.4 + i);
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        circle(ctx, x, y, 0.7);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      for (const e of particles.effects) this.effect(e);
      if (drag) {
        const o = s.orbs.find((o) => o.id === drag.id);
        ctx.setLineDash([3, 5]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(205,220,231,.28)";
        circle(ctx, drag.ox, drag.oy, R.Config.gameplay.moveRadius);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = "rgba(220,230,238,.35)";
        circle(ctx, drag.ox, drag.oy, R.Config.gameplay.minDrag);
        ctx.stroke();
        ctx.globalAlpha = 0.23;
        this.orb({ ...o, x: drag.ox, y: drag.oy }, s.time);
        ctx.globalAlpha = 1;
      }
      for (const o of s.orbs)
        if (!drag || o.id !== drag.id) this.orb(o, s.time);
      if (drag) {
        const o = s.orbs.find((o) => o.id === drag.id);
        this.orb({ ...o, x: drag.x, y: drag.y }, s.time, true);
        ctx.strokeStyle = drag.valid ? "#dcebdc" : "#dc8e83";
        ctx.lineWidth = 1;
        circle(ctx, drag.x, drag.y, o.r + 6);
        ctx.stroke();
      }
      for (const p of s.projectiles) {
        ctx.save();
        const color = R.OrbTypes[p.type].color;
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 1.6;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        if (p.delay > 0) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 20, s.time * 9, s.time * 9 + 4.6);
          ctx.stroke();
        } else {
          const angle = Math.atan2(p.target.y - p.y, p.target.x - p.x);
          ctx.translate(p.x, p.y);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.moveTo(-14, -3);
          ctx.lineTo(3, 0);
          ctx.lineTo(-14, 3);
          ctx.stroke();
          circle(ctx, 0, 0, 2);
          ctx.fill();
        }
        ctx.restore();
      }
      for (const p of particles.items) {
        ctx.globalAlpha = (1 - p.age / p.life) * 0.75;
        ctx.fillStyle = p.color;
        circle(ctx, p.x, p.y, p.size);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (s.phase === "complete") {
        const t = s.completeTime,
          d = R.Config.effects.completeDuration;
        ctx.globalAlpha = Math.max(
          0,
          0.1 * Math.sin(Math.min(1, t / d) * Math.PI),
        );
        ctx.fillStyle = "#e8dfc9";
        ctx.fillRect(0, 0, a.width, a.height);
        ctx.globalAlpha = 1;
      }
    }
    core(s) {
      const ctx = this.ctx,
        a = R.Config.arena,
        x = a.width / 2,
        y = a.height / 2,
        fill = s.required > 0 ? Math.min(1, s.energy / s.required) : 0,
        pulse = R.Config.effects.reducedMotion ? 0 : Math.sin(s.time * 0.6) * 3;
      // Light only: no rim, shell, drop shadow or collision body.
      const colors = s.orbs
        .filter((o) => o.state === "spent")
        .map((o) => R.OrbTypes[o.copied || o.type]?.color || "#cbd5ee");
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      for (let i = 0; i < 3; i++) {
        const angle =
            (i * TAU) / 3 +
            s.time * (R.Config.effects.reducedMotion ? 0 : 0.08);
        const cx = x + Math.cos(angle) * 18,
          cy = y + Math.sin(angle) * 18;
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120 + pulse);
        const color = colors.length
          ? colors[Math.floor((i * colors.length) / 3) % colors.length]
          : ["#475569", "#334155", "#475569"][i];
        glow.addColorStop(0, color);
        glow.addColorStop(1, "transparent");
        ctx.globalAlpha = 0.035 + fill * 0.08;
        ctx.fillStyle = glow;
        ctx.fillRect(cx - 130, cy - 130, 260, 260);
      }
      const center = ctx.createRadialGradient(x, y, 0, x, y, 50);
      center.addColorStop(0, "#e2e8f0");
      center.addColorStop(1, "transparent");
      ctx.fillStyle = center;
      ctx.globalAlpha = 0.015 + fill * 0.14;
      ctx.fillRect(x - 60, y - 60, 120, 120);
      ctx.restore();
      // Broken, faint filaments help charge read without making a physical object.
      ctx.save();
      ctx.globalAlpha = 0.025 + fill * 0.075;
      ctx.strokeStyle = "#dbe4dc";
      ctx.lineWidth = 0.7;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(
          x,
          y,
          34 + i * 13,
          16 + i * 9,
          i * 0.9 + s.time * 0.015,
          0.3,
          4.2,
        );
        ctx.stroke();
      }
      ctx.restore();
    }
    orb(o, time, lift = false) {
      const ctx = this.ctx,
        t = R.OrbTypes[o.type],
        spent = o.state === "spent",
        charging = o.state === "charging",
        color = t.color,
        r = o.r * (lift ? 1.1 : 1);
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.fillStyle = "rgba(0,0,0,.4)";
      ctx.beginPath();
      ctx.ellipse(0, lift ? 10 : 5, r * 0.95, r * 0.65, 0, 0, TAU);
      ctx.fill();
      if (charging || (o.boost > 1 && !spent)) {
        const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 2.8);
        glow.addColorStop(0, (o.boost > 1 ? "#f5a66c" : color) + "77");
        glow.addColorStop(1, "transparent");
        ctx.globalAlpha = R.Config.effects.glow;
        ctx.fillStyle = glow;
        circle(ctx, 0, 0, r * 2.8);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      const g = ctx.createLinearGradient(-r, -r, r, r);
      g.addColorStop(0, spent ? "#1e293b" : color);
      g.addColorStop(0.6, spent ? "#0f172a" : color + "b8");
      g.addColorStop(1, "#020617");
      ctx.fillStyle = g;
      circle(ctx, 0, 0, r);
      ctx.fill();
      if (!spent) {
        const inner = ctx.createRadialGradient(
          -r * 0.15,
          -r * 0.2,
          0,
          0,
          0,
          r * 0.9,
        );
        inner.addColorStop(0, color + "66");
        inner.addColorStop(1, "transparent");
        ctx.fillStyle = inner;
        circle(ctx, 0, 0, r * 0.9);
        ctx.fill();
        const motion = R.Config.effects.reducedMotion
          ? o.id
          : time * 0.35 + o.id;
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.strokeStyle = "#fff8e7";
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.7, r * 0.35, motion, 0, Math.PI * 1.5);
        ctx.stroke();
        ctx.restore();
      }
      ctx.strokeStyle = spent ? color + "33" : color + "bb";
      ctx.lineWidth = 0.8;
      ctx.stroke();
      if (!spent) {
        ctx.strokeStyle = "#ffffff55";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(-1, -1, r - 2.5, 3.6, 4.9);
        ctx.stroke();
      }
      ctx.globalAlpha = spent ? 0.19 : 0.85;
      ctx.strokeStyle = charging
        ? "#ffffff"
        : color === "#dddce9"
          ? "#ffffff"
          : "#f8fafc";
      ctx.lineWidth = 1.1;
      const symbol = t.symbol;
      ctx.beginPath();
      if (symbol === "expand") {
        ctx.moveTo(-4, 0);
        ctx.lineTo(4, 0);
        ctx.moveTo(0, -4);
        ctx.lineTo(0, 4);
      }
      if (symbol === "inward") {
        ctx.arc(0, 0, 4, 0, TAU);
      }
      if (symbol === "pulse") {
        ctx.arc(0, 0, 4, 0.4, 2.6);
        ctx.moveTo(-3.7, -1.5);
        ctx.arc(0, 0, 4, 3.5, 5.7);
      }
      if (symbol === "arrow") {
        ctx.moveTo(-3, -4);
        ctx.lineTo(3, 0);
        ctx.lineTo(-3, 4);
      }
      if (symbol === "spark") {
        ctx.arc(0, 0, 4.4, -0.8, 4.4);
        ctx.quadraticCurveTo(0, -3.4, 2, -0.8);
      }
      if (symbol === "aura") {
        ctx.arc(0, 0, 3, 0, TAU);
        ctx.moveTo(6, 0);
        ctx.arc(0, 0, 6, 0, TAU);
      }
      if (symbol === "diamond") {
        ctx.moveTo(0, -5);
        ctx.lineTo(4, 0);
        ctx.lineTo(0, 5);
        ctx.lineTo(-4, 0);
        ctx.closePath();
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      if (o.copied) {
        ctx.globalAlpha = spent ? 0.19 : 1;
        ctx.fillStyle = R.OrbTypes[o.copied].color;
        circle(ctx, 0, 0, 2.5);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (charging) {
        const progress =
          1 - Math.max(0, o.timer) / R.Config.gameplay.chargeTime;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, r + 4, -Math.PI / 2, -Math.PI / 2 + TAU * progress);
        ctx.stroke();
        ctx.fillStyle = "#fff4da";
        circle(ctx, 0, 0, 1.5 + progress * 1.5);
        ctx.fill();
      }
      ctx.restore();
    }
    effect(e) {
      const ctx = this.ctx,
        t = e.age / e.life,
        color = e.color || "#dddccf";
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.globalAlpha = (1 - t) * 0.55;
      ctx.lineWidth = 1;
      if (e.name === "energy") {
        const k = 1 - (1 - t) ** 2,
          x = e.x + (R.Config.arena.width / 2 - e.x) * k,
          y = e.y + (R.Config.arena.height / 2 - e.y) * k;
        ctx.globalAlpha = Math.sin(t * Math.PI) * 0.8;
        circle(ctx, x, y, 2);
        ctx.fill();
      } else if (e.name === "complete") {
        ctx.globalAlpha = (1 - t) * 0.3;
        ctx.lineWidth = 4 * (1 - t) + 0.5;
        circle(
          ctx,
          R.Config.arena.width / 2,
          R.Config.arena.height / 2,
          t * Math.hypot(R.Config.arena.width, R.Config.arena.height) * 0.6,
        );
        ctx.stroke();
      } else if (e.name === "collision") {
        ctx.lineWidth = 1.5 * (1 - t) + 0.5;
        circle(ctx, e.x, e.y, 2 + t * 9);
        ctx.stroke();
      } else if (e.name === "ability" || e.name === "burst") {
        ctx.lineWidth = 2 * (1 - t) + 0.5;
        if (["green", "gold"].includes(e.type)) {
          circle(ctx, e.x, e.y, 8 + t * 13);
          ctx.stroke();
        } else {
          const inward =
            e.type === "blue" || (e.type === "violet" && e.name !== "burst");
          const size = R.Config.effects.reducedMotion
            ? e.radius * 0.6
            : inward
              ? e.radius * (1 - t)
              : e.radius * (1 - (1 - t) ** 3);
          circle(ctx, e.x, e.y, size);
          ctx.stroke();
          ctx.globalAlpha *= 0.12;
          ctx.fill();
        }
      }
      ctx.restore();
    }
  };
})(Resonance);
