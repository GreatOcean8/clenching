import { getFighter } from "./fighters.js";

const clamp = (n, a = 0, b = 100) => Math.max(a, Math.min(b, n));
const clamp01 = (n) => Math.max(0, Math.min(1, n));

/**
 * The stack. Lower rows carry the upper ones: `need` is how much Ground has to
 * be under a layer before it can actually let go instead of being pushed.
 */
export const LAYERS = [
  { id: "muscle", name: "Muscle", where: "jaw, shoulders, sit bones", need: 0 },
  { id: "breath", name: "Breath", where: "parked high, half a sip", need: 26 },
  { id: "attention", name: "Attention", where: "welded to the ping", need: 34 },
  { id: "feeling", name: "Feeling", where: "heat with armor on it", need: 54 },
  { id: "fine", name: "Fine", where: "the story that you're okay", need: 66 },
];

export const LAYER_IDS = LAYERS.map((l) => l.id);
export const RELEASED_AT = 15;

export const INSTRUMENTS = [
  {
    id: "contact",
    name: "Contact",
    key: "Q",
    tag: "weight down",
    hint: "Floor, chair, hands. Builds Ground. Never wrong.",
  },
  {
    id: "allow",
    name: "Allow",
    key: "W",
    tag: "hold with the loud one",
    hint: "Stops arguing with the loudest layer, then shows you what's under it.",
  },
  {
    id: "soften",
    name: "Soften",
    key: "E",
    tag: "2% off the ready one",
    hint: "Releases the lowest held layer — if armor is down and Ground is under it.",
  },
  {
    id: "orient",
    name: "Orient",
    key: "R",
    tag: "room, not spotlight",
    hint: "Unglues Attention and kills an incoming ping. Needs some Ground.",
  },
  {
    id: "digest",
    name: "Digest",
    key: "T",
    tag: "let the heat move",
    hint: "Turns Charge into Room. Wants a floor and no armor first.",
  },
  {
    id: "drop",
    name: "Drop It",
    key: "Y",
    tag: "the story, last",
    hint: "Ends the shift clean — only once everything under it has settled.",
  },
];

export const NOTICE = {
  id: "notice",
  name: "Notice",
  key: "N",
  tag: "read the stack",
  hint: "Names what's loud and what's actually ready. Costs a beat.",
};

export const BRACE = {
  id: "brace",
  name: "Brace",
  key: "Space",
  tag: "cancel it, feed Quota",
  hint: "Kills the incoming hit instantly. Loud, effective, blinding.",
};

export const ALL_ACTIONS = [NOTICE, ...INSTRUMENTS, BRACE];

export const BLOCKS = [
  {
    id: "standup",
    name: "9:40 STANDUP",
    seconds: 44,
    gap: 6,
    every: [4.2, 5.8],
    targets: ["muscle", "breath", "muscle", "attention"],
    power: 1,
    subtlety: 0,
  },
  {
    id: "pings",
    name: "11:15 PING STORM",
    seconds: 48,
    gap: 6,
    every: [3.4, 4.6],
    targets: ["attention", "muscle", "feeling", "attention", "breath"],
    power: 1.3,
    subtlety: 1,
  },
  {
    id: "meeting",
    name: "2:50 THE MEETING",
    seconds: 52,
    gap: 0,
    every: [2.8, 3.9],
    targets: ["feeling", "fine", "attention", "feeling", "breath", "fine"],
    power: 1.55,
    subtlety: 2,
  },
];

