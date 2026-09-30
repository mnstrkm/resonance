(function (R) {
  R.version = "0.5.0";
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
      circle: '<circle cx="12" cy="12" r="10" stroke-dasharray="4 4"/>',
      line: '<line x1="4" y1="20" x2="20" y2="4" stroke-dasharray="4 4"/>',
      'x-circle': '<circle cx="12" cy="12" r="10" stroke-dasharray="4 4"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
  };
  const icon = (name) =>
    `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
  const iconButton = (id, name, label) =>
    `<button id="${id}" class="icon-button" type="button" aria-label="${label}" title="${label}">${icon(name)}</button>`;
  R.Tutorials = {
    "01": "Druck (Rot)\nStößt nahe Orbs explosionsartig weg und regt sie dabei an.",
    "02": "Sog (Blau)\nZieht nahe Orbs an sich heran und regt sie an.",
    "03": "Pulsar (Violett)\nZieht Orbs zuerst an und löst anschließend einen Druckstoß aus.",
    "04": "Pfeil (Grün)\nFeuert ein Projektil auf das nächste ruhende Ziel in Reichweite.",
    "05": "Funke (Gold)\nSucht nach kurzer Zeit ein zufälliges ruhendes Ziel irgendwo in der Arena.",
    "06": "Aura (Orange)\nRegt nahe Orbs an und verstärkt deren Kraft und Reichweite. Kein eigener Stoß.",
    "07": "Spiegel (Perlmutt)\nKopiert die Fähigkeit des auslösenden Orbs. Ohne Auslöser: nur Core-Energie.",
    "08": "Tutorial beendet!\nDas Spielfeld gehört nun ganz dir. Lass die Energie fließen!"
  };
  R.UI = class {
    constructor(game) {
      this.game = game;
      this.modal = $("modal");
      this.lastFocus = null;
      this.nav = new R.Navigation((route) => this.renderRoute(route));
      $("start").onclick = () => this.begin();
      $("mode-level").onclick = () => {
        this.game.audio.play("ui-click");
        this.goToLevels();
      };
      $("mode-random").onclick = () => {
        this.game.audio.play("ui-click");
        this.game.mode = "resonance";
        this.game.newRound();
        this.nav.go({ screen: "game" });
      };
      $("mode-editor").onclick = () => {
        this.game.audio.play("ui-click");
        this.enterEditor();
      };
      $("mode-back").onclick = () => {
        this.game.audio.play("ui-click");
        this.nav.back();
      };
      $("pause").onclick = () => {
        this.game.audio.play("ui-click");
        this.pause();
      };
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
      this.game.audio.start().then(() => {
        this.game.audio.play("ui-click");
      });
      this.nav.go({ screen: "modes" });
    }
    goToLevels() {
      const d = this.nav.entries.findIndex(e => e && e.screen === "levels");
      if (d >= 0) this.nav.toDepth(d);
      else this.nav.go({ screen: "levels" });
    }
    enterEditor() {
      this.game.editor.cancel();
      if (this.nav.route.screen === "game" && this.game.mode === "editor") {
        const d = this.nav.entries.findIndex(e => e && e.screen === "editor");
        if (d >= 0) this.nav.toDepth(d);
        else this.nav.go({ screen: "editor" });
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
      document.activeElement?.blur?.();
      const home = route.screen === "home",
        modes = route.screen === "modes",
        editing = route.screen === "editor",
        levels = route.screen === "levels";
      document.body.classList.toggle("editing", editing);
      $("welcome").hidden = !(home || modes);
      $("app").inert = home || modes || levels || !!route.panel;
      $("welcome").inert = !(home || modes);
      if ($("levels-screen")) $("levels-screen").hidden = !levels;
      $("editor-controls").hidden = !editing;
      this.modal.hidden = !route.panel;
      $("orb-palette").hidden = true;
      $("palette-toggle")?.setAttribute("aria-expanded", "false");
      this.game.setPaused(home || modes || levels || editing || !!route.panel);
      
      if (home) $("welcome").classList.remove("show-modes");
      if (modes) $("welcome").classList.add("show-modes");
      if (route.panel) {
        if (route.panel === "pause") this.showPause();
        else if (route.panel === "help") this.showHelp();
        else if (route.panel === "settings") this.showSettings();
        else if (route.panel === "seed") this.showSeed();
        else if (route.panel === "result") this.showResult();
        else if (route.panel === "export") this.showExport();
      } else if (
        route.screen === "game" &&
        !route.panel &&
        ["won", "lost"].includes(this.game.state.phase)
      ) {
        // A result is a state of this round, not a fresh history entry.
        this.nav.go({ screen: "game", panel: "result" }, true);
        return;
      } 
      if (!route.panel) this.game.audio.restoreMusic?.();
      this.update();
      if (editing) this.updateEditor();
      if (levels) this.renderLevels();
      
      if (route.screen === "game" && this.game.state.mode === "level" && this.game.state.phase === "ready" && !route.panel) {
        const lvl = this.game.state.modeData?.levelId;
        if (R.Tutorials[lvl]) {
          $("tutorial-text").innerText = R.Tutorials[lvl];
          $("tutorial-overlay").hidden = false;
          $("tutorial-overlay").onclick = () => {
            this.game.audio.play("ui-click");
            $("tutorial-overlay").hidden = true;
            // Delete it from Tutorials so it doesn't show again on restart during same session?
            // Actually, keep it. If they replay the level, they might want to read it again. Or not.
            // Let's just rely on the user clicking it away.
          };
        } else {
          $("tutorial-overlay").hidden = true;
        }
      } else {
        if ($("tutorial-overlay")) $("tutorial-overlay").hidden = true;
      }
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
    async renderLevels() {
      if (!this._levelsLoaded) {
        $("levels-content").innerHTML = '<p class="intro" style="text-align:center;">Lade Level...</p>';
        await R.LevelLoader.loadAll();
        this._levelsLoaded = true;
      }
      const page = this.levelPage || 1;
      const perPage = 20;
      const totalLevels = 50;
      const totalPages = Math.ceil(totalLevels / perPage);
      const start = (page - 1) * perPage + 1;
      const end = Math.min(page * perPage, totalLevels);
      let totalEarned = 0, totalMax = 0;
        let allStars = {};
        try { allStars = JSON.parse(localStorage.getItem("resonance.stars.v1")) || {}; } catch(e){}
        for (let i = 1; i <= 50; i++) {
          const dId = i.toString().padStart(2, "0");
          if (R.LevelLoader.get(dId)) {
            totalMax += 3;
            totalEarned += allStars[dId] || 0;
          }
        }
        let html = `<div class="menu-heading"><h2>Level <span style="font-size: 0.6em; color: var(--accent); margin-left: 10px; font-weight: normal;">&#9733; ${totalEarned} / ${totalMax}</span></h2>${iconButton("close-levels", "close", "Schließen")}</div>`;
      html += `<div class="levels-grid" style="display:grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 20px 0;">`;
      for (let i = start; i <= end; i++) {
        const id = i.toString().padStart(2, "0");
        const levelData = R.LevelLoader.get(id);
        if (!levelData) {
          html += `<button disabled class="level-button locked" aria-label="Level ${i} gesperrt">🔒</button>`;
        } else {
          const starsStr = localStorage.getItem("resonance.stars.v1");
          let stars = 0;
          if (starsStr) {
            try { const s = JSON.parse(starsStr); stars = s[id] || 0; } catch(e){}
          }
          let starsHtml = `<div class="stars" style="font-size: 10px; margin-top: 4px; display:flex; gap: 2px; justify-content:center;">`;
          for (let s = 0; s < 3; s++) {
            const color = s < stars ? "var(--accent)" : "rgba(255,255,255,0.2)";
            starsHtml += `<span style="color:${color}">★</span>`;
          }
          starsHtml += `</div>`;
          html += `<button class="level-button" data-level="${id}" style="padding: 10px 0; min-height: 56px;">
            <div class="level-num">${i}</div>
            ${starsHtml}
          </button>`;
        }
      }
      html += `</div>`;
      html += `<div class="level-pagination button-row">
        <button id="prev-page" ${page === 1 ? "disabled" : ""}>&larr;</button>
        <div style="display:flex; align-items:center; justify-content:center; flex:1; font-size:12px; color:var(--muted);">${page} / ${totalPages}</div>
        <button id="next-page" ${page === totalPages ? "disabled" : ""}>&rarr;</button>
      </div>`;
      $("levels-content").innerHTML = html;
      $("close-levels").onclick = () => {
        this.game.audio.play("ui-click");
        this.nav.back();
      };
      if ($("prev-page")) {
        $("prev-page").onclick = () => {
          this.game.audio.play("ui-click");
          this.levelPage = page - 1;
          this.renderLevels();
        };
      }
      if ($("next-page")) {
        $("next-page").onclick = () => {
          this.game.audio.play("ui-click");
          this.levelPage = page + 1;
          this.renderLevels();
        };
      }
      $("levels-content").querySelectorAll(".level-button").forEach((btn) => {
        if (!btn.disabled && btn.dataset.level) {
          btn.onclick = () => {
            this.game.audio.play("ui-click");
            const id = btn.dataset.level;
            const data = R.LevelLoader.get(id);
            this.game.mode = "level";
            this.game.newRound(data.layout.seed, data.layout, { levelId: id });
            this.game.state.modeData = { levelId: id };
            this.nav.go({ screen: "game" });
          };
        }
      });
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
        custom = this.game.mode === "editor",
        levelMode = this.game.mode === "level";
      this.game.audio.dimMusic?.();
      const pauseLvl = Number(this.game.state.modeData?.levelId);
      const pauseTitle = levelMode && !isNaN(pauseLvl) && pauseLvl > 0 ? `Level ${pauseLvl} - Pause` : "Pause";
      this.open(
        `<div class="menu-heading"><h2>${pauseTitle}</h2>${iconButton("go-home", "home", "Hauptmenü")}</div>
        <div class="speed-setting"><span id="speed-label">Geschwindigkeit</span><div class="speed-options" role="group" aria-labelledby="speed-label">${[0.5, 1, 2].map((speed) => `<button type="button" data-speed="${speed}" aria-pressed="${this.game.speed === speed}">${String(speed).replace(".", ",")}×</button>`).join("")}</div></div>
        <label class="volume-row">Musik <input id="vol-music" type="range" min="0" max="1" step="0.05" value="${this.game.audio.musicVolume !== undefined ? this.game.audio.musicVolume : 1}"></label>
        <label class="volume-row">Spielsounds <input id="vol-effects" type="range" min="0" max="1" step="0.05" value="${this.game.audio.effectsVolume !== undefined ? this.game.audio.effectsVolume : 1}"></label>
        <button class="primary" id="resume">${editor ? "Weiter bearbeiten" : "Weiterspielen"}</button>
        ${editor ? "" : `<div class="button-row"><button id="retry">Neu versuchen</button><button id="next-action">${custom ? "Zum Editor" : levelMode ? "Levelauswahl" : "Neues Feld"}</button></div>`}
        <div class="menu-links"><button class="text-button" id="guide">Anleitung</button><button class="text-button" id="settings">Einstellungen</button></div>
        <div class="menu-foot">${!editor && !custom && !levelMode && this.game.state.seed ? `<button class="seed-button" id="seed-menu">Feld ${this.game.state.seed.toString(36).toUpperCase()}</button>` : "<span></span>"}<span class="version">v${R.version}</span></div>`,
        "pause-card",
      );
      $("go-home").onclick = () => { this.game.audio.play("ui-click"); this.game.audio.restoreMusic?.(); this.home(); };
      if ($("retry-level")) $("retry-level").onclick = () => { this.game.audio.play("ui-click"); again(true); };
      this.modal.querySelectorAll("[data-speed]").forEach((button) => {
        button.onclick = () => {
            this.game.audio.play("ui-click");
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
      $("vol-music").oninput = (e) => this.game.audio.setMusicVolume?.(+e.target.value);
      $("vol-effects").oninput = (e) => this.game.audio.setEffectsVolume?.(+e.target.value);
      $("resume").onclick = () => { this.game.audio.play("ui-click"); this.game.audio.restoreMusic?.(); this.close(); };
      if (!editor) {
        $("retry").onclick = () => {
          this.game.audio.play("ui-click");
          this.game.audio.restoreMusic?.();
          this.game.retry();
          this.close();
        };
        $("next-action").onclick = () => {
          this.game.audio.play("ui-click");
          this.game.audio.restoreMusic?.();
          if (custom) this.enterEditor();
          else if (levelMode) this.goToLevels();
          else {
            this.game.newRound();
            this.close();
          }
        };
      }
      $("guide").onclick = () => { this.game.audio.play("ui-click"); this.help(); };
      $("settings").onclick = () => { this.game.audio.play("ui-click"); this.panel("settings"); };
      if ($("seed-menu")) $("seed-menu").onclick = () => { this.game.audio.play("ui-click"); this.panel("seed"); };
    }
    header(title) {
      return `<div class="menu-heading sticky-heading"><h2>${title}</h2>${iconButton("close-panel", "close", "Schließen")}</div>`;
    }
    showSettings() {
      const a = this.game.audio;
      this.open(
        `${this.header("Einstellungen")}<div class="settings"><label class="check"><input id="fallback" type="checkbox" ${a.fallback ? "checked" : ""}> Synthetische Vorschauklänge</label><label class="check"><input id="motion" type="checkbox" ${R.Config.effects.reducedMotion ? "checked" : ""}> Weniger Partikel & Lichtbewegung</label></div><button id="back">Zurück</button>`,
      );
      $("close-panel").onclick = $("back").onclick = () => { this.game.audio.play("ui-click"); this.close(); };
      $("fallback").onchange = (e) => { this.game.audio.play("ui-click"); a.fallback = e.target.checked; };
      $("motion").onchange = (e) => { this.game.audio.play("ui-click"); R.Config.effects.reducedMotion = e.target.checked; };
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
      $("close-panel").onclick = $("back").onclick = () => { this.game.audio.play("ui-click"); this.close(); };
    }
    result(won) {
      this.nav.go({ screen: "game", panel: "result" }, true);
    }
    showResult() {
      const s = this.game.state,
        won = s.phase === "won",
        custom = this.game.mode === "editor",
        levelMode = this.game.mode === "level";
      
      const used = s.initialImpulses - s.impulses;
      let starsHtml = "";
      if (levelMode && won) {
        const stars = R.Stars(s);
        starsHtml = `<div class="stars-result" style="font-size: 32px; text-align: center; margin: 15px 0; display: flex; justify-content: center; gap: 10px;">`;
        for (let i = 0; i < 3; i++) {
          starsHtml += `<span style="color:${i < stars ? "var(--accent)" : "rgba(255,255,255,0.15)"}; filter: drop-shadow(0 0 8px ${i < stars ? "var(--accent)" : "transparent"});">★</span>`;
        }
        starsHtml += `</div>`;
      }

      let btnTertiary = "";
      let btnPrimary = custom || !won ? "Noch einmal versuchen" : "Neues Feld";
      let btnSecondary = custom ? "Zum Editor" : won ? "Diesen Aufbau wiederholen" : "Neues Feld";
      if (levelMode) {
        btnPrimary = won ? "Nächstes Level" : "Noch einmal versuchen";
        btnSecondary = "Levelauswahl";
        if (won) btnTertiary = `<button id="retry-level">Wiederholen</button>`;
      }

      const lvlNum = Number(s.modeData?.levelId);
      const lvlPrefix = levelMode && !isNaN(lvlNum) && lvlNum > 0 ? `LEVEL ${lvlNum} ` : "LEVEL ";
      const eyebrowText = won ? (levelMode ? `${lvlPrefix}GESCHAFFT` : "RESONANZ ERREICHT") : (levelMode ? `${lvlPrefix}FEHLGESCHLAGEN` : "DIE ENERGIE KLINGT AUS");

      this.open(
        `<div class="menu-heading"><span class="eyebrow">${eyebrowText}</span>${iconButton("go-home", "home", "Hauptmenü")}</div><h2>${won ? "Alles im Einklang." : "Ein anderer Impuls."}</h2><p class="intro">${won ? `${s.energy} Orbs — ${used} ${used === 1 ? "Impuls" : "Impulse"}` : `${s.energy} von ${s.required} Energie gesammelt.`}</p>${starsHtml}<button class="primary" id="next">${btnPrimary}</button>${btnTertiary ? `<div class="button-row" style="margin-top: 10px;">${btnTertiary}<button id="secondary">${btnSecondary}</button></div>` : `<button id="secondary">${btnSecondary}</button>`}`,
        "result-card",
      );

      const again = (retry) => {
        retry ? this.game.retry() : this.game.newRound();
        this.nav.go({ screen: "game" }, true);
      };
      
      $("go-home").onclick = () => { this.game.audio.play("ui-click"); this.home(); };
      if ($("retry-level")) $("retry-level").onclick = () => { this.game.audio.play("ui-click"); again(true); };
      
      $("next").onclick = () => { 
        this.game.audio.play("ui-click"); 
        if (levelMode && won) {
          const nextId = String(Number(s.modeData.levelId) + 1).padStart(2, "0");
          const nextData = R.LevelLoader.get(nextId);
          if (nextData) {
            this.game.newRound(nextData.layout.seed, nextData.layout, { levelId: nextId });
            this.game.state.modeData = { levelId: nextId };
            this.nav.go({ screen: "game" }, true);
          } else {
            this.goToLevels();
          }
        } else {
          again(custom || !won); 
        }
      };
      
      $("secondary").onclick = () => { 
        this.game.audio.play("ui-click"); 
        if (levelMode) {
          this.goToLevels();
        } else {
          (custom ? this.enterEditor() : again(won)); 
        }
      };
    }
    seedDialog() {
      this.panel("seed");
    }
    showSeed() {
      this.open(
        `${this.header("Feld-Code")}<p class="intro">Bei gleicher Spielversion und Config entsteht derselbe Aufbau.</p><input id="seed-input" class="seed-input" maxlength="7" value="${this.game.state.seed.toString(36).toUpperCase()}" aria-label="Feld-Code"><p id="seed-error" class="muted"></p><button class="primary" id="load-seed">Feld laden</button><button id="close-seed">Abbrechen</button>`,
      );
      $("close-panel").onclick = $("close-seed").onclick = () => { this.game.audio.play("ui-click"); this.close(); };
      $("load-seed").onclick = () => { 
        this.game.audio.play("ui-click");
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
        const d = this.nav.entries.findIndex(e => e && e.screen === "game" && !e.panel);
        if (d >= 0) this.nav.toDepth(d);
        else this.nav.go({ screen: "game" }, true);
      };
    }
    showExport() {
      this.open(
        `<div class="menu-heading"><h2>Exportieren</h2>${iconButton("close-export", "close", "Abbrechen")}</div>
        <p class="intro">Dateiname für dein Feld:</p>
        <input id="export-filename" class="seed-input" type="text" value="mein-feld">
        <button class="primary" id="save-export" style="margin-top: 15px;">Speichern</button>`,
        "export-card"
      );
      $("close-export").onclick = () => {
        this.game.audio.play("ui-click");
        this.close();
      };
      $("save-export").onclick = () => {
        this.game.audio.play("ui-click");
        const val = $("export-filename").value.trim() || "mein-feld";
        this.game.editor.download(val);
        this.close();
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
        iconButton("editor-reset", "trash", "Alle Orbs löschen") +
          iconButton("guide-line", "line", "Hilfslinie hinzufügen") +
          iconButton("guide-circle", "circle", "Hilfskreis hinzufügen") +
          iconButton("editor-reset-guides", "x-circle", "Alle Hilfslinien löschen") +
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
      $("palette-toggle").onclick = () => { this.game.audio.play("ui-click");
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
            if (e.detail === 0) { this.game.audio.play("ui-click"); editor.type = button.dataset.type;
              editor.selected = null;
              this.updateEditor();
            }
          };
        });
      $("editor-undo").onclick = () => { this.game.audio.play("ui-click"); editor.undo(); };
      $("editor-reset").onclick = () => { this.game.audio.play("ui-click"); editor.reset(); editor.resetGuides(); };
        $("guide-line").onclick = () => { this.game.audio.play("ui-click"); editor.addGuide("line"); };
        $("guide-circle").onclick = () => { this.game.audio.play("ui-click"); editor.addGuide("circle"); };
        $("editor-reset-guides").onclick = () => { this.game.audio.play("ui-click"); editor.resetGuides(); };
      $("editor-delete").onclick = () => { this.game.audio.play("ui-click"); editor.remove(); };
      $("editor-play").onclick = () => { this.game.audio.play("ui-click"); this.playEditor(); };
      if ($("editor-export"))
        $("editor-export").onclick = () => {
          this.game.audio.play("ui-click");
          this.panel("export");
        };
    }
    updateEditor() {
      const e = this.game.editor;
      if (!e || !$("editor-play")) return;
      $("editor-play").disabled = !e.layout.count;
      $("editor-undo").disabled = !e.history.length;
      $("editor-reset").disabled = !e.layout.count;
        $("editor-reset-guides").hidden = !e.guides || !e.guides.length;
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






















