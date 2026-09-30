(function (R) {
  R.Game = class {
    constructor(mode = "resonance") {
      this.audio = new R.Audio();
      this.particles = new R.Particles();
      this.mode = mode;
      this.state = R.createState(R.createSeed(), this.mode);
      this.paused = true;
      // Playback preference only: never alters balance values or the fixed step.
      this.speed = 1;
      try {
        const saved = Number(localStorage.getItem("resonance.speed"));
        if ([0.5, 1, 2].includes(saved)) this.speed = saved;
      } catch (_) {
        /* Storage may be unavailable in private browsing. */
      }

      this.renderer = new R.Renderer(document.getElementById("arena"));
      this.input = new R.Input(document.getElementById("arena"), this);
      this.editor = new R.Editor(this);
      this.ui = new R.UI(this);
      this.chain = new R.Chain(this.state, (name, data) =>
        this.event(name, data),
      );
      this.accumulator = 0;
      this.last = 0;
      this.fullPlayed = false;
      this.dirty = true;
      this.ui.update();
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          this.input.cancel();
          if (!this.paused) this.ui.pause();
          this.audio.suspend();
        }
      });
      window.addEventListener("blur", () => {
        if (!this.paused) this.ui.pause();
      });
      this.frame = this.frame.bind(this);
      requestAnimationFrame(this.frame);
    }
    requestRedraw() {
      this.dirty = true;
    }
    setPaused(value) {
      this.paused = value;
      this.dirty = true;
      this.input?.cancel();
      this.accumulator = 0;
      this.last = 0;
      if (value) this.audio.stop();
      else {
        this.audio.start().catch(() => {});
        if (!this.audio.musicSource && this.audio.musicTracks.length && !this.audio.muted && this.audio.musicVolume > 0) {
          this.audio.startMusic();
        }
      }
    }
    setSpeed(value) {
      if (![0.5, 1, 2].includes(value)) return;
      this.speed = value;
      try {
        localStorage.setItem("resonance.speed", String(value));
      } catch (_) {
        /* The setting still works for this session. */
      }
    }
    event(name, d) {
      this.particles.emit(name, d);
      const key =
        name === "ability" ? d.type : name === "hit" ? d.type + "-hit" : name;
      if (name === "energy") d.index = this.state.chainCount;
      this.audio.play(key, d);
      if (name === "energy") {
        this.ui.update();
        if (this.state.energy >= this.state.required && !this.fullPlayed) {
          this.fullPlayed = true;
          this.audio.play("full");
        }
      }
    }
    newRound(seed = R.createSeed(), snapshot = null, modeData = null) {
      this.input.cancel();
      this.audio.stop();
      this.particles.clear();
      if (this.ui) this.ui.tutorialDismissed = false;
      this.dirty = true;
      const md = modeData || (this.state && this.state.mode === this.mode ? this.state.modeData : {});
      this.state = R.createState(seed, this.mode, snapshot, md);
      this.chain = new R.Chain(this.state, (n, d) => this.event(n, d));
      this.fullPlayed = false;
      this.accumulator = 0;
      this.ui.update();
      this.ui.defaultHint();
    }
    retry() {
      const md = this.state?.modeData ? JSON.parse(JSON.stringify(this.state.modeData)) : {};
      this.newRound(this.state.seed, this.state.snapshot, md);
    }
    commit(id, x, y) {
      const s = this.state;
      if (this.paused || s.phase !== "ready" || s.impulses <= 0) return;
      const o = s.orbs.find((o) => o.id === id);
      if (!o || o.state !== "idle") return;
      this.dirty = true;
      o.x = x;
      o.y = y;
      s.impulses--;
      s.phase = "chain";
      s.quiet = 0;
      s.chainCount = 0;
      this.chain.activate(o);
      this.audio.play("release");
      this.ui.update();
      this.ui.defaultHint();
    }
    step(dt) {
      const s = this.state;
      s.time += dt;
      this.particles.step(dt);
      if (s.phase === "chain") {
        this.chain.step(dt);
        R.Physics.step(s, dt, (n, d) => this.event(n, d));
        const moving = s.orbs.some((o) => Math.hypot(o.vx, o.vy) > 0);
        if (!this.chain.busy() && !moving) s.quiet += dt;
        else s.quiet = 0;
        if (s.quiet >= R.Config.physics.settleTime) {
          const outcome = R.Modes[s.mode].outcome(s);
          if (outcome === "won") {
            s.phase = "complete";
            s.completeTime = 0;
            if (s.mode === "level" && s.modeData.levelId) {
              const stars = R.Stars(s);
              try {
                const raw = localStorage.getItem("resonance.stars.v1");
                const parsed = raw ? JSON.parse(raw) : null;
                const ls = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
                ls[s.modeData.levelId] = Math.max(ls[s.modeData.levelId] || 0, stars);
                localStorage.setItem("resonance.stars.v1", JSON.stringify(ls));
              } catch (_) {}
            }
            this.ui.hint("Der Core findet seine Resonanz.");
            this.event("complete", {
              x: R.Config.arena.width / 2,
              y: R.Config.arena.height / 2,
              color: "#e9dcbf",
            });
          } else if (outcome === "lost") {
            s.phase = "lost_wait";
            s.lostTime = 0;
          } else {
            s.phase = "ready";
            this.ui.defaultHint();
          }
        }
      } else if (s.phase === "lost_wait") {
        s.lostTime += dt;
        if (s.lostTime >= 0.8) {
          s.phase = "lost";
          this.ui.result(false);
          this.audio.play("fail");
        }
      } else if (s.phase === "complete") {
        s.completeTime += dt;
        if (s.completeTime >= R.Config.effects.completeDuration) {
          s.phase = "won";
          this.ui.result(true);
        }
      }
    }
    frame(timestamp) {
      if (!this.last) this.last = timestamp;
      const dt = Math.min(
        (timestamp - this.last) / 1000,
        R.Config.physics.maxFrame,
      );
      this.last = timestamp;
      if (!this.paused) {
        // All simulation systems share this clock. Keep each physics step
        // unchanged so different playback speeds produce the same trajectory.
        this.accumulator += dt * this.speed;
        while (this.accumulator >= R.Config.physics.step) {
          this.step(R.Config.physics.step);
          this.accumulator -= R.Config.physics.step;
          if (this.paused) {
            this.accumulator = 0;
            break;
          }
        }
      }
      const route = this.ui.nav.route;
      const screen = route.screen;
      const panel = route.panel;
      const covered = screen === "home" || screen === "modes" || screen === "levels";

      let needsDraw = false;
      if (!covered) {
        if (screen === "editor") {
          // Im Editor ohne ueberlagerndes Menue laufen sichtbare Idle-Animationen
          if (!panel) {
            this.editor.preview.time += dt;
            needsDraw = true;
          } else if (this.dirty) {
            needsDraw = true;
          }
        } else if (!this.paused) {
          // Laufendes Spiel immer zeichnen
          needsDraw = true;
        } else if (this.dirty || this.input.drag) {
          // Im pausierten Zustand nur bei Aenderungen, Resize oder Drag zeichnen
          needsDraw = true;
        }
      }

      if (needsDraw) {
        this.dirty = false;
        if (screen === "editor") {
          this.renderer.draw(
            this.editor.preview,
            { items: [], effects: [] },
            null,
          );
          this.editor.draw(this.renderer);
        } else {
          this.renderer.draw(this.state, this.particles, this.input.drag);
        }
      }
      requestAnimationFrame(this.frame);
    }
  };
  window.addEventListener("DOMContentLoaded", () => {
    R.Config.effects.reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    R.game = new R.Game();
  });
})(Resonance);
