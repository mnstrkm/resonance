(function (R) {
  // Dateien ersetzen die synthetischen Vorschauklänge automatisch beim nächsten Start.
  R.SoundAssets = {
    grab: { file: "grab.mp3", gain: 0.3 },
    release: { file: "release.mp3", gain: 0.5 },
    cancel: { file: "cancel.mp3", gain: 0.2 },
    charge: { file: "orb-charge.mp3", gain: 0.18 },
    red: { file: "orb-red.mp3", gain: 0.7 },
    blue: { file: "orb-blue.mp3", gain: 0.7 },
    violet: { file: "orb-violet.mp3", gain: 0.65 },
    burst: { file: "orb-violet-burst.mp3", gain: 0.6 },
    green: { file: "orb-green.mp3", gain: 0.5 },
    "green-hit": { file: "orb-green-hit.mp3", gain: 0.5 },
    gold: { file: "orb-gold.mp3", gain: 0.5 },
    "gold-hit": { file: "orb-gold-hit.mp3", gain: 0.45 },
    orange: { file: "orb-orange.mp3", gain: 0.55 },
    empty: { file: "orb-pearl-empty.mp3", gain: 0.25 },
    energy: { file: "core-charge.mp3", gain: 0.3 },
    full: { file: "core-full.mp3", gain: 0.6 },
    complete: { file: "core-complete.mp3", gain: 0.75 },
    fail: { file: "round-failed.mp3", gain: 0.4 },
    collision: { file: "collision.mp3", gain: 0.25 },
    "ui-click": { file: "ui-click.mp3", gain: 0.2 },
  };
  R.Audio = class {
    constructor() {
      this.ctx = null;
      this.buffers = {};
      this.voices = 0;
      this.nodes = new Set();
      this.muted = false;
      this.fallback = R.Config.audio.fallback;
      this.last = {};
      this.loaded = 0;
      this.effectsGain = null;
      this.musicGain = null;
      this.musicSource = null;
      this.musicTracks = [];
      this.musicIndex = -1;
      this.effectsVolume = 1;
      this.musicVolume = 1;
      try {
        const ev = localStorage.getItem("resonance.effectsVolume");
        if (ev !== null) this.effectsVolume = parseFloat(ev);
        const mv = localStorage.getItem("resonance.musicVolume");
        if (mv !== null) this.musicVolume = parseFloat(mv);
      } catch (_) {}
    }
    getMusicMax() {
      const cfg = R.Config?.audio;
      const val = cfg?.musicMax ?? cfg?.music_max;
      return typeof val === "number" ? val : 0.43;
    }
    async start() {
      if (!this.ctx) {
        const C = window.AudioContext || window.webkitAudioContext;
        if (!C) return;
        this.ctx = new C();
          document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") {
              if (this.ctx && this.ctx.state === "suspended") {
                this.ctx.resume().then(() => {
                  if (!this.musicSource && this.musicTracks.length && !this.muted && this.musicVolume > 0) {
                    this.startMusic();
                  }
                }).catch(() => {});
              } else if (!this.musicSource && this.musicTracks.length && !this.muted && this.musicVolume > 0) {
                this.startMusic();
              }
            }
          });
        this.effectsGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.effectsGain.gain.value = this.effectsVolume;
        this.musicGain.gain.value = this.musicVolume * this.getMusicMax();
        const limiter = this.ctx.createDynamicsCompressor();
        limiter.threshold.value = -16;
        limiter.ratio.value = 5;
        this.effectsGain.connect(limiter);
        this.musicGain.connect(limiter);
        limiter.connect(this.ctx.destination);
        this.noise = this.ctx.createBuffer(
          1,
          this.ctx.sampleRate,
          this.ctx.sampleRate,
        );
        const values = this.noise.getChannelData(0);
        for (let i = 0; i < values.length; i++)
          values[i] = Math.random() * 2 - 1;
        this.load();
        this.loadMusic();
      }
      if (this.ctx.state === "suspended") await this.ctx.resume();
      if (!this.musicSource && this.musicTracks.length && !this.muted && this.musicVolume > 0) {
        this.startMusic();
      }
    }
    async load() {
      await Promise.all(
        Object.entries(R.SoundAssets).map(async ([key, v]) => {
          try {
            const response = await fetch("assets/sounds/" + v.file);
            if (!response.ok) return;
            this.buffers[key] = await this.ctx.decodeAudioData(
              await response.arrayBuffer(),
            );
            this.loaded++;
          } catch {
            /* Fehlende optionale Dateien sind erlaubt, auch bei file://. */
          }
        }),
      );
    }
    setEffectsVolume(value) {
      this.effectsVolume = value;
      if (this.effectsGain) this.effectsGain.gain.value = this.muted ? 0 : value;
      try {
        localStorage.setItem("resonance.effectsVolume", value);
      } catch (_) {}
    }
    setMusicVolume(value) {
        const wasOff = this.musicVolume === 0;
        this.musicVolume = value;
        if (this.musicGain) this.musicGain.gain.value = this.muted ? 0 : value * this.getMusicMax();
        try {
          localStorage.setItem("resonance.musicVolume", value);
        } catch (_) {}
        if (value === 0) this.stopMusic();
        else if (wasOff && !this.musicSource) this.startMusic();
      }
    volume(value) {
      this.setEffectsVolume(value);
    }
    mute(value) {
      this.muted = value;
      if (this.effectsGain) this.effectsGain.gain.value = value ? 0 : this.effectsVolume;
      if (this.musicGain) this.musicGain.gain.value = value ? 0 : this.musicVolume * this.getMusicMax();
    }
    stop() {
      for (const node of this.nodes) {
          if (node.isUI) continue;
          try { node.stop(); } catch {}
        }
      }
    suspend() {
      this.stop();
      if (this.ctx?.state === "running") this.ctx.suspend().catch(() => {});
    }
    async loadMusic() {
      try {
        const res = await fetch("assets/music/playlist.json");
        if (!res.ok) return;
        const list = await res.json();
        if (!Array.isArray(list) || !list.length) return;
        for (const file of list) {
          try {
            const r = await fetch("assets/music/" + file);
            if (!r.ok) continue;
            const buf = await this.ctx.decodeAudioData(await r.arrayBuffer());
            this.musicTracks.push(buf);
          } catch { /* Fehlende Musikdateien sind erlaubt */ }
        }
        this.startMusic();
      } catch { /* Keine Playlist → keine Musik, kein Fehler */ }
    }
    startMusic() {
      if (!this.musicTracks.length || this.musicVolume === 0 || this.muted) return;
      let nextIndex = this.musicIndex;
      if (this.musicTracks.length > 1) {
        while (nextIndex === this.musicIndex) {
          nextIndex = Math.floor(Math.random() * this.musicTracks.length);
        }
      } else {
        nextIndex = 0;
      }
      this.musicIndex = nextIndex;
      this.musicSource = this.ctx.createBufferSource();
      this.musicSource.buffer = this.musicTracks[this.musicIndex];
      this.musicSource.connect(this.musicGain);
      this.musicSource.onended = () => this.startMusic();
      this.musicSource.start();
    }
    stopMusic() {
      if (this.musicSource) {
        this.musicSource.onended = null;
        try { this.musicSource.stop(); } catch {}
        this.musicSource.disconnect();
        this.musicSource = null;
      }
    }
    dimMusic() {
      if (this.musicGain && this.ctx) {
        const target = (this.muted ? 0 : this.musicVolume * this.getMusicMax()) * 0.3;
        try {
          this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
          this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, this.ctx.currentTime);
          this.musicGain.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 0.3);
        } catch (_) {
          this.musicGain.gain.value = target;
        }
      }
    }
    restoreMusic() {
      if (this.musicGain && this.ctx) {
        const target = this.muted ? 0 : this.musicVolume * this.getMusicMax();
        try {
          this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
          this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, this.ctx.currentTime);
          this.musicGain.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 0.3);
        } catch (_) {
          this.musicGain.gain.value = target;
        }
      }
    }
    play(key, data = {}) {
      if (!this.ctx || this.ctx.state !== "running" || this.muted) return;
      const now = this.ctx.currentTime,
        interval =
          key === "collision"
            ? 0.085
            : key === "charge"
              ? 0.07
              : key === "energy"
                ? 0.06
                : 0.025;
      if (
        now - (this.last[key] ?? -10) < interval ||
        this.voices >= R.Config.audio.maxVoices
      )
        return;
      this.last[key] = now;
      const entry = R.SoundAssets[key] || { gain: 0.3 },
        bus =
          key === "collision"
            ? R.Config.audio.collision
            : ["energy", "full", "complete"].includes(key)
              ? R.Config.audio.core
              : R.Config.audio.effects;
      const gain = entry.gain * bus * (data.strength ?? 1);
      if (this.buffers[key]) {
        const source = this.ctx.createBufferSource();
        source.buffer = this.buffers[key];
          source.isUI = (key === "ui-click");
        if (key === "energy")
          source.playbackRate.value =
            2 ** ([0, 3, 5, 7, 10][(data.index || 0) % 5] / 12);
        this.output(
          source,
          gain,
          0.01,
          source.buffer.duration / source.playbackRate.value,
        );
        return;
      }
      if (!this.fallback) return;
      // Ehrliche Vorschau: warme, leise Synthese; echte Assets bleiben austauschbar.
      const notes = [0, 3, 5, 7, 10, 12],
        pitch = 146.83 * 2 ** (notes[(data.index || 0) % notes.length] / 12);
      const map = {
        red: [98, 0.42],
        blue: [174.6, 0.48],
        violet: [130.8, 0.48],
        burst: [87.3, 0.5],
        green: [293.7, 0.18],
        gold: [440, 0.36],
        orange: [220, 0.35],
        charge: [293.7, 0.16],
        grab: [330, 0.09],
        release: [220, 0.13],
        cancel: [146, 0.1],
        empty: [196, 0.3],
        collision: [520, 0.08],
        energy: [pitch, 0.45],
        full: [146.83, 0.8],
        complete: [73.42, 1.8],
        fail: [110, 0.8],
        "green-hit": [392, 0.2],
        "gold-hit": [440, 0.3],
        "ui-click": [880, 0.06],
      };
      const [f, d] = map[key] || [220, 0.2];
      const osc = this.ctx.createOscillator();
      osc.type = "sine";
        osc.isUI = (key === "ui-click");
      osc.frequency.setValueAtTime(key === "blue" ? f * 0.65 : f, now);
      osc.frequency.exponentialRampToValueAtTime(
        key === "blue" ? f : key === "red" ? f * 0.65 : f * 0.99,
        now + d,
      );
      this.output(osc, gain * 0.42, key === "blue" ? 0.08 : 0.012, d);
      if (["red", "green", "burst", "complete"].includes(key)) {
        const source = this.ctx.createBufferSource();
        source.buffer = this.noise;
        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = key === "green" ? 1800 : 500;
        source.connect(filter);
        this.output(source, gain * 0.12, 0.008, Math.min(d, 0.45), filter);
      }
      if (["complete", "full"].includes(key))
        for (const ratio of [1.5, 2]) {
          const partial = this.ctx.createOscillator();
          partial.frequency.value = f * ratio;
          this.output(partial, gain * 0.15, 0.09, d);
        }
    }
    output(source, level, attack, duration, upstream = source) {
      const gain = this.ctx.createGain(),
        now = this.ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(level, now + attack);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + Math.max(attack + 0.01, duration),
      );
      upstream.connect(gain);
      gain.connect(this.effectsGain);
      this.voices++;
      this.nodes.add(source);
      source.onended = () => {
        this.voices--;
        this.nodes.delete(source);
        source.disconnect();
        if (upstream !== source) upstream.disconnect();
        gain.disconnect();
      };
      source.start(now);
      source.stop(now + duration + 0.03);
    }
  };
})(Resonance);