/** Office pressure. The wording is the tell: it says which layer it lands on. */
const PRESSURE = {
  muscle: [
    "Chair scrapes behind you. Shoulders answer before you do.",
    "“Quick sync?” Your jaw signs the contract.",
    "Someone drops a laptop shut. Sit bones lift half an inch.",
  ],
  breath: [
    "Your name, in a thread, with three replies. Breath parks at the top.",
    "Unread count with a red dot. You take half a sip of air and keep it.",
    "The doc has comments. Air stops on the way in.",
  ],
  attention: [
    "PING. It believes it is urgent. It is a rectangle.",
    "Notification slides in. The room narrows to a corner of a screen.",
    "A little red badge. Everything else in the building goes grey.",
  ],
  feeling: [
    "The tone of that message. Heat behind the sternum, lid on.",
    "Someone says “as discussed.” A hot ring around the chest.",
    "Feedback lands sideways. Something in you goes armored and warm.",
  ],
  fine: [
    "MEETING! Everyone is fine. You are extra fine.",
    "“How's it going?” You hear yourself say great, easily.",
    "Quota sign hums approvingly. You are a person who handles it.",
  ],
};

const LOUD_HALF_LIFE = 6.5;

export class Shift {
  constructor(fighterId, opts = {}) {
    const f = getFighter(fighterId);
    this.rng = opts.rng || Math.random;
    this.deep = !!opts.deep;
    this.fighterId = f.id;
    this.fighterName = f.name;

    this.hold = { ...f.start.hold };
    this.guard = { ...f.start.guard };
    this.support = f.start.support;
    this.field = f.start.field;
    this.charge = f.start.charge;
    this.noise = f.start.noise + (this.deep ? 0.16 : 0);

    this.blockIndex = 0;
    this.phaseKind = "block";
    this.phaseLeft = BLOCKS[0].seconds;
    this.elapsed = 0;
    this.quota = 0;

    this.loud = this.lowestHeld();
    this.loudAge = 0;
    this.incoming = null;
    this.nextEventIn = 4.2;
    this.revealLeft = this.deep ? 0 : 2.4;
    this.recovery = 0;
    this.settleFlash = 0;

    this.tally = {
      reads: 0,
      clean: 0,
      offbeat: 0,
      forced: 0,
      float: 0,
      flood: 0,
      bypass: 0,
      braces: 0,
      hits: 0,
      met: 0,
    };

    /* Numbing you did to yourself, as opposed to arriving already quiet. */
    this.selfNumb = 0;
    this.ending = null;
    this.banner = "";
    this.log = "The office is weather. Bottom of the stack first.";
    this.flash = null;
    this.fxSeq = 0;
    this.shake = 0;
    this.beatCue = false;
    this.wasInBand = false;
    this.microIn = 11;
  }

  /* ————— reading the stack ————— */

  lowestHeld() {
    for (const id of LAYER_IDS) if (this.hold[id] > RELEASED_AT) return id;
    return "fine";
  }

  released(id) {
    return this.hold[id] <= RELEASED_AT && this.guard[id] <= 34;
  }

  releasedCount() {
    return LAYER_IDS.filter((id) => this.released(id)).length;
  }

  settledUnder(id) {
    const i = LAYER_IDS.indexOf(id);
    return LAYER_IDS.slice(0, i).every((x) => this.released(x));
  }

  get subtlety() {
    const base = BLOCKS[this.blockIndex]?.subtlety ?? 0;
    return base + (this.deep ? 1 : 0);
  }

  /** How murky each row reads: 0 clear, 1 fuzzy, 2 unreadable. */
  murk() {
    if (this.revealLeft > 0) return 0;
    const n = this.noise + this.subtlety * 0.1;
    if (n <= 0.32) return 0;
    if (n <= 0.58) return 1;
    return 2;
  }

  /* ————— the settle band ————— */

  get bandWidth() {
    const w =
      0.19 + this.support * 0.0015 + this.field * 0.0009 - this.noise * 0.1 - this.subtlety * 0.012;
    return Math.max(0.1, Math.min(0.44, w));
  }

  get beatPhase() {
    const period = 3.4;
    return (this.elapsed % period) / period;
  }

  get bandCenter() {
    return 0.62;
  }

  inBand() {
    let d = Math.abs(this.beatPhase - this.bandCenter);
    if (d > 0.5) d = 1 - d;
    return d <= this.bandWidth / 2;
  }

