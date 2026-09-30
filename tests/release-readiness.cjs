const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { JSDOM, VirtualConsole } = require("jsdom");
const { createCanvas } = require("@napi-rs/canvas");

const root = path.resolve(__dirname, "..");
const scripts = [
  "config",
  "orb-types",
  "generator",
  "level-data",
  "level-loader",
  "state",
  "physics",
  "chain",
  "audio",
  "particles",
  "renderer",
  "input",
  "navigation",
  "editor",
  "ui",
  "game",
];

async function setup(search = "") {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errors.push(e));
  const dom = new JSDOM(
    fs.readFileSync(path.join(root, "index.html"), "utf8"),
    {
      runScripts: "outside-only",
      url: "https://example.test/resonance/" + search,
      virtualConsole: vc,
    },
  );
  const w = dom.window;
  w.ResizeObserver = class {
    observe() {}
  };
  w.matchMedia = () => ({ matches: false });
  w.requestAnimationFrame = () => 1;
  w.fetch = async (url) => {
    const cleanUrl = url.replace(/^\.\//, "").replace(/^\//, "");
    const filePath = path.join(root, cleanUrl);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      return {
        ok: true,
        json: async () =>
          JSON.parse(content.charCodeAt(0) === 0xfeff ? content.slice(1) : content),
        text: async () => content,
        arrayBuffer: async () => fs.readFileSync(filePath).buffer,
      };
    }
    return { ok: false, status: 404 };
  };

  const backing = new WeakMap();
  const proto = w.HTMLCanvasElement.prototype;
  for (const key of ["width", "height"]) {
    const d = Object.getOwnPropertyDescriptor(proto, key);
    Object.defineProperty(proto, key, {
      get: d.get,
      set(value) {
        d.set.call(this, value);
        if (backing.has(this)) backing.get(this)[key] = value;
      },
      configurable: true,
    });
  }
  proto.getContext = function () {
    if (!backing.has(this))
      backing.set(this, createCanvas(this.width, this.height));
    return backing.get(this).getContext("2d");
  };
  proto.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    width: 390,
    height: 620,
  });
  w.HTMLElement.prototype.setPointerCapture = function (id) {
    this.capture = id;
  };
  w.HTMLElement.prototype.hasPointerCapture = function (id) {
    return this.capture === id;
  };
  w.HTMLElement.prototype.releasePointerCapture = function () {
    this.capture = null;
  };

  const ready = new Promise((resolve) =>
    w.addEventListener("DOMContentLoaded", resolve, { once: true }),
  );
  for (const file of scripts)
    w.eval(fs.readFileSync(path.join(root, "js", file + ".js"), "utf8"));
  await ready;
  assert.equal(errors.length, 0, errors.map((e) => e.message).join("\n"));

  const g = w.Resonance.game;
  const settle = () =>
    new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        if (!g.ui.nav.pending || Date.now() - start > 500) resolve();
        else w.setTimeout(check, 10);
      };
      w.setTimeout(check, 25);
    });
  const click = async (id) => {
    const el = w.document.getElementById(id);
    assert(el, id + " exists");
    el.click();
    await settle();
  };
  const keydown = (key) => {
    const e = new w.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
    w.dispatchEvent(e);
  };

  return { dom, w, g, R: w.Resonance, click, settle, keydown };
}

