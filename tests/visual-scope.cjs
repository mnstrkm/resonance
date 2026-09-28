// Checks requested rendering boundaries against the exact upstream base commit.
const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { createCanvas } = require("@napi-rs/canvas");
const root = path.resolve(__dirname, ".."),
  base = "4592091f6c5aea8bbff465d326ee29331c8e99ff";
function before(f) {
  return execFileSync("git", ["show", base + ":" + f], { cwd: root });
}
function load(old) {
  const env = { console };
  env.window = env;
  vm.createContext(env);
  for (const name of ["config", "orb-types", "renderer"])
    vm.runInContext(
      (old
        ? before("js/" + name + ".js")
        : fs.readFileSync(path.join(root, "js", name + ".js"))
      ).toString(),
      env,
    );
  return env.Resonance;
}
const old = load(true),
  next = load(false);
function paint(R, type, state) {
  const c = createCanvas(120, 120),
    ctx = c.getContext("2d");
  ctx.fillStyle = "#111b25";
  ctx.fillRect(0, 0, 120, 120);
  ctx.scale(3, 3);
  R.Renderer.prototype.orb.call(
    { ctx },
    {
      id: 2,
      type,
      state,
      x: 20,
      y: 20,
      r: 13,
      timer: 0.2,
      boost: 1,
      copied: type === "pearl" ? "blue" : null,
    },
    2.3,
  );
  return ctx.getImageData(0, 0, 120, 120).data;
}
for (const type of Object.keys(old.OrbTypes))
  for (const state of ["idle", "charging"]) {
    const a = paint(old, type, state),
      b = paint(next, type, state);
    if (type !== "gold")
      assert.deepEqual(b, a, type + " " + state + " unchanged");
    else
      for (let y = 0; y < 120; y++)
        for (let x = 0; x < 120; x++)
          if (Math.hypot(x - 60, y - 60) > 18) {
            const i = 4 * (y * 120 + x);
            assert.deepEqual(
              b.slice(i, i + 4),
              a.slice(i, i + 4),
              "gold only symbol changes",
            );
          }
  }
// These core files must stay byte-identical to the downloaded version.
for (const f of [
  "js/config.js",
  "js/physics.js",
  "js/chain.js",
  "js/generator.js",
  "js/particles.js",
  "js/audio.js",
  "assets/icon.svg",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "assets/apple-touch-icon.png",
  "manifest.webmanifest",
])
  assert(
    fs.readFileSync(path.join(root, f)).equals(before(f)),
    f + " unchanged",
  );
console.log(
  "PASS: active/charging Orbs pixel-identical except gold center; balance, physics, abilities, generation, audio and icons unchanged.",
);