  /* ————— time ————— */

  tick(dt) {
    if (this.ending) return this.snapshot();
    this.elapsed += dt;
    this.recovery = Math.max(0, this.recovery - dt);
    this.revealLeft = Math.max(0, this.revealLeft - dt);
    this.shake = Math.max(0, this.shake - dt * 2.2);
    this.settleFlash = Math.max(0, this.settleFlash - dt * 1.6);

    const band = this.inBand();
    this.beatCue = band && !this.wasInBand;
    this.wasInBand = band;

    const gap = this.phaseKind === "gap";
    const hot = this.charge > 58;
    this.support = clamp(this.support - dt * (gap ? 0.25 : hot ? 1.2 : 0.62));
    this.field = clamp(this.field - dt * (gap ? 0.3 : 0.78));
    this.charge = clamp(this.charge - dt * (gap ? 1.1 : 0.42));
    if (!gap) this.quota = clamp(this.quota + dt * 0.22);

    /* A floor under you does quiet work on its own. */
    if (this.support >= 58 && this.charge <= 40) {
      const ready = this.lowestHeld();
      this.hold[ready] = clamp(this.hold[ready] - dt * 0.7);
      this.guard[ready] = clamp(this.guard[ready] - dt * 0.7);
      this.noise = clamp01(this.noise - dt * 0.02);
    }

    /* Hot and unsupported: the pattern recruits downward. */
    if (this.charge > 66 && this.support < 44 && !gap) {
      this.hold.muscle = clamp(this.hold.muscle + dt * 2.6);
      this.hold.breath = clamp(this.hold.breath + dt * 2);
      this.noise = clamp01(this.noise + dt * 0.008);
    }

    this.loudAge += dt;
    if (this.loudAge > LOUD_HALF_LIFE) this.loud = this.lowestHeld();

    if (this.deep) {
      this.microIn -= dt;
      if (this.microIn <= 0) {
        this.microIn = 10 + this.rng() * 8;
        const done = LAYER_IDS.filter((id) => this.released(id));
        if (done.length) {
          const id = done[Math.floor(this.rng() * done.length)];
          this.hold[id] = clamp(this.hold[id] + 9 + this.rng() * 6);
          this.guard[id] = clamp(this.guard[id] + 6);
        }
      }
    }

    if (!gap) {
      if (this.incoming) {
        this.incoming.left -= dt;
        if (this.incoming.left <= 0) this.landPressure();
      } else {
        this.nextEventIn -= dt;
        if (this.nextEventIn <= 0) this.queuePressure();
      }
    }

    this.phaseLeft -= dt;
    if (this.phaseLeft <= 0) this.advancePhase();
    this.checkEnd();
    return this.snapshot();
  }

  advancePhase() {
    const block = BLOCKS[this.blockIndex];
    if (this.phaseKind === "block") {
      if (block.gap > 0) {
        this.phaseKind = "gap";
        this.phaseLeft = block.gap;
        this.incoming = null;
        this.banner = "BREATH GAP";
        this.log = "Nothing is due for six seconds. This is where the work sticks.";
        this.fxSeq += 1;
        return;
      }
      this.endShift();
      return;
    }
    this.blockIndex += 1;
    if (this.blockIndex >= BLOCKS.length) {
      this.endShift();
      return;
    }
    this.phaseKind = "block";
    this.phaseLeft = BLOCKS[this.blockIndex].seconds;
    this.nextEventIn = 3.4;
    this.banner = BLOCKS[this.blockIndex].name;
    this.log = "The floor gets thinner from here. Readings get quieter too.";
    this.fxSeq += 1;
  }

  /* ————— office pressure ————— */

