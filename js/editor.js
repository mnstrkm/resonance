(function (R) {
  const KEY = "resonance.editor.draft.v1";
  const copy = (value) => JSON.parse(JSON.stringify(value));
  R.Editor = class {
    constructor(game) {
      this.game = game;
      this.layout = R.LevelData.empty();
      this.history = [];
      this.selected = null;
      this.type = null;
      this.drag = null;
      this.availableStorage = true;
      this.creator =
        new URLSearchParams(location.search).get("creator") === "1";
      try {
        const data = localStorage.getItem(KEY);
        if (data)
          this.layout = R.LevelData.validate(JSON.parse(data)) || this.layout;
      } catch (_) {
        this.availableStorage = false;
      }
      this.refresh();
    }
    refresh() {
      this.layout.count = this.layout.orbs.length;
      this.preview = R.createState(this.layout.seed, "editor", this.layout);
      this.game.ui?.updateEditor();
    }
    persist() {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.layout));
        this.availableStorage = true;
      } catch (_) {
        this.availableStorage = false;
      }
    }
    remember() {
      this.history.push(copy(this.layout));
      if (this.history.length > 40) this.history.shift();
    }
    changed() {
      this.layout.count = this.layout.orbs.length;
      this.persist();
      this.refresh();
    }
    add(type, x, y) {
      if (
        !Object.hasOwn(R.OrbTypes, type) ||
        this.layout.count >= R.LevelData.maxOrbs ||
        !R.LevelData.validPosition(this.layout.orbs, x, y)
      )
        return false;
      this.remember();
      const id = Math.max(-1, ...this.layout.orbs.map((o) => o.id)) + 1;
      this.layout.orbs.push({ id, type, x, y });
      this.selected = id;
      this.changed();
      return true;
    }
    move(id, x, y) {
      const o = this.layout.orbs.find((o) => o.id === id);
      if (!o || !R.LevelData.validPosition(this.layout.orbs, x, y, id))
        return false;
      if (o.x === x && o.y === y) return true;
      this.remember();
      o.x = x;
      o.y = y;
      this.changed();
      return true;
    }
    remove() {
      if (!this.layout.orbs.some((o) => o.id === this.selected)) return;
      this.remember();
      this.layout.orbs = this.layout.orbs.filter((o) => o.id !== this.selected);
      this.selected = null;
      this.changed();
    }
    reset() {
      if (!this.layout.count) return;
      this.remember();
      this.layout.orbs = [];
      this.selected = null;
      this.changed();
    }
    undo() {
      if (!this.history.length) return;
      this.layout = this.history.pop();
      this.selected = null;
      this.changed();
    }
    snapshot() {
      return copy(this.layout);
    }
    download(filename) {
      const payload = R.LevelData.export(this.layout);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(payload, null, 2)], {
          type: "application/json",
        }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = (filename || "resonanz-level-" + this.layout.seed.toString(36)) + ".json";
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    addGuide(type) {
      if (!this.guides) this.guides = [];
      if (type === "line") this.guides.push({ id: 'g' + Date.now(), type: 'line', x: 195, y: 310, angle: 0 });
      if (type === "circle") this.guides.push({ id: 'g' + Date.now(), type: 'circle', x: 195, y: 310, r: 100 });
      this.refresh();
    }
    resetGuides() {
      this.guides = [];
      this.refresh();
    }
    point(e) {
      return this.game.input.point(e);
    }
    down(e) {
      if (e.button !== 0 || this.drag) return;
      const p = this.point(e);
      const o = this.layout.orbs
        .slice()
        .sort(
          (a, b) =>
            Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y),
        )
        .find(
          (o) =>
            Math.hypot(o.x - p.x, o.y - p.y) <= R.Config.gameplay.hitRadius,
        );
      if (!o && this.guides) {
        for (let i = this.guides.length - 1; i >= 0; i--) {
          const g = this.guides[i];
          if (g.type === "circle") {
            if (Math.hypot(g.x - p.x, g.y - p.y) < 20) {
              this.drag = { pointer: e.pointerId, kind: 'guide_move', g, offsetX: g.x - p.x, offsetY: g.y - p.y, valid: true }; break;
            }
            if (Math.abs(Math.hypot(g.x - p.x, g.y - p.y) - g.r) < 20) {
              this.drag = { pointer: e.pointerId, kind: 'guide_resize', g, valid: true }; break;
            }
          } else if (g.type === "line") {
            if (Math.hypot(g.x - p.x, g.y - p.y) < 20) {
              this.drag = { pointer: e.pointerId, kind: 'guide_move', g, offsetX: g.x - p.x, offsetY: g.y - p.y, valid: true }; break;
            }
            const dx = p.x - g.x, dy = p.y - g.y;
            const dist = Math.abs(-Math.sin(g.angle)*dx + Math.cos(g.angle)*dy);
            if (dist < 20 && Math.hypot(dx, dy) > 20) {
              this.drag = { pointer: e.pointerId, kind: 'guide_rotate', g, valid: true }; break;
            }
          }
        }
      }
      e.preventDefault();
      const canvas = this.game.input.canvas;
      canvas.setPointerCapture(e.pointerId);
      this.selected = o?.id ?? null;
      this.drag = {
        pointer: e.pointerId,
        element: canvas,
        kind: o ? "move" : "add",
        id: o?.id,
        type: o?.type || this.type,
        offsetX: o ? o.x - p.x : 0,
        offsetY: o ? o.y - p.y : 0,
        x: o?.x ?? p.x,
        y: o?.y ?? p.y,
        valid: false,
      };
      this.updateDrag(e);
      this.game.ui.updateEditor();
    }
    fromPalette(e, type, button) {
      if (e.button !== 0 || this.drag || this.game.ui.nav.route.panel) return;
      e.preventDefault();
      this.type = type;
      this.selected = null;
      button.setPointerCapture(e.pointerId);
      this.drag = {
        pointer: e.pointerId,
        element: button,
        kind: "add",
        type,
        offsetX: 0,
        offsetY: 0,
        x: -100,
        y: -100,
        valid: false,
        palette: true,
        startX: e.clientX,
        startY: e.clientY,
      };
      this.game.ui.updateEditor();
    }
    updateDrag(e) {
      if (!this.drag || e.pointerId !== this.drag.pointer) return;
      const p = this.point(e),
        d = this.drag;
      d.x = p.x + d.offsetX;
      d.y = p.y + d.offsetY;
      
      if (d.kind === 'guide_move') {
        d.g.x = d.x; d.g.y = d.y;
        this.game.ui.updateEditor(); return;
      }
      if (d.kind === 'guide_resize') {
        d.g.r = Math.max(10, Math.hypot(p.x - d.g.x, p.y - d.g.y));
        this.game.ui.updateEditor(); return;
      }
      if (d.kind === 'guide_rotate') {
        d.g.angle = Math.atan2(p.y - d.g.y, p.x - d.g.x);
        this.game.ui.updateEditor(); return;
      }

      if (this.guides && (d.kind === 'move' || d.kind === 'add')) {
        for (const g of this.guides) {
          if (g.type === "circle") {
            const dist = Math.hypot(d.x - g.x, d.y - g.y);
            if (Math.abs(dist - g.r) < 20) {
               d.x = g.x + (d.x - g.x) / dist * g.r;
               d.y = g.y + (d.y - g.y) / dist * g.r;
               break;
            }
          } else if (g.type === "line") {
            const dx = d.x - g.x, dy = d.y - g.y;
            const distLine = Math.abs(-Math.sin(g.angle)*dx + Math.cos(g.angle)*dy);
            if (distLine < 20) {
               const t = dx*Math.cos(g.angle) + dy*Math.sin(g.angle);
               d.x = g.x + t*Math.cos(g.angle);
               d.y = g.y + t*Math.sin(g.angle);
               break;
            }
          }
        }
      }

      const paletteBounds = d.palette
        ? d.element.parentElement.getBoundingClientRect()
        : null;
      const overPalette =
        paletteBounds &&
        e.clientX >= paletteBounds.left &&
        e.clientX <= paletteBounds.right &&
        e.clientY >= paletteBounds.top &&
        e.clientY <= paletteBounds.bottom;
      d.valid =
        (!d.palette ||
          (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 6 &&
            !overPalette)) &&
        !!d.type &&
        R.LevelData.validPosition(
          this.layout.orbs,
          d.x,
          d.y,
          d.kind === "move" ? d.id : null,
        );
    }
    up(e) {
      if (!this.drag || e.pointerId !== this.drag.pointer) return;
      this.updateDrag(e);
      const d = this.drag;
      this.cancel();
      if (d.palette) {
        document.getElementById("orb-palette").hidden = true;
        document
          .getElementById("palette-toggle")
          .setAttribute("aria-expanded", "false");
      }
      if (d.valid) {
        if (d.kind === "move") this.move(d.id, d.x, d.y);
        else this.add(d.type, d.x, d.y);
      }
      this.game.ui.updateEditor();
    }
    cancel() {
      const d = this.drag;
      this.drag = null;
      if (d?.element.hasPointerCapture?.(d.pointer))
        d.element.releasePointerCapture(d.pointer);
    }
    draw(renderer) {
      const ctx = renderer.ctx;
      if (this.guides) {
        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.4)";
        ctx.setLineDash([5, 5]);
        for (const g of this.guides) {
          ctx.beginPath();
          if (g.type === "circle") {
            ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
            ctx.rect(g.x - 3, g.y - 3, 6, 6);
            ctx.rect(g.x + g.r - 3, g.y - 3, 6, 6);
          } else if (g.type === "line") {
            const dx = Math.cos(g.angle) * 1000;
            const dy = Math.sin(g.angle) * 1000;
            ctx.moveTo(g.x - dx, g.y - dy);
            ctx.lineTo(g.x + dx, g.y + dy);
            ctx.rect(g.x - 3, g.y - 3, 6, 6);
            const hx = g.x + Math.cos(g.angle) * 100;
            const hy = g.y + Math.sin(g.angle) * 100;
            ctx.rect(hx - 3, hy - 3, 6, 6);
          }
          ctx.stroke();
        }
        ctx.restore();
      }
      if (this.selected !== null) {
        const o = this.layout.orbs.find((o) => o.id === this.selected);
        if (o) {
          ctx.save();
          ctx.strokeStyle = "#d8cfba88";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(o.x, o.y, R.Config.gameplay.orbRadius + 5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
      const d = this.drag;
      if (!d?.type) return;
      ctx.save();
      ctx.globalAlpha = 0.65;
      renderer.orb(
        {
          id: d.id ?? 0,
          type: d.type,
          x: d.x,
          y: d.y,
          r: R.Config.gameplay.orbRadius,
          state: "idle",
          boost: 1,
        },
        this.preview.time,
      );
      ctx.globalAlpha = 1;
      ctx.strokeStyle = d.valid ? "#dcebdc" : "#dc8e83";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(d.x, d.y, R.Config.gameplay.orbRadius + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  };
})(Resonance);
