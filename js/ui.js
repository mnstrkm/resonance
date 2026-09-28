(function (R) {
  R.version = "0.3.0";
  const $ = (id) => document.getElementById(id);
  const paths = {
    home: '<path d="m3 10 9-7 9 7M5 9v11h5v-6h4v6h5V9"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    add: '<path d="M12 4v16M4 12h16"/>',
    undo: '<path d="m9 4-5 5 5 5M4 9h9a7 7 0 0 1 0 14"/>',
    trash: '<path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',
    play: '<path d="m8 4 12 8-12 8Z"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    edit: '<path d="m4 16 12-12 4 4L8 20H4Zm10-10 4 4"/>',
  };
  const icon = (name) =>
    `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
  const iconButton = (id, name, label) =>
    `<button id="${id}" class="icon-button" type="button" aria-label="${label}" title="${label}">${icon(name)}</button>`;
  R.UI = class {
    constructor(game) {
      this.game = game;
      this.modal = $("modal");
      this.lastFocus = null;
      this.nav = new R.Navigation((route) => this.renderRoute(route));
      $("start").onclick = () => this.begin();
      $("open-editor").onclick = () => this.enterEditor();
      $("pause").onclick = () => this.pause();
      document.querySelector(".wordmark").onclick = (e) => {
        e.preventDefault();
        this.home();
      };
      document
        .querySelectorAll("[data-version]")
        .forEach((el) => (el.textContent = "v" + R.version));
      this.buildEditor();
      this.modal.addEventListener("keydown", (e) => {
        if (e.key !== "Tab") return;
        const nodes = [...this.modal.querySelectorAll("button,input,a")].filter(
          (n) => !n.disabled,
        );
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      });
      window.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        e.preventDefault();
        if (game.input.drag || game.editor.drag) {
          game.input.cancel();
          return;
        }
        if (this.nav.route.panel) this.close();
        else if (this.nav.route.screen !== "home") this.pause();
      });
      this.renderRoute(this.nav.route);
    }
    begin() {
      if (this.nav.pending) return;
      this.game.mode = "resonance";
      this.game.newRound();
      this.nav.go({ screen: "game" });
    }
    enterEditor() {
      this.game.editor.cancel();
      if (this.nav.route.screen === "game" && this.game.mode === "editor") {
        this.nav.toDepth(1);
      } else this.nav.go({ screen: "editor" });
    }
    playEditor() {
      if (!this.game.editor.layout.count || this.nav.pending) return;
      const layout = this.game.editor.snapshot();
      this.game.mode = "editor";
      this.game.newRound(layout.seed, layout);
      this.nav.go({ screen: "game" });
    }
    home() {
      this.game.setPaused(true);
      this.nav.home();
    }
    renderRoute(route) {
      this.game.input.cancel();
      const home = route.screen === "home",
        editing = route.screen === "editor";
      document.body.classList.toggle("editing", editing);
      $("welcome").hidden = !home;
      $("app").inert = home || !!route.panel;
      $("welcome").inert = !home;
      $("editor-controls").hidden = !editing;
      this.modal.hidden = !route.panel;
      $("orb-palette").hidden = true;
      $("palette-toggle")?.setAttribute("aria-expanded", "false");
      this.game.setPaused(home || editing || !!route.panel);
      if (route.panel) {
        if (route.panel === "pause") this.showPause();
        else if (route.panel === "help") this.showHelp();
        else if (route.panel === "settings") this.showSettings();
        else if (route.panel === "seed") this.showSeed();
        else if (route.panel === "result") this.showResult();
      } else if (
        !home &&
        !editing &&
        ["won", "lost"].includes(this.game.state.phase)
      ) {
        // A result is a state of this round, not a fresh history entry.
        this.nav.go({ screen: "game", panel: "result" }, true);
        return;
      } else {
        (home ? $("start") : $("pause")).focus({ preventScroll: true });
      }
      this.update();
      if (editing) this.updateEditor();
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
      const s =
        this.nav.route.screen === "editor"
          ? this.game.editor.preview
          : this.game.state;
      $("energy").textContent = Math.min(s.energy, s.required);
      $("required").textContent = s.required;
      $("progress").style.width =
        (s.required ? Math.min(100, (s.energy / s.required) * 100) : 0) + "%";
      $("impulses").replaceChildren(
        ...Array.from({ length: s.initialImpulses }, (_, i) => {
          const el = document.createElement("span");
          el.className = i < s.impulses ? "pip available" : "pip";
          return el;
        }),
      );
      $("impulses").setAttribute("aria-label", s.impulses + " Impulse übrig");
    }
    open(html, className = "") {
      $("modal-content").className = "modal-card " + className;
      $("modal-content").innerHTML = html;
      this.modal.hidden = false;
      this.modal.querySelector("button,input")?.focus({ preventScroll: true });
      $("modal-content").scrollTop = 0;
      this.modal.scrollTop = 0;
    }
    close() {
      this.nav.back();
    }
    panel(name) {
      this.nav.go({ screen: this.nav.route.screen, panel: name });
    }
    pause() {
      if (this.nav.route.screen === "home" || this.nav.route.panel) return;
      this.panel("pause");
    }
    showPause() {
      const editor = this.nav.route.screen === "editor",
        custom = this.game.mode === "editor";
      this.open(
        `<div class="menu-heading"><h2>Pause</h2>${iconButton("go-home", "home", "Hauptmenü")}</div>
        <div class="speed-setting"><span id="speed-label">Geschwindigkeit</span><div class="speed-options" role="group" aria-labelledby="speed-label">${[0.5, 1, 2].map((speed) => `<button type="button" data-speed="${speed}" aria-pressed="${this.game.speed === speed}">${String(speed).replace(".", ",")}×</button>`).join("")}</div></div>
        <label class="volume-row">Lautstärke <input id="volume" type="range" min="0" max="1" step="0.05" value="${R.Config.audio.master}"></label>
        <button class="primary" id="resume">${editor ? "Weiter bearbeiten" : "Weiterspielen"}</button>
        ${editor ? "" : `<div class="button-row"><button id="retry">Neu versuchen</button><button id="next-action">${custom ? "Zum Editor" : "Neues Feld"}</button></div>`}
        <div class="menu-links"><button class="text-button" id="guide">Anleitung</button><button class="text-button" id="settings">Einstellungen</button></div>
        <div class="menu-foot">${!editor && !custom ? `<button class="seed-button" id="seed-menu">Feld ${this.game.state.seed.toString(36).toUpperCase()}</button>` : "<span></span>"}<span class="version">v${R.version}</span></div>`,
        "pause-card",
      );
      $("go-home").onclick = () => this.home();
      this.modal.querySelectorAll("[data-speed]").forEach((button) => {
        button.onclick = () => {
          this.game.setSpeed(Number(button.dataset.speed));
          this.modal
            .querySelectorAll("[data-speed]")
            .forEach((b) =>
              b.setAttribute(
                "aria-pressed",
                String(Number(b.dataset.speed) === this.game.speed),
              ),
            );
        };
      });
      $("volume").oninput = (e) => this.game.audio.volume(+e.target.value);
      $("resume").onclick = () => this.close();
      if (!editor) {
        $("retry").onclick = () => {
          this.game.retry();
          this.close();
        };
        $("next-action").onclick = () => {
          if (custom) this.enterEditor();
          else {
            this.game.newRound();
            this.close();
          }
        };
      }
      $("guide").onclick = () => this.help();
      $("settings").onclick = () => this.panel("settings");
      if ($("seed-menu")) $("seed-menu").onclick = () => this.panel("seed");
    }
    header(title) {
      return `<div class="menu-heading sticky-heading"><h2>${title}</h2>${iconButton("close-panel", "close", "Schließen")}</div>`;
    }
    showSettings() {
      const a = this.game.audio;
      this.open(
        `${this.header("Einstellungen")}<div class="settings"><label class="check"><input id="fallback" type="checkbox" ${a.fallback ? "checked" : ""}> Synthetische Vorschauklänge</label><label class="check"><input id="motion" type="checkbox" ${R.Config.effects.reducedMotion ? "checked" : ""}> Weniger Partikel & Lichtbewegung</label></div><button id="back">Zurück</button>`,
      );
      $("close-panel").onclick = $("back").onclick = () => this.close();
      $("fallback").onchange = (e) => (a.fallback = e.target.checked);
      $("motion").onchange = (e) =>
        (R.Config.effects.reducedMotion = e.target.checked);
    }
    help() {
      this.panel("help");
    }
    showHelp() {
      this.open(
        `${this.header("Anleitung")}
        <p class="intro">Ziehe einen Orb ein Stück und lass ihn innerhalb seines Kreises auf freiem Platz los. Ungültiges Loslassen verbraucht keinen Impuls.</p>
        <div class="legend">${Object.entries(R.OrbTypes)
          .map(
            ([id, t]) =>
              `<div class="legend-row"><canvas class="legend-orb" data-orb="${id}" width="96" height="96" aria-hidden="true"></canvas><div><strong>${t.name}</strong><p>${t.description}</p></div></div>`,
          )
          .join("")}</div>
        <p class="muted">Jeder Orb liefert einmal Energie. Kollisionen bewegen Orbs, aktivieren sie aber nicht. Helle Ringe zeigen das Laden; dunkle Orbs sind verbraucht.</p>
        <p class="muted">Eigenes Feld: Orb-Typ auswählen und auf einen freien Platz tippen oder aus der Auswahl ins Feld ziehen. Im Editor kannst du Orbs frei verschieben. Beim Spielen gelten drei Impulse und alle Orbs als Ziel. Rückgängig nimmt auch Zurücksetzen zurück.</p>
        <button class="primary" id="back">Zurück</button>`,
        "help-card",
      );
      this.drawIcons(this.modal);
      $("close-panel").onclick = $("back").onclick = () => this.close();
    }
    result(won) {
      this.nav.go({ screen: "game", panel: "result" }, true);
    }
    showResult() {
      const s = this.game.state,
        won = s.phase === "won",
        custom = this.game.mode === "editor";
      const used = s.initialImpulses - s.impulses;
      this.open(
        `<div class="menu-heading"><span class="eyebrow">${won ? "RESONANZ ERREICHT" : "DIE ENERGIE KLINGT AUS"}</span>${iconButton("go-home", "home", "Hauptmenü")}</div><h2>${won ? "Alles im Einklang." : "Ein anderer Impuls."}</h2><p class="intro">${won ? `${s.energy} Orbs · ${used} ${used === 1 ? "Impuls" : "Impulse"}` : `${s.energy} von ${s.required} Energie gesammelt.`}</p><button class="primary" id="next">${custom || !won ? "Noch einmal versuchen" : "Neues Feld"}</button><button id="secondary">${custom ? "Zum Editor" : won ? "Diesen Aufbau wiederholen" : "Neues Feld"}</button>`,
        "result-card",
      );
      const again = (retry) => {
        retry ? this.game.retry() : this.game.newRound();
        this.nav.go({ screen: "game" }, true);
      };
      $("go-home").onclick = () => this.home();
      $("next").onclick = () => again(custom || !won);
      $("secondary").onclick = () => (custom ? this.enterEditor() : again(won));
    }
    seedDialog() {
      this.panel("seed");
    }
    showSeed() {
      this.open(
        `${this.header("Feld-Code")}<p class="intro">Bei gleicher Spielversion und Config entsteht derselbe Aufbau.</p><input id="seed-input" class="seed-input" maxlength="7" value="${this.game.state.seed.toString(36).toUpperCase()}" aria-label="Feld-Code"><p id="seed-error" class="muted"></p><button class="primary" id="load-seed">Feld laden</button><button id="close-seed">Abbrechen</button>`,
      );
      $("close-panel").onclick = $("close-seed").onclick = () => this.close();
      $("load-seed").onclick = () => {
        const value = $("seed-input").value.trim(),
          seed = parseInt(value, 36);
        if (
          !/^[0-9a-z]{1,7}$/i.test(value) ||
          !Number.isSafeInteger(seed) ||
          seed > 4294967295
        ) {
          $("seed-error").textContent =
            "Bitte einen gültigen Feld-Code eingeben.";
          return;
        }
        this.game.newRound(seed);
        this.nav.toDepth(1);
      };
    }
    drawIcons(container) {
      container.querySelectorAll("canvas[data-orb]").forEach((canvas, id) => {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, 96, 96);
        ctx.save();
        ctx.scale(2, 2);
        R.Renderer.prototype.orb.call(
          { ctx },
          {
            id,
            type: canvas.dataset.orb,
            x: 24,
            y: 23,
            r: 17,
            state: "idle",
            boost: 1,
            copied: null,
          },
          0,
        );
        ctx.restore();
      });
    }
    buildEditor() {
      $("editor-toolbar").innerHTML =
        iconButton("palette-toggle", "add", "Orbs auswählen") +
        iconButton("editor-undo", "undo", "Rückgängig") +
        iconButton("editor-reset", "trash", "Zurücksetzen") +
        iconButton("editor-delete", "close", "Ausgewählten Orb entfernen") +
        (this.game.editor.creator
          ? iconButton("editor-export", "download", "Leveldatei speichern")
          : "") +
        iconButton("editor-play", "play", "Feld spielen");
      $("palette-toggle").setAttribute("aria-controls", "orb-palette");
      $("palette-toggle").setAttribute("aria-expanded", "false");
      $("orb-palette").innerHTML = Object.entries(R.OrbTypes)
        .map(
          ([id, t]) =>
            `<button type="button" data-type="${id}" aria-label="${t.name} platzieren" title="${t.name}" aria-pressed="false"><canvas data-orb="${id}" width="96" height="96" aria-hidden="true"></canvas></button>`,
        )
        .join("");
      this.drawIcons($("orb-palette"));
      $("palette-toggle").onclick = () => {
        $("orb-palette").hidden = !$("orb-palette").hidden;
        $("palette-toggle").setAttribute(
          "aria-expanded",
          String(!$("orb-palette").hidden),
        );
      };
      const editor = this.game.editor;
      $("orb-palette")
        .querySelectorAll("[data-type]")
        .forEach((button) => {
          button.addEventListener("pointerdown", (e) =>
            editor.fromPalette(e, button.dataset.type, button),
          );
          button.addEventListener("pointermove", (e) => editor.updateDrag(e));
          button.addEventListener("pointerup", (e) => editor.up(e));
          button.addEventListener("pointercancel", () => editor.cancel());
          button.addEventListener("lostpointercapture", () => editor.cancel());
          button.onclick = (e) => {
            if (e.detail === 0) {
              editor.type = button.dataset.type;
              editor.selected = null;
              this.updateEditor();
            }
          };
        });
      $("editor-undo").onclick = () => editor.undo();
      $("editor-reset").onclick = () => editor.reset();
      $("editor-delete").onclick = () => editor.remove();
      $("editor-play").onclick = () => this.playEditor();
      if ($("editor-export"))
        $("editor-export").onclick = () => editor.download();
    }
    updateEditor() {
      const e = this.game.editor;
      if (!e || !$("editor-play")) return;
      $("editor-play").disabled = !e.layout.count;
      $("editor-undo").disabled = !e.history.length;
      $("editor-reset").disabled = !e.layout.count;
      $("editor-delete").hidden = e.selected === null;
      if ($("editor-export")) $("editor-export").disabled = !e.layout.count;
      $("orb-palette")
        .querySelectorAll("[data-type]")
        .forEach((button) =>
          button.setAttribute(
            "aria-pressed",
            String(button.dataset.type === e.type),
          ),
        );
      $("editor-status").textContent = !e.availableStorage
        ? "Entwurf bleibt nur bis zum Schließen erhalten."
        : e.layout.count >= R.LevelData.maxOrbs
          ? "Maximale Orb-Anzahl erreicht."
          : e.type
            ? R.OrbTypes[e.type].name + " · freien Platz wählen"
            : "Orb-Typ auswählen";
      if (this.nav.route.screen === "editor") this.update();
    }
  };
})(Resonance);