  queuePressure() {
    const block = BLOCKS[this.blockIndex];
    const target = block.targets[Math.floor(this.rng() * block.targets.length)];
    const lines = PRESSURE[target];
    this.incoming = {
      target,
      text: lines[Math.floor(this.rng() * lines.length)],
      warn: 2.2,
      left: 2.2,
      power: block.power,
      /* After the first block nothing is labelled. The sentence still says it. */
      shown: this.subtlety === 0,
    };
    this.fxSeq += 1;
  }

  landPressure() {
    const ev = this.incoming;
    this.incoming = null;
    this.nextEventIn = ev ? BLOCKS[this.blockIndex].every[0] +
      this.rng() * (BLOCKS[this.blockIndex].every[1] - BLOCKS[this.blockIndex].every[0]) : 4;
    if (!ev) return;

    const soft = clamp01(1 - this.support * 0.0035 - this.field * 0.002);
    const guardBonus = this.guard[ev.target] > 55 ? 1.15 : 1;
    const mult = Math.max(0.28, soft * guardBonus) * ev.power;

    this.hold[ev.target] = clamp(this.hold[ev.target] + 20 * mult);
    this.guard[ev.target] = clamp(this.guard[ev.target] + 10 * mult);
    this.charge = clamp(this.charge + 15 * mult);
    /* A hit that finds a floor barely counts for the office. */
    this.quota = clamp(this.quota + 1.8 + 3.2 * Math.min(1, mult));
    this.loud = ev.target;
    this.loudAge = 0;
    this.tally.hits += 1;
    if (mult < 0.45) this.tally.met += 1;

    this.log =
      mult < 0.45
        ? `${ev.text} It arrives and finds a floor.`
        : ev.text;
    this.banner = mult < 0.45 ? "MET" : "LANDS";
    this.shake = mult < 0.45 ? 0.2 : 0.8;
    this.flash = mult < 0.45 ? "met" : "hit";
    this.fxSeq += 1;
  }

  /* ————— instruments ————— */

  canAct() {
    return !this.ending && this.recovery <= 0;
  }

  act(id) {
    if (this.ending) return this.snapshot();
    if (this.recovery > 0) {
      this.log = "Hands are still upstairs. That tap arrives late.";
      this.banner = "LATE";
      this.fxSeq += 1;
      return this.snapshot();
    }

    const band = this.inBand();
    const gap = this.phaseKind === "gap";
    /* Off the beat still works. It just works less. */
    let power = band ? 1 : 0.62;
    if (gap) power *= 1.35;

    this.recovery = id === "notice" ? 0.9 : 0.52;
    this.flash = null;
    this.banner = "";
    this.shake = 0.05;

    switch (id) {
      case "notice":
        this.doNotice();
        break;
      case "contact":
        this.doContact(power, band);
        break;
      case "allow":
        this.doAllow(power, band);
        break;
      case "soften":
        this.doSoften(power, band);
        break;
      case "orient":
        this.doOrient(power, band);
        break;
      case "digest":
        this.doDigest(power, band);
        break;
      case "drop":
        this.doDrop(power, band);
        break;
      case "brace":
        this.doBrace();
        break;
      default:
        break;
    }

    this.fxSeq += 1;
    this.checkEnd();
    return this.snapshot();
  }

  scoreBeat(band, clean) {
    if (!clean) return;
    if (band) this.tally.clean += 1;
    else this.tally.offbeat += 1;
  }

  doNotice() {
    this.revealLeft = 4.6;
    this.noise = clamp01(this.noise - 0.06);
    this.tally.reads += 1;
    const loud = LAYERS.find((l) => l.id === this.loud);
    const ready = LAYERS.find((l) => l.id === this.lowestHeld());
    const same = loud.id === ready.id;
    this.log = same
      ? `You look. ${loud.name} is loud, and it's the one that's ready.`
      : `You look. ${loud.name} is loud. ${ready.name} is the one that's ready.`;
    this.banner = "READ";
  }

