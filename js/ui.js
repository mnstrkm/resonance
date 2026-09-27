(function (R) {
  const $ = (id) => document.getElementById(id);
  R.UI = class {
    constructor(game) {
      this.game = game;
      this.modal = $("modal");
      this.lastFocus = null;
      $("start").onclick = () => this.begin();
      $("pause").onclick = () => this.pause();
      $("help").onclick = () => this.help();
      $("sound").onclick = () => {
        game.audio.mute(!game.audio.muted);
        this.soundLabel();
      };
      this.modal.addEventListener("keydown", (e) => {
        if (e.key !== "Tab") return;
        const nodes = [...this.modal.querySelectorAll("button,input,a")].filter(
          (n) => !n.disabled,
        );
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      });
      window.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !$("welcome").hidden) {
          return;
        }
        if (e.key === "Escape" && this.modal.hidden) this.pause();
      });
      $("seed-label").onclick = () => this.seedDialog();
    }
    async begin() {
      await this.game.audio.start().catch(() => {});
      $("welcome").hidden = true;
      this.game.paused = false;
      $("pause").focus();
      this.defaultHint();
    }
    soundLabel() {
      $("sound").textContent = this.game.audio.muted ? "Ton aus" : "Ton an";
      $("sound").setAttribute("aria-pressed", String(!this.game.audio.muted));
    }
    hint(text) {
      $("hint").textContent = text;
    }
    defaultHint() {
      this.hint(
        this.game.state.phase === "ready"
          ? "Orb ziehen und loslassen"
          : "Resonanz entfaltet sich …",
      );
    }
    update() {
      const s = this.game.state;
      $("energy").textContent = Math.min(s.energy, s.required);
      $("required").textContent = s.required;
      $("progress").style.width =
        Math.min(100, (s.energy / s.required) * 100) + "%";
      $("seed-label").textContent = "Feld " + s.seed.toString(36).toUpperCase();
      $("impulses").replaceChildren(
        ...Array.from({ length: s.initialImpulses }, (_, i) => {
          const el = document.createElement("span");
          el.className = i < s.impulses ? "pip available" : "pip";
          return el;
        }),
      );
      $("impulses").setAttribute("aria-label", s.impulses + " Impulse übrig");
      $("impulse-label").textContent =
        s.impulses === 1 ? "1 Impuls übrig" : s.impulses + " Impulse übrig";
    }
    open(html) {
      this.lastFocus = document.activeElement;
      this.game.setPaused(true);
      $("modal-content").innerHTML = html;
      this.modal.hidden = false;
      this.modal.querySelector("button,input")?.focus();
    }
    close() {
      this.modal.hidden = true;
      this.game.setPaused(false);
      this.lastFocus?.focus();
    }
    pause() {
      if (!$("welcome").hidden || !this.modal.hidden) return;
      this.showPause();
    }
    showPause() {
      const a = this.game.audio;
      this.open(
        `<p class="eyebrow">EIN MOMENT RUHE</p><h2>Pause</h2><div class="settings"><label>Lautstärke <input id="volume" type="range" min="0" max="1" step="0.05" value="${R.Config.audio.master}"></label><label class="check"><input id="fallback" type="checkbox" ${a.fallback ? "checked" : ""}> Synthetische Vorschauklänge</label><label class="check"><input id="motion" type="checkbox" ${R.Config.effects.reducedMotion ? "checked" : ""}> Weniger Partikel & Lichtbewegung</label><p class="muted">Eigene Audiodateien: ${a.loaded} geladen. Vorschauklänge sind austauschbare Platzhalter.</p></div><button class="primary" id="resume">Weiterspielen</button><div class="button-row"><button id="retry">Neu versuchen</button><button id="new">Neues Feld</button></div><button class="text-button" id="guide">Orb-Lexikon</button>`,
      );
      $("volume").oninput = (e) => a.volume(+e.target.value);
      $("fallback").onchange = (e) => (a.fallback = e.target.checked);
      $("motion").onchange = (e) =>
        (R.Config.effects.reducedMotion = e.target.checked);
      $("resume").onclick = () => this.close();
      $("retry").onclick = () => {
        this.close();
        this.game.retry();
      };
      $("new").onclick = () => {
        this.close();
        this.game.newRound();
      };
      $("guide").onclick = () => this.help(true);
    }
    help(back = false) {
      if (!$("welcome").hidden) return;
      const wasPaused = this.game.paused;
      this.open(
        `<p class="eyebrow">SIEBEN ARTEN VON ENERGIE</p><h2>Eine Berührung.<br>Viele Möglichkeiten.</h2><p class="intro">Ziehe einen Orb ein Stück und lass ihn los. Zurück zum Startpunkt, außerhalb des Kreises oder auf einem anderen Orb: kostenlos abbrechen.</p><div class="legend">${Object.entries(
          R.OrbTypes,
        )
          .map(
            ([id, t]) =>
              `<div class="legend-row"><span class="legend-orb" style="--orb:${t.color}">${{ red: "+", blue: "○", violet: "◌", green: "›", gold: "~", orange: "◎", pearl: "◇" }[id]}</span><div><strong>${t.name}</strong><p>${t.description}</p></div></div>`,
          )
          .join(
            "",
          )}</div><p class="muted">Jeder Orb liefert einmal Energie. Kollisionen bewegen Orbs, aktivieren sie aber nicht. Helle Ringe zeigen das Laden; dunkle Orbs sind verbraucht.</p><button class="primary" id="back">${back ? "Zurück" : "Verstanden"}</button>`,
      );
      $("back").onclick = () => {
        if (back) this.showPause();
        else if (wasPaused) this.showPause();
        else this.close();
      };
    }
    result(won) {
      const s = this.game.state,
        used = s.initialImpulses - s.impulses;
      this.open(
        `<p class="eyebrow">${won ? "RESONANZ ERREICHT" : "DIE ENERGIE KLINGT AUS"}</p><h2>${won ? "Alles im Einklang." : "Ein anderer Impuls."}</h2><p class="intro">${won ? `${s.energy} Orbs · ${used} ${used === 1 ? "Impuls" : "Impulse"}` : `${s.energy} von ${s.required} Energie gesammelt. Derselbe Aufbau, eine neue Möglichkeit.`}</p><button class="primary" id="next">${won ? "Neues Feld" : "Noch einmal versuchen"}</button><button id="secondary">${won ? "Diesen Aufbau wiederholen" : "Neues Feld"}</button><p class="muted">Feld ${s.seed.toString(36).toUpperCase()}</p>`,
      );
      $("next").onclick = () => {
        this.close();
        won ? this.game.newRound() : this.game.retry();
      };
      $("secondary").onclick = () => {
        this.close();
        won ? this.game.retry() : this.game.newRound();
      };
    }
    seedDialog() {
      if (this.game.state.phase !== "ready" || this.game.paused) return;
      this.open(
        `<p class="eyebrow">EIN AUFBAU ZUM WIEDERFINDEN</p><h2>Feld-Code</h2><p class="intro">Diesen Code kannst du auf einem anderen Gerät eingeben. Bei gleicher Spielversion und Config entsteht derselbe Aufbau.</p><input id="seed-input" class="seed-input" maxlength="7" value="${this.game.state.seed.toString(36).toUpperCase()}" aria-label="Feld-Code"><p id="seed-error" class="muted"></p><button class="primary" id="load-seed">Feld laden</button><button id="close-seed">Abbrechen</button>`,
      );
      $("load-seed").onclick = () => {
        const value = $("seed-input").value.trim();
        const seed = parseInt(value, 36);
        if (
          !/^[0-9a-z]{1,7}$/i.test(value) ||
          !Number.isSafeInteger(seed) ||
          seed > 4294967295
        ) {
          $("seed-error").textContent =
            "Bitte einen gültigen Feld-Code eingeben.";
          return;
        }
        this.close();
        this.game.newRound(seed);
      };
      $("close-seed").onclick = () => this.close();
    }
  };
})(Resonance);
