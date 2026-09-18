/**
 * Headless balance harness. Runs bots through whole shifts and prints how each
 * strategy ends, so tuning is not guesswork.
 *
 *   node scripts/sim.mjs
 *   node scripts/sim.mjs --deep
 */
import { FIGHTERS } from "../src/fighters.js";
import { LAYERS, RELEASED_AT, Shift } from "../src/game.js";

const DT = 1 / 30;
const deep = process.argv.includes("--deep");

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const need = (id) => LAYERS.find((l) => l.id === id).need;

/** Plays the stack in order, waits for the band, reads when murky. */
function skilled(s, snap) {
  if (!s.canAct()) return null;
  const murky = snap.murk > 0 && !snap.revealing;
  if (murky && s.elapsed - (s._lastRead ?? -99) > 7) {
    s._lastRead = s.elapsed;
    return "notice";
  }
  if (snap.incoming && snap.incoming.target === "attention" && snap.support >= 36) return "orient";
  if (!snap.inBand) return null;
  const ready = snap.readyId;
  const layer = (id) => snap.layers.find((l) => l.id === id);
  if (snap.charge > 74 && snap.support < 50) return "contact";
  if (snap.support < need(ready) + 8) return "contact";
  if (snap.loudId !== ready) return "allow";
  if (layer(ready).guard > 26) return "allow";
  if (ready === "feeling") return snap.support < 58 ? "contact" : "digest";
  if (ready === "fine") return snap.support < 66 ? "contact" : "drop";
  if (ready === "attention" && layer("attention").hold > 20) return "orient";
  return "soften";
}

/** Impatient: fixes before allowing, never grounds, ignores the beat. */
function rusher(s, snap) {
  if (!s.canAct()) return null;
  const ready = snap.readyId;
  if (ready === "fine") return "drop";
  if (ready === "feeling") return "digest";
  if (ready === "attention") return "orient";
  return "soften";
}

/** Bracing only: the tempting shortcut. */
function bracer(s, snap) {
  if (!s.canAct()) return null;
  return snap.incoming || snap.charge > 40 ? "brace" : "soften";
}

/** Goes straight for the top of the stack. Looks serene, isn't. */
function bypasser(s, snap) {
  if (!s.canAct()) return null;
  if (snap.incoming) return "brace";
  return "drop";
}

/** Grounds and allows, but never reads and never waits for the beat. */
function careful(s, snap) {
  if (!s.canAct()) return null;
  const ready = snap.readyId;
  if (snap.support < need(ready) + 10) return "contact";
  if (snap.layers.find((l) => l.id === snap.loudId).guard > 28) return "allow";
  if (ready === "feeling") return "digest";
  if (ready === "fine") return "drop";
  return "soften";
}

/** Does nothing. Baseline for "is the office actually a threat". */
function idle() {
  return null;
}

const BOTS = { skilled, careful, rusher, bracer, bypasser, idle };

/**
 * Human pacing: a person taps roughly once a second, not every 520ms, and
 * misses the band sometimes. Same decisions as `skilled`, slower hands.
 */
function paced(inner, gapMs, bandMissRate) {
  return (s, snap) => {
    if (s.elapsed - (s._lastAct ?? -99) < gapMs / 1000) return null;
    const relaxed = bandMissRate > 0 && s.rng() < bandMissRate;
    const move = relaxed ? inner(s, { ...snap, inBand: true }) : inner(s, snap);
    if (move) s._lastAct = s.elapsed;
    return move;
  };
}

function run(fighterId, bot, seed) {
  const s = new Shift(fighterId, { rng: mulberry32(seed), deep });
  let snap = s.snapshot();
  let guard = 0;
  while (!snap.ending && guard < 60 * 60 * 5) {
    guard += 1;
    const move = BOTS[bot](s, snap);
    if (move) snap = s.act(move);
    snap = s.tick(DT);
  }
  return {
    ending: snap.ending || "timeout",
    at: Math.round(s.elapsed),
    released: snap.released,
    quota: snap.quota,
    support: snap.support,
    noise: +snap.noise.toFixed(2),
    selfNumb: +s.selfNumb.toFixed(2),
    tally: snap.tally,
  };
}

const avg = (xs) => Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;

BOTS.human = paced(skilled, 950, 0.3);
BOTS.humanSlow = paced(skilled, 1400, 0.5);
BOTS.humanCareful = paced(careful, 1000, 0.6);

const rows = [];
for (const bot of Object.keys(BOTS)) {
  const tallies = {};
  const at = [];
  const rel = [];
  const numb = [];
  for (const f of FIGHTERS) {
    for (const seed of [1, 7, 13]) {
      const r = run(f.id, bot, seed);
      tallies[r.ending] = (tallies[r.ending] || 0) + 1;
      at.push(r.at);
      rel.push(r.released);
      numb.push(r.selfNumb);
      if (bot === "skilled" && r.ending !== "deep") {
        rows.push(`   skilled miss: ${f.id} seed ${seed} → ${r.ending} (released ${r.released}/5, ` +
          `support ${r.support}, noise ${r.noise}, forced ${r.tally.forced}, flood ${r.tally.flood})`);
      }
    }
  }
  const total = Object.values(tallies).reduce((a, b) => a + b, 0);
  const parts = Object.entries(tallies)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ${v}/${total}`)
    .join("  ");
  console.log(bot.padEnd(9), parts.padEnd(30), `ends ~${avg(at)}s  released ~${avg(rel)}/5  self-numb ~${avg(numb)}`);
}
if (rows.length) console.log(rows.join("\n"));

const sample = run("grimace", "skilled", 3);
console.log(
  "\ngrimace/skilled sample:",
  JSON.stringify({ ...sample, layersReleased: `${sample.released}/${LAYERS.length}`, RELEASED_AT }),
);