  doContact(power, band) {
    /* Ground gets harder to add the more of it you already have. */
    const room = 1 - this.support / 150;
    this.support = clamp(this.support + 13 * power * room);
    this.hold.muscle = clamp(this.hold.muscle - 6 * power);
    this.guard.muscle = clamp(this.guard.muscle - 4 * power);
    this.charge = clamp(this.charge - 5 * power);
    this.noise = clamp01(this.noise - 0.06 * power);
    this.quota = clamp(this.quota - 2);
    this.settleFlash = 0.6;
    this.scoreBeat(band, true);
    this.log = band
      ? "Weight into the mesh. The floor was already doing this for free."
      : "Weight down, slightly early. Some of it lands anyway.";
    this.banner = "GROUND";
  }

  /**
   * Meeting the loud layer is also how you find the quiet one under it, so
   * Allow walks the attention down the stack one step at a time.
   */
  doAllow(power, band) {
    const id = this.loud;
    const l = LAYERS.find((x) => x.id === id);
    const before = this.guard[id];
    this.guard[id] = clamp(this.guard[id] - 20 * power);
    this.support = clamp(this.support + 3 * power);
    this.charge = clamp(this.charge - 7 * power);
    this.scoreBeat(band, true);
    this.settleFlash = 0.4;
    this.banner = "ALLOW";

    const ready = this.lowestHeld();
    if (id !== ready) {
      this.loud = ready;
      this.loudAge = 0;
      const under = LAYERS.find((x) => x.id === ready);
      this.log = `${l.name} stops shouting once you quit arguing with it. Under it: ${under.name.toLowerCase()}.`;
      return;
    }
    this.log =
      before > 30
        ? `You hold with ${l.name.toLowerCase()} instead of fixing it. Armor drops a notch.`
        : `${l.name} is already being allowed. The room widens a little anyway.`;
  }

  doSoften(power, band) {
    const id = this.lowestHeld();
    const l = LAYERS.find((x) => x.id === id);
    const needSupport = l.need + (band ? 0 : 8);
    const guardOk = this.guard[id] <= (band ? 32 : 24);
    const supportOk = this.support >= needSupport;

    if (guardOk && supportOk) {
      this.hold[id] = clamp(this.hold[id] - 15 * power);
      this.guard[id] = clamp(this.guard[id] - 5 * power);
      this.support = clamp(this.support - 2);
      this.charge = clamp(this.charge - 4 * power);
      this.quota = clamp(this.quota - 2);
      this.scoreBeat(band, true);
      this.settleFlash = 1;
      this.log = `Two percent off ${l.name.toLowerCase()}. Something lets go that wasn't asked twice.`;
      this.banner = "SOFTEN";
      return;
    }
    if (!supportOk && this.guard[id] <= 34) {
      this.hold[id] = clamp(this.hold[id] - 6 * power);
      this.support = clamp(this.support - 3);
      this.tally.float += 1;
      this.log = `${l.name} would let go, but there's no floor under it. It hovers.`;
      this.banner = "FLOAT";
      this.flash = "float";
      return;
    }
    this.hold[id] = clamp(this.hold[id] + 8);
    this.guard[id] = clamp(this.guard[id] + 13);
    this.charge = clamp(this.charge + 8);
    this.noise = clamp01(this.noise + 0.07);
    this.selfNumb += 0.07;
    this.support = clamp(this.support - 4);
    this.tally.forced += 1;
    this.log = `You pushed on armor. ${l.name} pushes back. That's a quieter kind of bracing.`;
    this.banner = "FORCED";
    this.flash = "bad";
    this.shake = 0.5;
  }

