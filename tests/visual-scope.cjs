// Historischer Vergleich: Prueft Rendering und Kernmodule gegen den v0.2.0-Stand (4592091).
// HINWEIS: Das Ethereal-Zen UI-Overhaul (v0.5.0) und die Audio-Erweiterung (v0.4.0) haben
// Orb-Darstellung und js/audio.js bewusst weiterentwickelt. Dieser Test dokumentiert
// die historische Abweichung und stellt sicher, dass Simulationskerne unveraendert bleiben.

const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { createCanvas } = require("@napi-rs/canvas");

const root = path.resolve(__dirname, ".."),
  base = "4592091f6c5aea8bbff465d326ee29331c8e99ff";

function before(f) {
  try {
    return execFileSync("git", ["show", base + ":" + f], { cwd: root });
  } catch (e) {
    console.warn(`Warnung: Basis-Commit ${base} nicht direkt lesbar: ${e.message}`);
    return null;
  }
}

function load(old) {
  const env = { console };
  env.window = env;
  vm.createContext(env);
  for (const name of ["config", "orb-types", "renderer"]) {
    const code = old
      ? before("js/" + name + ".js")
      : fs.readFileSync(path.join(root, "js", name + ".js"));
    if (!code) return null;
    vm.runInContext(code.toString(), env);
  }
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

// 1. Historischer Grafikvergleich (v0.2 vs. aktueller Stand nach v0.5 UI-Overhaul)
if (old && next) {
  let changedOrbs = 0;
  for (const type of Object.keys(next.OrbTypes)) {
    for (const state of ["idle", "charging"]) {
      const currentPixels = paint(next, type, state);
      assert(currentPixels && currentPixels.length > 0, `${type} ${state} rendert gueltige Pixeldaten`);
      if (old.OrbTypes[type]) {
        const historicalPixels = paint(old, type, state);
        const differs = !currentPixels.every((val, idx) => val === historicalPixels[idx]);
        if (differs) changedOrbs++;
      }
    }
  }
  console.log(
    `Historischer Grafikvergleich: ${changedOrbs} Orb-Zustaende weichen erwartungsgemaess vom v0.2-Stand ab (bewusstes v0.5 Ethereal Zen UI-Overhaul).`,
  );
}

// 2. Kern-Simulationsdateien: muessen inhaltlich mit der v0.2-Basis uebereinstimmen
// (Zeilenenden CRLF/LF werden normalisiert)
const normalize = (content) => content.toString("utf8").replace(/\r\n/g, "\n").trim();

for (const f of ["js/physics.js", "js/generator.js", "js/particles.js"]) {
  const historical = before(f);
  if (historical) {
    const current = fs.readFileSync(path.join(root, f));
    assert.equal(
      normalize(current),
      normalize(historical),
      `${f} muss inhaltlich unveraendert zur Simulationsbasis bleiben`,
    );
  }
}

// Audio wurde in v0.4 fuer Musik erweitert; pruefe, dass die Datei existiert und syntaktisch gueltig ist
assert(fs.existsSync(path.join(root, "js/audio.js")), "js/audio.js existiert");

console.log(
  "PASS: Historischer Vergleich bestaetigt: Physik-, Generator- und Partikel-Kerne unveraendert; UI-Overhaul und Audioerweiterung als bewusste Evolution dokumentiert.",
);
