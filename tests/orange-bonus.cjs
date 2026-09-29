// Self-contained gameplay checks: node tests/orange-bonus.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const context = { window: null, crypto: globalThis.crypto };
context.window = context;
vm.createContext(context);
for (const file of ["config", "orb-types", "generator", "level-data", "state", "physics", "chain"]) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js", file + ".js"), "utf8"), context);
}
const R = context.Resonance;
const charge = R.Config.gameplay.chargeTime;

function scenario(type, targetDistance) {
  const layout = {
    seed: 7,
    count: 3,
    orbs: [
      { id: 0, type: "orange", x: 40, y: 100 },
      { id: 1, type, x: 100, y: 100 },
      { id: 2, type: "red", x: 100 + targetDistance, y: 100 },
    ],
  };
  const s = R.createState(7, "editor", layout);
  const events = [];
  const chain = new R.Chain(s, (name, data) => events.push({ name, ...data }));
  chain.activate(s.orbs[0]);
  chain.step(charge);
  assert.equal(s.orbs[1].boost, 1.8);
  assert.equal(s.orbs[1].rangeBoost, 1.2);
  return { s, chain, events };
}

const red = scenario("red", 110);
red.chain.step(charge);
assert.equal(red.s.orbs[2].state, "charging");
assert(red.s.orbs[2].vx > R.Config.abilities.red.force * .5);
assert(red.events.some((e) => e.name === "ability" && e.type === "red" && e.radius === 120));
assert.equal(red.s.orbs[2].boost, 1);
assert.equal(red.s.orbs[2].rangeBoost, 1); // No bonus passed on by red.

const blue = scenario("blue", 110);
blue.chain.step(charge);
assert.equal(blue.s.orbs[2].state, "charging");
assert(blue.s.orbs[2].vx < 0); // Stronger pull, not a separate faster timer.

const violet = scenario("violet", 110);
violet.chain.step(charge);
assert(violet.s.orbs[2].vx < 0);
violet.chain.step(R.Config.abilities.violet.pullTime);
assert.equal(violet.s.orbs[2].state, "charging");
assert(violet.events.some((e) => e.name === "burst" && e.radius === 120));

const green = scenario("green", 195); // Within 175 * 1.2, outside normal 175.
green.chain.step(charge);
assert.equal(green.s.orbs[1].vx, -R.Config.abilities.green.recoil * 1.8);
assert.equal(green.s.orbs[2].state, "charging");
assert.equal(green.s.orbs[2].vx, R.Config.abilities.green.force * 1.8);
assert(green.events.some((e) => e.name === "ability" && e.type === "green" && e.radius === 210));

const nextOrange = scenario("orange", 80);
nextOrange.chain.step(charge);
assert.equal(nextOrange.s.orbs[2].state, "charging");
assert(nextOrange.events.some((e) => e.name === "ability" && e.type === "orange" && e.radius === 84));

const gold = scenario("gold", 195);
gold.chain.step(charge);
assert.equal(gold.chain.s.projectiles[0].type, "gold");
assert.equal(gold.chain.s.projectiles[0].target, gold.s.orbs[2]);
assert(gold.events.some((e) => e.name === "ability" && e.type === "gold" && e.radius === 0));

const pearl = scenario("pearl", 80);
assert.equal(pearl.s.orbs[1].copied, "orange");
pearl.chain.step(charge);
assert(pearl.events.some((e) => e.name === "ability" && e.type === "orange" && e.radius === 70));
assert.equal(pearl.s.orbs[2].state, "idle");

console.log("PASS: Orange boost, red/blue/violet range, green range/impact/recoil, orange aura, gold and clone behavior");