  doOrient(power, band) {
    if (this.support < (band ? 28 : 34)) {
      this.field = clamp(this.field + 11 * power);
      this.support = clamp(this.support - 7);
      this.hold.attention = clamp(this.hold.attention - 3);
      this.noise = clamp01(this.noise + 0.06);
      this.selfNumb += 0.05;
      this.tally.float += 1;
      this.log = "You went wide with no floor. Lovely view. No legs.";
      this.banner = "FLOAT";
      this.flash = "float";
      return;
    }
    const killed = this.incoming && this.incoming.target === "attention";
    if (killed) {
      this.incoming = null;
      this.nextEventIn = 3.6;
      this.tally.met += 1;
    }
    this.hold.attention = clamp(this.hold.attention - 17 * power);
    this.guard.attention = clamp(this.guard.attention - 8 * power);
    this.field = clamp(this.field + 19 * power);
    this.charge = clamp(this.charge - 7 * power);
    this.scoreBeat(band, true);
    this.settleFlash = 0.7;
    this.log = killed
      ? "Printer. Window edge. Someone's laugh two desks over. The ping loses its grip mid-air."
      : "Printer. Window edge. The spotlight is not the whole building.";
    this.banner = "ROOM";
  }

  doDigest(power, band) {
    const under = this.settledUnder("feeling");
    const ceiling = 58 + this.field * 0.3;
    const ok =
      this.guard.feeling <= (band ? 28 : 22) &&
      this.support >= (band ? 52 : 60) &&
      this.charge <= ceiling;

    if (ok && under) {
      const moved = Math.min(this.charge, 22 * power);
      this.charge = clamp(this.charge - moved);
      this.hold.feeling = clamp(this.hold.feeling - 19 * power);
      this.guard.feeling = clamp(this.guard.feeling - 6 * power);
      this.field = clamp(this.field + moved * 0.4);
      this.support = clamp(this.support - 3);
      this.quota = clamp(this.quota - 3);
      this.scoreBeat(band, true);
      this.settleFlash = 1;
      this.log = "Heat moves instead of being held. It comes out the other side as room.";
      this.banner = "DIGEST";
      return;
    }
    if (ok && !under) {
      this.hold.feeling = clamp(this.hold.feeling - 9 * power);
      this.charge = clamp(this.charge - 6 * power);
      this.log = "Some of the heat moves. The rest is waiting on the layers under it.";
      this.banner = "PARTIAL";
      return;
    }
    this.charge = clamp(this.charge + 15);
    this.guard.feeling = clamp(this.guard.feeling + 12);
    this.hold.muscle = clamp(this.hold.muscle + 9);
    this.noise = clamp01(this.noise + 0.08);
    this.selfNumb += 0.08;
    this.support = clamp(this.support - 6);
    this.tally.flood += 1;
    this.log = "Too much, too early. The heat had no floor to land on, so the jaw took it.";
    this.banner = "FLOOD";
    this.flash = "bad";
    this.shake = 0.7;
  }

  doDrop(power, band) {
    const under = this.settledUnder("fine");
    const ok = under && this.support >= 62 && this.guard.fine <= 28;
    if (ok) {
      this.hold.fine = clamp(this.hold.fine - 38 * power);
      this.guard.fine = clamp(this.guard.fine - 20 * power);
      this.field = clamp(this.field + 15);
      this.charge = clamp(this.charge - 12);
      this.support = clamp(this.support + 4);
      this.quota = clamp(this.quota - 6);
      this.scoreBeat(band, true);
      this.settleFlash = 1.4;
      this.log = "The story about the person doing all this thins out. Same desk. More air.";
      this.banner = "DROPPED";
      return;
    }
    if (under && this.support >= 46) {
      this.hold.fine = clamp(this.hold.fine - 12 * power);
      this.log = "It loosens. Not enough floor to actually put it down yet.";
      this.banner = "PARTIAL";
      return;
    }
    /* Looks like the best move in the game. Reads as calm. Isn't. */
    this.hold.fine = clamp(this.hold.fine - 26);
    this.hold.muscle = clamp(this.hold.muscle + 13);
    this.hold.breath = clamp(this.hold.breath + 11);
    this.support = clamp(this.support - 12);
    this.field = clamp(this.field + 8);
    this.noise = clamp01(this.noise + 0.18);
    this.selfNumb += 0.18;
    this.tally.bypass += 1;
    this.log = "Very peaceful. Also: you are no longer in the room, and the jaw kept working.";
    this.banner = "ABOVE IT";
    this.flash = "bypass";
  }

