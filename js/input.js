(function (R) {
  R.Input = class {
    constructor(canvas, game) {
      this.canvas = canvas;
      this.game = game;
      this.drag = null;
      canvas.addEventListener("pointerdown", (e) => this.down(e));
      canvas.addEventListener("pointermove", (e) => this.move(e));
      canvas.addEventListener("pointerup", (e) => this.up(e));
      canvas.addEventListener("pointercancel", () => this.cancel());
      canvas.addEventListener("lostpointercapture", () => {
        if (this.drag) this.cancel();
      });
      window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") this.cancel();
      });
    }
    point(e) {
      const b = this.canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - b.left) / b.width) * R.Config.arena.width,
        y: ((e.clientY - b.top) / b.height) * R.Config.arena.height,
      };
    }
    down(e) {
      const s = this.game.state;
      if (
        this.drag ||
        this.game.paused ||
        s.phase !== "ready" ||
        e.button !== 0
      )
        return;
      const p = this.point(e),
        o = s.orbs
          .filter((o) => o.state === "idle")
          .sort(
            (a, b) =>
              Math.hypot(a.x - p.x, a.y - p.y) -
              Math.hypot(b.x - p.x, b.y - p.y),
          )
          .find(
            (o) =>
              Math.hypot(o.x - p.x, o.y - p.y) <= R.Config.gameplay.hitRadius,
          );
      if (!o) return;
      e.preventDefault();
      this.canvas.setPointerCapture(e.pointerId);
      this.drag = {
        id: o.id,
        pointer: e.pointerId,
        ox: o.x,
        oy: o.y,
        x: o.x,
        y: o.y,
        offsetX: o.x - p.x,
        offsetY: o.y - p.y,
        valid: false,
      };
      this.game.audio.play("grab");
      this.game.ui.hint("Verschieben · Zurückziehen bricht ab");
    }
    move(e) {
      if (!this.drag || e.pointerId !== this.drag.pointer) return;
      e.preventDefault();
      const p = this.point(e),
        d = this.drag;
      d.x = p.x + d.offsetX;
      d.y = p.y + d.offsetY;
      d.valid = this.valid(d);
      this.game.ui.hint(
        d.valid
          ? "Loslassen zum Auslösen"
          : Math.hypot(d.x - d.ox, d.y - d.oy) < R.Config.gameplay.minDrag
            ? "Weiterziehen oder loslassen zum Abbrechen"
            : "Ungültig · Loslassen setzt zurück",
      );
    }
    valid(d) {
      const c = R.Config,
        g = c.gameplay,
        a = c.arena,
        dist = Math.hypot(d.x - d.ox, d.y - d.oy);
      if (dist < g.minDrag || dist > g.moveRadius) return false;
      if (
        d.x < a.padding + g.orbRadius ||
        d.x > a.width - a.padding - g.orbRadius ||
        d.y < a.padding + g.orbRadius ||
        d.y > a.height - a.padding - g.orbRadius
      )
        return false;
      return !this.game.state.orbs.some(
        (o) =>
          o.id !== d.id && Math.hypot(o.x - d.x, o.y - d.y) < o.r + g.orbRadius,
      );
    }
    up(e) {
      if (!this.drag || e.pointerId !== this.drag.pointer) return;
      this.move(e);
      const d = this.drag;
      this.drag = null;
      if (this.canvas.hasPointerCapture(e.pointerId))
        this.canvas.releasePointerCapture(e.pointerId);
      if (d.valid) this.game.commit(d.id, d.x, d.y);
      else {
        this.game.audio.play("cancel");
        this.game.ui.defaultHint();
      }
    }
    cancel() {
      if (!this.drag) return;
      const id = this.drag.pointer;
      this.drag = null;
      if (this.canvas.hasPointerCapture(id))
        this.canvas.releasePointerCapture(id);
      this.game.ui.defaultHint();
    }
  };
})(Resonance);