(async () => {
  console.log("Starte Pruefungen fuer Release-Readiness...");

  // -------------------------------------------------------------
  // Test 1: Doppelte Hintergrundmusik verhindern (js/audio.js)
  // -------------------------------------------------------------
  {
    console.log("Test 1: Hintergrundmusik...");
    const { R } = await setup();
    const audio = new R.Audio();

    // Mock AudioContext
    let activeSources = 0;
    const createdSources = [];
    class MockSource {
      constructor() {
        this.buffer = null;
        this.onended = null;
        this.started = false;
        this.stopped = false;
        createdSources.push(this);
      }
      connect() {}
      disconnect() {}
      start() {
        this.started = true;
        activeSources++;
      }
      stop() {
        if (this.started && !this.stopped) {
          this.stopped = true;
          activeSources--;
        }
      }
      end() {
        if (this.started && !this.stopped) {
          this.stopped = true;
          activeSources--;
        }
        if (this.onended) this.onended();
      }
    }
    const mockCtx = {
      state: "running",
      currentTime: 0,
      sampleRate: 44100,
      destination: {},
      createGain: () => ({ gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} }, connect() {} }),
      createDynamicsCompressor: () => ({ threshold: { value: 0 }, ratio: { value: 1 }, connect() {} }),
      createBuffer: () => ({ getChannelData: () => new Float32Array(100) }),
      createBufferSource: () => new MockSource(),
      resume: async () => {},
      suspend: async () => {},
    };
    audio.ctx = mockCtx;
    audio.effectsGain = mockCtx.createGain();
    audio.musicGain = mockCtx.createGain();

    // Drei Tracks simulieren
    const track1 = { id: 1 }, track2 = { id: 2 }, track3 = { id: 3 };

    // Track 1 wird geladen und startet
    audio.musicTracks.push(track1);
    audio.startMusic();
    assert.equal(activeSources, 1, "Genau eine Musikquelle nach erstem Track");
    assert.equal(createdSources.length, 1);
    const source1 = createdSources[0];

    // Weitere Playlist-Dateien laden verzoegert nach
    audio.musicTracks.push(track2);
    audio.musicTracks.push(track3);

    // loadMusic() beendet und ruft erneut startMusic() auf
    audio.startMusic();
    assert.equal(activeSources, 1, "Keine doppelte Quelle nach weiterem startMusic()-Aufruf");
    assert.equal(createdSources.length, 1, "Keine neue Audioquelle erzeugt waehrend Musik laeuft");

    // Ausschalten der Musik
    audio.setMusicVolume(0);
    assert.equal(activeSources, 0, "Musik stoppt bei Lautstaerke 0");
    assert.equal(audio.musicSource, null);

    // Wieder einschalten der Musik
    audio.setMusicVolume(0.8);
    assert.equal(activeSources, 1, "Genau eine Musikquelle nach Wiedereinschalten");
    assert.equal(createdSources.length, 2);

    // Tab-Sichtbarkeit: visibilitychange wenn bereits Musik laeuft
    audio.startMusic();
    assert.equal(activeSources, 1, "Keine zusaetzliche Quelle bei wiederholtem Startversuch");

    // Track-Ende (onended): startet naechsten Track
    const currentSource = audio.musicSource;
    currentSource.end();
    assert.equal(activeSources, 1, "Nach Track-Ende laeuft genau eine neue Musikquelle");
    assert.equal(createdSources.length, 3);

    // Veralteter onended-Callback nach stopMusic(): darf keine Quelle starten
    const activeSrcBeforeStop = audio.musicSource;
    audio.stopMusic();
    assert.equal(activeSources, 0, "stopMusic stoppt die Quelle");
    // Altes onended feuert verzoegert
    if (activeSrcBeforeStop.onended) activeSrcBeforeStop.onended();
    assert.equal(activeSources, 0, "Veraltetes onended startet keine neue Quelle");

    // Einzelner Track wiederholt sich zuverlaessig
    audio.musicTracks = [track1];
    audio.musicIndex = -1;
    audio.startMusic();
    assert.equal(activeSources, 1, "Single-Track gestartet");
    const singleSrc1 = audio.musicSource;
    assert.equal(singleSrc1.buffer, track1);
    singleSrc1.end();
    assert.equal(activeSources, 1, "Single-Track laeuft nach onended weiter");
    assert.equal(audio.musicSource.buffer, track1, "Single-Track wiederholt sich");
    audio.stopMusic();
    console.log("  PASS: Audio-Duplikate, Lebenszyklus und Single-Track-Wiederholung");
  }

  // -------------------------------------------------------------
  // Test 2: JSON-Import mit UTF-8-BOM (js/editor.js)
  // -------------------------------------------------------------
  {
    console.log("Test 2: JSON-Import mit UTF-8-BOM...");
    const { g } = await setup();
    const editor = g.editor;

    // Vorherigen Stand sichern
    editor.reset();
    assert.equal(editor.layout.orbs.length, 0);

    // 1. Datei mit echtem UTF-8-BOM aus Repository (levels/24.json)
    const bomFile = fs.readFileSync(path.join(root, "levels", "24.json"), "utf8");
    assert(bomFile.charCodeAt(0) === 0xfeff, "levels/24.json enthaelt UTF-8-BOM");
    const resBOM = editor.importLayout(bomFile);
    assert(resBOM.success, "Import von levels/24.json mit BOM erfolgreich: " + resBOM.error);
    assert(editor.layout.orbs.length > 0, "Orbs wurden in den Entwurf geladen");
    const orbCountAfterBOM = editor.layout.orbs.length;

    // 2. Gueltige JSON-Datei ohne BOM (levels/01.json)
    const noBomFile = fs.readFileSync(path.join(root, "levels", "01.json"), "utf8");
    assert(noBomFile.charCodeAt(0) !== 0xfeff, "levels/01.json hat kein BOM");
    const resNoBOM = editor.importLayout(noBomFile);
    assert(resNoBOM.success, "Import von levels/01.json ohne BOM erfolgreich");

    // 3. Tatsaechlich ungueltiges JSON
    const currentLayoutCopy = JSON.stringify(editor.layout);
    const resInvalid = editor.importLayout("{\ninvalid json: 123");
    assert.equal(resInvalid.success, false, "Ungueltiges JSON wird abgelehnt");
    assert.equal(resInvalid.error, "Ungültiges JSON-Format.");
    assert.equal(JSON.stringify(editor.layout), currentLayoutCopy, "Entwurf bleibt bei ungueltigem JSON unveraendert");

    // 4. Nicht-JSON / ungueltige Datei
    const resEmpty = editor.importLayout(null);
    assert.equal(resEmpty.success, false);
    assert.equal(JSON.stringify(editor.layout), currentLayoutCopy, "Entwurf bleibt bei null unveraendert");

    console.log("  PASS: UTF-8-BOM-Import, gueltige und ungueltige Dateien");
  }

  // -------------------------------------------------------------
  // Test 3: Escape-Navigation (js/ui.js, js/input.js)
  // -------------------------------------------------------------
  {
    console.log("Test 3: Escape-Navigation...");
    const { g, click, keydown, settle, w } = await setup();

    // 1. Im Hauptmenue bewirkt Escape nichts
    assert.equal(g.ui.nav.route.screen, "home");
    assert.equal(g.ui.nav.depth, 0);
    keydown("Escape");
    await settle();
    assert.equal(g.ui.nav.route.screen, "home");
    assert.equal(g.ui.nav.route.panel, undefined);
    assert(g.paused);

    // 2. In Moduswahl fuehrt Escape eine Ebene zurueck zum Hauptmenue
    await click("start");
    assert.equal(g.ui.nav.route.screen, "modes");
    assert.equal(g.ui.nav.depth, 1);
    keydown("Escape");
    await settle();
    assert.equal(g.ui.nav.route.screen, "home");
    assert.equal(g.ui.nav.depth, 0);
    assert.equal(g.ui.nav.route.panel, undefined, "Kein unsichtbares Pausenmenue im Hintergrund");

    // 3. In Levelauswahl fuehrt Escape eine Ebene zurueck zur Moduswahl
    await click("start");
    await click("mode-level");
    assert.equal(g.ui.nav.route.screen, "levels");
    keydown("Escape");
    await settle();
    assert.equal(g.ui.nav.route.screen, "modes");
    keydown("Escape");
    await settle();
    assert.equal(g.ui.nav.route.screen, "home");

    // 4. Im laufenden Spiel oeffnet Escape das Pausenmenue
    await click("start");
    await click("mode-random");
    assert.equal(g.ui.nav.route.screen, "game");
    assert.equal(g.ui.nav.route.panel, undefined);
    assert(!g.paused);
    keydown("Escape");
    await settle();
    assert.equal(g.ui.nav.route.panel, "pause");
    assert(g.paused);

    // 5. Bei geoeffnetem Menue schliesst Escape die oberste Menueebene
    await click("settings");
    assert.equal(g.ui.nav.route.panel, "settings");
    keydown("Escape");
    await settle();
    assert.equal(g.ui.nav.route.panel, "pause");
    keydown("Escape");
    await settle();
    assert.equal(g.ui.nav.route.panel, undefined);
    assert(!g.paused);

    // 6. Waehrend eines aktiven Ziehvorgangs bricht Escape nur den Ziehvorgang ab
    g.input.drag = { id: 1, pointer: 1, ox: 50, oy: 50, x: 80, y: 80, valid: true };
    keydown("Escape");
    await settle();
    assert.equal(g.input.drag, null, "Ziehvorgang wurde abgebrochen");
    assert.equal(g.ui.nav.route.panel, undefined, "Escape bei aktivem Drag oeffnet kein Pausenmenue");
    assert(!g.paused, "Spiel bleibt unpausiert nach Drag-Abbruch");

    // 7. Im Editor oeffnet Escape das Pausenmenue
    await click("pause");
    await click("go-home");
    await click("start");
    await click("mode-editor");
    assert.equal(g.ui.nav.route.screen, "editor");
    assert.equal(g.ui.nav.route.panel, undefined);
    keydown("Escape");
    await settle();
    assert.equal(g.ui.nav.route.panel, "pause");
    keydown("Escape");
    await settle();
    assert.equal(g.ui.nav.route.panel, undefined);

    // 8. Editor: Offene Palette schliessen vor Pause
    const palette = w.document.getElementById("orb-palette");
    palette.hidden = false;
    keydown("Escape");
    await settle();
    assert.equal(palette.hidden, true, "Palette wird durch Escape geschlossen");
    assert.equal(g.ui.nav.route.panel, undefined, "Pausenmenue nicht zusaetzlich geoeffnet");

    console.log("  PASS: Escape-Navigation in allen Ansichten, Menues und waehrend Ziehen");
  }

  // -------------------------------------------------------------
  // Test 4: Levelauswahl ohne verfuegbaren Browserspeicher (js/ui.js)
  // -------------------------------------------------------------
  {
    console.log("Test 4: Levelauswahl ohne verfuegbaren Speicher...");
    const { g, click, settle, w } = await setup();

    // Storage so praeparieren, dass Zugriff Ausnahmen wirft
    const originalGetItem = w.localStorage.getItem;
    const originalSetItem = w.localStorage.setItem;

    w.localStorage.getItem = () => {
      throw new Error("SecurityError: Access is denied for this document");
    };
    w.localStorage.setItem = () => {
      throw new Error("SecurityError: Access is denied for this document");
    };

    await click("start");
    await click("mode-level");
    assert.equal(g.ui.nav.route.screen, "levels");

    // Pruefen, dass Level gerendert wurden trotz Storage-Fehler
    const grid = w.document.querySelector(".levels-grid");
    assert(grid, "Level-Grid wurde erfolgreich gerendert");
    const buttons = grid.querySelectorAll(".level-button");
    assert(buttons.length > 0, "Level-Schaltflaechen sind vorhanden");

    // Ein Level anklicken und starten
    const firstLevelBtn = buttons[0];
    firstLevelBtn.click();
    await settle();
    assert.equal(g.ui.nav.route.screen, "game");
    assert.equal(g.state.mode, "level");

    // Korrupte gespeicherte Sterne pruefen
    w.localStorage.getItem = () => "ungueltiges-json{{{";
    const corruptStars = g.ui.getSavedStars();
    assert.equal(Object.keys(corruptStars).length, 0, "Korrupter Speicherstand liefert leeres Objekt ohne Fehler");

    w.localStorage.getItem = () => JSON.stringify(["nicht-ein-objekt"]);
    const arrayStars = g.ui.getSavedStars();
    assert.equal(Object.keys(arrayStars).length, 0, "Array-Speicherstand liefert leeres Objekt ohne Fehler");

    // Storage wiederherstellen und echten Speicherstand testen
    w.localStorage.getItem = originalGetItem;
    w.localStorage.setItem = originalSetItem;

    w.localStorage.setItem("resonance.stars.v1", JSON.stringify({ "01": 3, "02": 2 }));
    const validStars = g.ui.getSavedStars();
    assert.equal(validStars["01"], 3);
    assert.equal(validStars["02"], 2);
    console.log("  PASS: Fehlerhafter und gesperrter Storage bricht Levelauswahl nicht ab");
  }

  // -------------------------------------------------------------
  // Test 5: Geschlossene Tutorialtexte bei Fortsetzen (js/ui.js)
  // -------------------------------------------------------------
  {
    console.log("Test 5: Tutorialtexte nicht erneut nach Pause...");
    const { g, click, settle, w, R } = await setup();

    // Level 1 laden (hat Tutorialtext)
    await click("start");
    await click("mode-level");
    await R.LevelLoader.loadAll();
    await g.ui.renderLevels();
    const lvl1Btn = w.document.querySelector('[data-level="01"]');
    assert(lvl1Btn, "Level 1 Button existiert");
    lvl1Btn.click();
    await settle();

    const overlay = w.document.getElementById("tutorial-overlay");
    assert.equal(overlay.hidden, false, "Tutorialtext wird zu Beginn des Levels angezeigt");

    // Tutorial schliessen
    overlay.click();
    await settle();
    assert.equal(overlay.hidden, true, "Tutorialtext wurde geschlossen");

    // Spiel pausieren
    await click("pause");
    assert.equal(g.ui.nav.route.panel, "pause");

    // Weiterspielen
    await click("resume");
    assert.equal(g.ui.nav.route.panel, undefined);
    assert.equal(overlay.hidden, true, "Tutorialtext erscheint nach Weiterspielen NICHT erneut");

    // Anleitung oeffnen und zurueckkehren
    await click("pause");
    await click("guide");
    assert.equal(g.ui.nav.route.panel, "help");
    w.history.back();
    await settle();
    assert.equal(g.ui.nav.route.panel, "pause");
    await click("resume");
    assert.equal(overlay.hidden, true, "Tutorialtext bleibt auch nach Anleitung geschlossen");

    // Bei Neustart / Retry darf er wieder erscheinen
    await click("pause");
    await click("retry");
    assert.equal(overlay.hidden, false, "Tutorialtext erscheint bei bewusst neu gestartetem Level wieder");

    console.log("  PASS: Tutorialtexte bleiben nach Schliessen ueber Pause/Menues geschlossen");
  }

  // -------------------------------------------------------------
  // Test 6: Richtige Ueberschrift im Editor-Pausenmenue (js/ui.js)
  // -------------------------------------------------------------
  {
    console.log("Test 6: Ueberschrift im Editor-Pausenmenue...");
    const { g, click, settle, w, R } = await setup();

    // 1. Zuerst Kampagnenlevel 1 spielen
    await click("start");
    await click("mode-level");
    await R.LevelLoader.loadAll();
    await g.ui.renderLevels();
    const lvl1Btn = w.document.querySelector('[data-level="01"]');
    assert(lvl1Btn, "Level 1 Button existiert");
    lvl1Btn.click();
    await settle();

    // Im Level 1 Pausenmenue muss "Level 1 – Pause" stehen
    await click("pause");
    let heading = w.document.querySelector("#modal-content .menu-heading h2");
    assert(heading.textContent.includes("Level 1"), "Ueberschrift im Kampagnenlevel zeigt Level 1");

    // Zum Hauptmenue und in den Editor wechseln
    await click("go-home");
    await click("start");
    await click("mode-editor");
    assert.equal(g.ui.nav.route.screen, "editor");

    // Editor-Pausenmenue oeffnen
    g.ui.pause();
    heading = w.document.querySelector("#modal-content .menu-heading h2");
    assert.equal(heading.textContent, "Pause", "Ueberschrift im Editor heisst 'Pause' und nicht mehr 'Level 1 – Pause'");

    console.log("  PASS: Ueberschrift im Editor-Pausenmenue orientiert sich an aktueller Ansicht");
  }

  // -------------------------------------------------------------
  // Test 7: Unnoetiges Neuzeichnen reduzieren (js/game.js)
  // -------------------------------------------------------------
  {
    console.log("Test 7: Render-Schleife Optimierung...");
    const { g } = await setup();

    let drawCalls = 0;
    const origDraw = g.renderer.draw.bind(g.renderer);
    g.renderer.draw = (...args) => {
      drawCalls++;
      return origDraw(...args);
    };

    // Im Hauptmenue (covered): darf nicht zeichnen
    drawCalls = 0;
    g.frame(100);
    g.frame(116);
    g.frame(133);
    assert.equal(drawCalls, 0, "Kein Zeichnen im Hauptmenue hinter verdeckender Ansicht");

    // In Moduswahl (covered): darf nicht zeichnen
    g.ui.nav.route = { screen: "modes" };
    g.frame(150);
    assert.equal(drawCalls, 0, "Kein Zeichnen in der Moduswahl");

    // In Levelauswahl (covered): darf nicht zeichnen
    g.ui.nav.route = { screen: "levels" };
    g.frame(166);
    assert.equal(drawCalls, 0, "Kein Zeichnen in der Levelauswahl");

    // Im Spiel im pausierten Zustand: zeichnet nur bei Bedarf (dirty)
    g.ui.nav.route = { screen: "game" };
    g.paused = true;
    g.dirty = true;
    drawCalls = 0;
    g.frame(183);
    assert.equal(drawCalls, 1, "Zeichnet einmalig bei dirty im pausierten Zustand");
    g.frame(200);
    g.frame(216);
    assert.equal(drawCalls, 1, "Kein fortlaufendes Neuzeichnen im pausierten unveraenderten Zustand");

    // Bei Drag im pausierten Zustand wird gezeichnet
    const testOrb = g.state.orbs[0];
    g.input.drag = { id: testOrb.id, ox: testOrb.x, oy: testOrb.y, x: testOrb.x + 5, y: testOrb.y + 5, valid: true };
    g.frame(233);
    assert.equal(drawCalls, 2, "Bei aktiver Ziehinteraktion wird gezeichnet");
    g.input.drag = null;

    // Im laufenden Spiel wird kontinuierlich gezeichnet
    g.paused = false;
    drawCalls = 0;
    g.frame(250);
    g.frame(266);
    assert.equal(drawCalls, 2, "Im laufenden Spiel wird fortlaufend gezeichnet");

    console.log("  PASS: Render-Schleife vermeidet unnoetiges Neuzeichnen");
  }

  console.log("\nALLE RELEASE-READINESS TESTS ERFOLGREICH BESTANDEN!");
})().catch((err) => {
  console.error("TEST FEHLGESCHLAGEN:", err);
  process.exit(1);
});