  doBrace() {
    const had = !!this.incoming;
    this.incoming = null;
    this.nextEventIn = Math.max(this.nextEventIn, 3.2);
    this.quota = clamp(this.quota + 11);
    this.charge = clamp(this.charge - 14);
    this.field = clamp(this.field + 8);
    this.hold.muscle = clamp(this.hold.muscle + 11);
    this.hold.breath = clamp(this.hold.breath + 9);
    this.guard[this.loud] = clamp(this.guard[this.loud] + 16);
    this.support = clamp(this.support - 8);
    this.noise = clamp01(this.noise + 0.13);
    this.selfNumb += 0.13;
    this.tally.braces += 1;
    this.shake = 1;
    this.flash = "brace";
    this.log = had
      ? "GRIP. The ping dies mid-air. Quota loves you. So does your jaw, unfortunately."
      : "GRIP, at nothing. Quota still counts it. The jaw definitely counts it.";
    this.banner = "HANDLED";
  }

  /* ————— endings ————— */

  grade() {
    const released = this.releasedCount();
    const sloppy = this.tally.forced + this.tally.flood + this.tally.bypass;
    if (released === 5 && sloppy <= 1 && this.support >= 60 && this.noise <= 0.34) return "deep";
    if (this.tally.bypass >= 2 || this.selfNumb >= 0.34) return "fine";
    if (released >= 4 && this.support >= 38) return "enough";
    return "hover";
  }

  checkEnd() {
    if (this.ending) return;
    if (this.quota >= 100) {
      this.ending = "quota";
      this.banner = "QUOTA ACHIEVED";
      this.log = "The sign is extremely proud of you. Your hands are still upstairs.";
      return;
    }
    /*
     * Numbing never ends the shift on its own — it just takes the readings
     * away. Contact and Notice are the way back, and both stay available.
     */
    if (this.releasedCount() === 5 && this.hold.fine <= RELEASED_AT) {
      const g = this.grade();
      this.ending = g === "deep" ? "deep" : "enough";
      this.banner = g === "deep" ? "SAME DESK" : "CLEAR ENOUGH";
      this.log = "Stack down. Shift still going. Nothing had to be defeated.";
    }
  }

  endShift() {
    if (this.ending) return;
    this.phaseLeft = 0;
    this.ending = this.grade();
    this.banner = ENDINGS[this.ending].title;
    this.log = "5:00. The building keeps humming without your help.";
  }

  /* ————— view model ————— */

  snapshot() {
    const murk = this.murk();
    const ready = this.lowestHeld();
    const layers = LAYERS.map((l, i) => {
      const known = murk === 0 || (murk === 1 && i <= 2);
      return {
        id: l.id,
        name: l.name,
        where: l.where,
        need: l.need,
        hold: Math.round(this.hold[l.id]),
        guard: Math.round(this.guard[l.id]),
        released: this.released(l.id),
        supported: this.support >= l.need,
        isReady: l.id === ready,
        isLoud: l.id === this.loud,
        known,
        murk,
      };
    });
    return {
      fighterId: this.fighterId,
      fighterName: this.fighterName,
      faceId: this.faceId(),
      layers,
      readyId: ready,
      loudId: this.loud,
      support: Math.round(this.support),
      field: Math.round(this.field),
      charge: Math.round(this.charge),
      quota: Math.round(this.quota),
      noise: this.noise,
      murk,
      revealing: this.revealLeft > 0,
      blockName: this.phaseKind === "gap" ? "BREATH GAP" : BLOCKS[this.blockIndex].name,
      blockIndex: this.blockIndex,
      blockCount: BLOCKS.length,
      isGap: this.phaseKind === "gap",
      phaseLeft: Math.max(0, Math.ceil(this.phaseLeft)),
      incoming: this.incoming
        ? {
            target: this.incoming.target,
            targetName: LAYERS.find((l) => l.id === this.incoming.target).name,
            text: this.incoming.text,
            shown: this.incoming.shown,
            frac: clamp01(this.incoming.left / this.incoming.warn),
          }
        : null,
      beatPhase: this.beatPhase,
      bandCenter: this.bandCenter,
      bandWidth: this.bandWidth,
      inBand: this.inBand(),
      beatCue: this.beatCue,
      beatVisible: this.subtlety < 2,
      settleFlash: this.settleFlash,
      recovery: this.recovery,
      released: this.releasedCount(),
      tally: { ...this.tally },
      log: this.log,
      banner: this.banner,
      flash: this.flash,
      shake: this.shake,
      fxSeq: this.fxSeq,
      ending: this.ending,
      deep: this.deep,
    };
  }

