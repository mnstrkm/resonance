// Run with NODE_PATH pointing to jsdom and @napi-rs/canvas installations.
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
  const errors = [],
    vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errors.push(e));
  const dom = new JSDOM(
      fs.readFileSync(path.join(root, "index.html"), "utf8"),
      {
        runScripts: "outside-only",
        url: "https://example.test/resonance/" + search,
        virtualConsole: vc,
      },
    ),
    w = dom.window;
  w.ResizeObserver = class {
    observe() {}
  };
  w.matchMedia = () => ({ matches: false });
  w.requestAnimationFrame = () => 1;
  const backing = new WeakMap(),
    proto = w.HTMLCanvasElement.prototype;
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
  const settle = () => new Promise((resolve) => w.setTimeout(resolve, 20));
  const click = async (id) => {
    const el = w.document.getElementById(id);
    assert(el, id + " exists");
    el.click();
    await settle();
  };
  const back = async () => {
    w.history.back();
    await settle();
  };
  const pointer = (
    type,
    x,
    y,
    element = w.document.getElementById("arena"),
    id = 1,
  ) => {
    const e = new w.Event(type, { bubbles: true, cancelable: true });
    Object.assign(e, { pointerId: id, clientX: x, clientY: y, button: 0 });
    element.dispatchEvent(e);
  };
  return { dom, w, g, R: w.Resonance, click, back, pointer, settle, errors };
}
(async () => {
  const t = await setup(),
    { w, g, R, click, back, pointer, settle } = t;
  assert.equal(R.version, "0.3.0");
  assert(g.paused);
  assert.equal(g.ui.nav.depth, 0);
  await click("start");
  assert.equal(g.ui.nav.route.screen, "game");
  assert(!g.paused);
  const seed = g.state.seed;
  await click("pause");
  assert(g.paused);
  const depth = g.ui.nav.depth;
  await click("guide");
  assert.equal(g.ui.nav.depth, depth + 1);
  assert.equal(w.document.activeElement.id, "close-panel");
  assert.equal(w.document.getElementById("modal-content").scrollTop, 0);
  assert.equal(w.document.querySelectorAll(".legend-row").length, 7);
  await back();
  assert.equal(g.ui.nav.route.panel, "pause");
  assert(g.paused);
  await back();
  assert.equal(g.ui.nav.route.panel, undefined);
  assert(!g.paused);
  assert.equal(g.state.seed, seed);
  // Repeated opens/closes must not require multiple back gestures.
  for (let i = 0; i < 5; i++) {
    await click("pause");
    await click("resume");
    assert.equal(g.ui.nav.depth, 1);
    assert(!g.paused);
  }
  await click("pause");
  await click("settings");
  await back();
  assert.equal(g.ui.nav.route.panel, "pause");
  await click("go-home");
  assert.equal(g.ui.nav.depth, 0);
  assert(g.paused);
  await click("open-editor");
  assert.equal(g.ui.nav.route.screen, "editor");
  assert.equal(g.ui.nav.depth, 1);
  assert.equal(g.editor.layout.count, 0);
  assert(w.document.getElementById("editor-play").disabled);
  assert.equal(w.document.getElementById("editor-export"), null);
  await click("palette-toggle");
  const green = w.document.querySelector('[data-type="green"]');
  // Palette overlaps the arena: tapping must select, never place an orb underneath.
  pointer("pointerdown", 80, 550, green);
  pointer("pointerup", 80, 550, green);
  assert.equal(g.editor.type, "green");
  assert.equal(g.editor.layout.count, 0);
  for (const [x, y] of [
    [80, 100],
    [180, 100],
    [280, 100],
  ]) {
    pointer("pointerdown", x, y);
    pointer("pointerup", x, y);
  }
  assert.equal(g.editor.layout.count, 3);
  assert(g.editor.layout.orbs.every((o) => o.type === "green"));
  assert.equal(w.document.getElementById("required").textContent, "3");
  // Move beyond gameplay radius; rejected overlaps/outside leave original intact.
  pointer("pointerdown", 80, 100);
  pointer("pointermove", 80, 350);
  pointer("pointerup", 80, 350);
  assert(Math.abs(g.editor.layout.orbs[0].y - 350) < 1e-8);
  pointer("pointerdown", 80, 350);
  pointer("pointerup", 180, 100);
  assert(Math.abs(g.editor.layout.orbs[0].y - 350) < 1e-8);
  pointer("pointerdown", 80, 350);
  pointer("pointerup", -30, 350);
  assert(Math.abs(g.editor.layout.orbs[0].x - 80) < 1e-8);
  pointer("pointerdown", 80, 350);
  pointer("pointermove", 100, 450);
  pointer("pointercancel", 100, 450);
  assert(Math.abs(g.editor.layout.orbs[0].y - 350) < 1e-8);
  const draft = JSON.stringify(g.editor.layout);
  await click("editor-reset");
  assert.equal(g.editor.layout.count, 0);
  await click("editor-undo");
  assert.equal(JSON.stringify(g.editor.layout), draft);
  // Drag a palette item directly into the arena, then remove this selected orb.
  pointer("pointerdown", 80, 660, green);
  pointer("pointermove", 280, 450, green);
  pointer("pointerup", 280, 450, green);
  assert.equal(g.editor.layout.count, 4);
  await click("editor-delete");
  assert.equal(g.editor.layout.count, 3);
  await click("editor-undo");
  assert.equal(g.editor.layout.count, 4);
  await click("editor-undo");
  assert.equal(g.editor.layout.count, 3);
  const original = JSON.stringify(g.editor.layout);
  await click("editor-play");
  assert.equal(g.state.required, 3);
  assert.equal(g.state.impulses, 3);
  assert.equal(g.state.mode, "editor");
  assert(!g.paused);
  assert.equal(g.ui.nav.depth, 2);
  const o = g.state.orbs[0];
  pointer("pointerdown", o.x, o.y);
  pointer("pointerup", o.x + 20, o.y);
  assert.equal(g.state.impulses, 2);
  for (let i = 0; i < 2400 && !g.paused; i++) g.step(1 / 120);
  assert.equal(JSON.stringify(g.editor.layout), original);
  if (g.ui.nav.route.panel === "result") {
    await click("secondary");
  } else {
    await click("pause");
    await click("next-action");
  }
  assert.equal(g.ui.nav.route.screen, "editor");
  assert.equal(JSON.stringify(g.editor.layout), original);
  await click("editor-play");
  await click("pause");
  await click("retry");
  assert.equal(g.state.impulses, 3);
  assert.equal(g.state.energy, 0);
  assert.equal(JSON.stringify(g.state.snapshot), original);
  await back();
  assert.equal(g.ui.nav.route.screen, "editor");
  // 20 arbitrary Orbs use 20 energy and still three impulses.
  g.editor.reset();
  for (let i = 0; i < 20; i++)
    assert(
      g.editor.add("green", 55 + (i % 5) * 65, 60 + Math.floor(i / 5) * 80),
    );
  await click("editor-play");
  assert.equal(g.state.required, 20);
  assert.equal(g.state.impulses, 3);
  await back();
  assert.equal(g.editor.layout.count, 20);
  const persisted = JSON.parse(
    w.localStorage.getItem("resonance.editor.draft.v1"),
  );
  assert.equal(persisted.count, 20);
  const exported = R.LevelData.export(g.editor.layout);
  assert.equal(exported.formatVersion, 1);
  assert.equal(exported.rules.target, "all");
  assert.equal(exported.layout.count, 20);
  assert(R.LevelData.validate(exported.layout));
  assert.equal(
    R.LevelData.validate({ seed: 0, orbs: [{ type: "green", x: 1, y: 1 }] }),
    null,
  );
  assert.equal(
    R.LevelData.validate({
      seed: 0,
      orbs: [{ type: "invalid", x: 100, y: 100 }],
    }),
    null,
  );
  const restored = new R.Editor(g);
  assert.equal(restored.layout.count, 20);
  await click("pause");
  await click("go-home");
  await click("start");
  assert.equal(g.state.mode, "resonance");
  assert(g.state.orbs.length >= 10 && g.state.orbs.length <= 15);
  // Genuine loss/win result paths and history back from results.
  g.state.phase = "chain";
  g.state.impulses = 0;
  g.state.orbs.forEach((o) => {
    o.vx = o.vy = 0;
  });
  for (let i = 0; i < 100 && !g.paused; i++) g.step(1 / 120);
  assert.equal(g.ui.nav.route.panel, "result");
  assert.equal(g.state.phase, "lost");
  await click("next");
  assert.equal(g.state.phase, "ready");
  assert.equal(g.ui.nav.depth, 1);
  g.state.phase = "chain";
  g.state.energy = g.state.required;
  g.state.orbs.forEach((o) => {
    o.state = "spent";
    o.vx = o.vy = 0;
  });
  g.state.jobs = [];
  g.state.projectiles = [];
  for (let i = 0; i < 500 && !g.paused; i++) g.step(1 / 120);
  assert.equal(g.state.phase, "won");
  assert.equal(g.ui.nav.depth, 1);
  await back();
  assert.equal(g.ui.nav.route.screen, "home");
  assert(g.paused);
  // Native Canvas rendering, including empty editor (zero energy target).
  g.renderer.draw(g.state, g.particles, null);
  g.editor.reset();
  g.renderer.draw(g.editor.preview, { items: [], effects: [] }, null);
  assert.equal(t.errors.length, 0, t.errors.map((e) => e.message).join("\n"));
  t.dom.window.close();
  const creator = await setup("?creator=1");
  assert(creator.w.document.getElementById("editor-export"));
  creator.dom.window.close();
  console.log(
    "PASS: start/pause/help/settings/history, repeated back, pointer editing, invalid drops, undo/reset/delete, 3/20 target, three impulses, retry/editor snapshot, persistence/export validation, random game, win/loss and empty rendering.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