  /** The meme face is a readout too. */
  faceId() {
    if (this.noise > 0.62) return this.hold.fine > 60 ? "void" : "flat";
    if (this.charge > 74) return this.support < 34 ? "deranged" : "anxious";
    if (this.hold.muscle > 78) return "agonized";
    if (this.support < 18) return "defeated";
    return this.fighterId;
  }
}

export const ENDINGS = {
  quota: {
    kind: "quota",
    title: "QUOTA ACHIEVED",
    kicker: "A trophy shaped like fluorescent light.",
    body: "You handled everything. The sign is thrilled. Nothing in you was met, and the same shift is on the calendar tomorrow at the same time.",
    next: "Bracing works. That's the problem with it.",
  },
  fine: {
    kind: "fine",
    title: "FINE",
    kicker: "The readings went quiet because you turned them down.",
    body: "Calm-looking, from the outside. Somewhere under that, a jaw is still holding a door shut, and you can no longer feel which door.",
    next: "Quiet isn't the same as here. Come back and put weight down first.",
  },
  hover: {
    kind: "hover",
    title: "STILL HOVERING",
    kicker: "Not a loss. An unfinished landing.",
    body: "The shift ended with most of the stack still holding. Your shoulders may still be carrying the ceiling. It was never theirs.",
    next: "Same office tomorrow. Start lower than feels interesting.",
  },
  enough: {
    kind: "enough",
    title: "CLEAR ENOUGH",
    kicker: "Most of it got met. Honestly.",
    body: "Some of it you pushed, some of it you actually allowed, and enough of it let go that the room is bigger than the screen again. This is what a good day looks like.",
    next: "Residue is fine. Residue you can feel is not a problem.",
  },
  deep: {
    kind: "deep",
    title: "SAME DESK",
    kicker: "Nothing was defeated. That's the whole trick.",
    body: "Muscle, breath, attention, feeling, and the story about the person doing all this — all of it put down, in order, without forcing. Same cheap mesh. Same coffee. Quieter neon. You are extremely here.",
    next: "This is the one that's hard to fake. You didn't.",
  },
};

export const CUE = {
  line: "Where are you holding right now?",
  hint: "Jaw. Breath. Whatever just got quiet when you read that.",
  seconds: 4,
};

export function qualityNote(tally, ending) {
  if (ending === "quota") return "Every brace worked. That's why it's expensive.";
  if (tally.bypass >= 2) return "Twice you left instead of landing. It looked identical from outside.";
  if (tally.forced >= 3) return "A lot of pushing on armor. Allow first and Soften does the work for you.";
  if (tally.flood >= 2) return "Heat before floor. Build Ground, then let it move.";
  if (tally.float >= 3) return "Plenty of open. Not much under it.";
  if (tally.braces >= 4) return "Bracing carried the shift. It also blinded the readings.";
  if (tally.reads === 0) return "No reads at all. Bold. Try one Notice at the top of a wave.";
  if (tally.clean >= 8) return "Most of that was on the beat. It shows.";
  return "Met more than you pushed. That's the direction.";
}
