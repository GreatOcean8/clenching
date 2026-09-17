import { getFighter } from "./fighters.js";

const clamp = (n, a = 0, b = 100) => Math.max(a, Math.min(b, n));

export const ROUND_SECONDS = 60;

export const SOFT_MOVES = [
  {
    id: "chair",
    name: "Feel the chair",
    key: "Q",
    hint: "Hips. Thighs. Cheap mesh doing honest work.",
  },
  {
    id: "okay",
    name: "It's okay",
    key: "W",
    hint: "Wrap around the clench. Don't fix it.",
  },
  {
    id: "soften",
    name: "Soften 2%",
    key: "E",
    hint: "Belly takes a tiny shift. Two percent is a lot.",
  },
  {
    id: "widen",
    name: "Widen",
    key: "R",
    hint: "Printer. Distant laugh. Window. Periphery.",
  },
  {
    id: "story",
    name: "Drop the story",
    key: "T",
    hint: "The plot about you can thin. Desk stays.",
  },
];

export const CLENCH_MOVES = [
  { id: "tighten", name: "Tighten", key: "A", hint: "Jaw says I got this." },
  { id: "push", name: "Push Through", key: "S", hint: "Move the ticket. Shoulders move in." },
  { id: "prove", name: "Prove It", key: "D", hint: "The room shrinks to a performance." },
  { id: "doomscroll", name: "Doomscroll", key: "F", hint: "Thumb finds a smaller world." },
  { id: "ruminate", name: "Ruminate", key: "G", hint: "Rehearsing a meeting that already left." },
  { id: "please", name: "People-Please", key: "H", hint: "Smiling with the wrong muscles." },
];

export const ALL_MOVES = [...SOFT_MOVES, ...CLENCH_MOVES];

const OFFICE_EVENTS = [
  {
    text: "A ping. It thinks it is urgent. It is a rectangle.",
    grip: 3,
    field: -8,
    quota: 3,
  },
  {
    text: "MEETING! The sign is so excited for you.",
    grip: 5,
    field: -6,
    quota: 5,
  },
  {
    text: "Quota sign hums. It would like a snack.",
    quota: 7,
    grip: 2,
  },
  {
    text: "The calendar just invented a version of you.",
    grip: 6,
    contact: -4,
    quota: 5,
  },
  {
    text: "Fluorescent lights buzz. They can be a sound, not a verdict.",
    field: -3,
  },
  {
    text: "Just one more. Famous last tab.",
    grip: 4,
    field: -5,
    quota: 4,
  },
  {
    text: "Productivity neon flickers like it knows your name. It doesn't.",
    grip: 3,
    quota: 3,
  },
];

export class Game {
  constructor(fighterId) {
    const f = getFighter(fighterId);
    this.fighterId = f.id;
    this.fighterName = f.name;
    this.grip = f.grip;
    this.contact = f.contact;
    this.field = f.field;
    this.quota = 0;
    this.timeLeft = ROUND_SECONDS;
    this.feltChair = false;
    this.heldIt = false;
    this.softened = false;
    this.widened = false;
    this.whooshCount = 0;
    this.creep = 0;
    this.fog = 0;
    this.turns = 0;
    this.combo = [];
    this.log = "Office pressure isn't a villain. It's weather. You still have a chair.";
    this.banner = "";
    this.shake = 0;
    this.whoosh = false;
    this.hollowHit = false;
    this.displayJuice = 0.25;
    this.ending = null;
    this.officeAt = 7.2;
    this.clenchHeat = 0;
    this.faceOverride = null;
    this.lastDelta = { grip: 0, contact: 0, field: 0, quota: 0 };
    this.inputUntil = 0;
    this.fxSeq = 0;
    this.ritual = { chair: false, okay: false, soften: false, widen: false, story: false };
  }

  snapshot() {
    return {
      fighterId: this.fighterId,
      fighterName: this.fighterName,
      faceId: this.faceOverride || this.fighterId,
      grip: Math.round(this.grip),
      contact: Math.round(this.contact),
      field: Math.round(this.field),
      quota: Math.round(this.quota),
      timeLeft: Math.max(0, Math.ceil(this.timeLeft)),
      fog: this.fog,
      creep: this.creep,
      ritual: { ...this.ritual },
      combo: [...this.combo],
      log: this.log,
      banner: this.banner,
      shake: this.shake,
      whoosh: this.whoosh,
      hollowHit: this.hollowHit,
      displayJuice: this.displayJuice,
      ending: this.ending,
      lastDelta: { ...this.lastDelta },
      delayMs: this.delayMs(),
      fxSeq: this.fxSeq,
    };
  }

  delayMs() {
    return Math.round(Math.min(0.38, this.fog) * 520);
  }

  canInput(now = Date.now()) {
    return now >= this.inputUntil && !this.ending;
  }

  tick(dt) {
    if (this.ending) return this.snapshot();
    this.timeLeft -= dt;
    this.officeAt -= dt;
    this.clenchHeat = Math.max(0, this.clenchHeat - dt * 0.18);
    this.shake = Math.max(0, this.shake - dt * 2.4);
    this.fog = clamp(this.fog - dt * 0.08, 0, 1);
    if (this.officeAt <= 0) {
      this.officePulse();
      this.officeAt = 3.6 + Math.random() * 1.6;
    }
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.resolveTimeUp();
    }
    this.checkEnd();
    return this.snapshot();
  }

  officePulse() {
    const ev = OFFICE_EVENTS[Math.floor(Math.random() * OFFICE_EVENTS.length)];
    const grounded = this.contact >= 50;
    const wide = this.field >= 58;
    const landing = this.feltChair;
    const g = (ev.grip || 0) * (landing ? 0.12 : grounded ? 0.28 : 1);
    const c = (ev.contact || 0) * (grounded ? 0.35 : 1);
    const f = (ev.field || 0) * (wide ? 0.3 : 1);
    let q = (ev.quota || 0) * 0.4;
    if (this.clenchHeat > 0.35) q += 9;
    if (landing || this.softened) q *= 0.15;
    this.applyDelta({ grip: g, contact: c, field: f, quota: q });
    this.log = ev.text;
    this.banner = "";
    this.whoosh = false;
    this.hollowHit = this.clenchHeat > 0.35;
    this.fxSeq += 1;
    this.displayJuice = grounded ? 0.2 : 0.4;
    if (!grounded && this.clenchHeat > 0.35) this.fog = clamp(this.fog + 0.05, 0, 1);
  }

  applyDelta({ grip = 0, contact = 0, field = 0, quota = 0 }) {
    this.grip = clamp(this.grip + grip);
    this.contact = clamp(this.contact + contact);
    this.field = clamp(this.field + field);
    this.quota = clamp(this.quota + quota);
    this.lastDelta = {
      grip: Math.round(grip),
      contact: Math.round(contact),
      field: Math.round(field),
      quota: Math.round(quota),
    };
  }

  move(id, now = Date.now()) {
    if (this.ending) return this.snapshot();
    if (!this.canInput(now)) {
      this.log = "Hands are still upstairs. The tap arrives late.";
      this.banner = "FOG";
      return this.snapshot();
    }
    const delay = this.delayMs();
    this.inputUntil = now + 110 + Math.min(delay, 240);
    this.turns += 1;
    this.whoosh = false;
    this.hollowHit = false;
    this.banner = "";
    this.shake = 0;
    this.fxSeq += 1;

    const clenchIds = new Set(CLENCH_MOVES.map((m) => m.id));
    if (clenchIds.has(id)) this.doClench(id);
    else this.doSoft(id);

    this.updateCreepFace();
    this.checkEnd();
    return this.snapshot();
  }

  breakLanding() {
    this.heldIt = false;
    this.softened = false;
    this.widened = false;
    this.combo = [];
    if (this.contact < 32) this.feltChair = false;
  }

  doClench(id) {
    this.breakLanding();
    this.fog = clamp(this.fog + 0.08, 0, 1);
    this.shake = 0.7;
    this.displayJuice = 0.95;
    this.hollowHit = true;
    this.clenchHeat = 1;

    const hits = {
      tighten: {
        d: { grip: 14, contact: -8, field: -3, quota: 12 },
        log: "Jaw clocks in overtime. It looks like strength.",
        banner: "TIGHT",
      },
      push: {
        d: { grip: 12, contact: -5, field: -6, quota: 18 },
        log: "You moved the ticket. Your shoulders moved in. The sign liked that.",
        banner: "PUSH",
      },
      prove: {
        d: { grip: 16, contact: -6, field: -10, quota: 16 },
        log: "Proving it. The room shrinks to an audience of fluorescent lights.",
        banner: "PROVE",
      },
      doomscroll: {
        d: { grip: 8, contact: -5, field: -18, quota: 9 },
        log: "Thumb finds a smaller world. Sit bones go unanswered.",
        banner: "SCROLL",
      },
      ruminate: {
        d: { grip: 11, contact: -3, field: -14, quota: 7 },
        log: "Rehearsing a meeting that already left the building.",
        banner: "LOOP",
      },
      please: {
        d: { grip: 10, contact: -14, field: -6, quota: 11 },
        log: "A smile that is really a brace. They get the yes. You leave the chair.",
        banner: "YES?",
      },
    };
    const hit = hits[id];
    this.applyDelta(hit.d);
    this.log = hit.log;
    this.banner = hit.banner;
  }

  doSoft(id) {
    this.displayJuice = 0.22;
    this.shake = 0.08;

    if (id === "chair") {
      const first = !this.feltChair;
      const boost = first ? 15 : 8;
      this.applyDelta({
        grip: -2,
        contact: boost,
        field: 5,
        quota: -2,
      });
      this.feltChair = true;
      this.ritual.chair = true;
      this.pushCombo("sit");
      this.log = first
        ? "Hips remember they have a job. Cheap mesh. Floor."
        : "There. The chair was already holding you.";
      this.banner = "SIT";
      this.fog = clamp(this.fog - 0.18, 0, 1);
      this.displayJuice = 0.28;
      return;
    }

    if (id === "okay") {
      if (this.feltChair) {
        this.applyDelta({ grip: -3, contact: 8, field: 4, quota: -1 });
        this.heldIt = true;
        this.ritual.okay = true;
        this.pushCombo("stay");
        this.log = "It's okay. The clench can stay. You're just here with it.";
        this.banner = "OKAY";
        this.fog = clamp(this.fog - 0.12, 0, 1);
        this.displayJuice = 0.3;
      } else {
        this.applyDelta({ grip: 5, contact: -2, field: -3, quota: 2 });
        this.fog = clamp(this.fog + 0.2, 0, 1);
        this.creep += 0.5;
        this.log = "Holding a feeling that hasn't landed. Shoulders do the holding.";
        this.banner = "FLOAT";
        this.displayJuice = 0.18;
      }
      return;
    }

    if (id === "soften") {
      if (this.feltChair && this.heldIt) {
        this.applyDelta({ grip: -18, contact: 9, field: 6, quota: -8 });
        this.softened = true;
        this.ritual.soften = true;
        this.whoosh = true;
        this.whooshCount += 1;
        this.pushCombo("2%");
        this.log = "Two percent. Belly takes a shift. Hands notice they exist.";
        this.banner = "WHOOSH";
        this.displayJuice = 0.88;
        this.shake = 0.15;
        this.fog = clamp(this.fog - 0.28, 0, 1);
        this.creep = Math.max(0, this.creep - 1);
      } else if (this.feltChair) {
        this.applyDelta({ grip: -7, contact: 4, field: 2, quota: -1 });
        this.log = "A little air. Still hovering. The clench wants a witness first.";
        this.banner = "TINY";
        this.displayJuice = 0.24;
      } else {
        this.applyDelta({ grip: 7, contact: -6, field: -4, quota: 3 });
        this.fog = clamp(this.fog + 0.28, 0, 1);
        this.creep += 1;
        this.log = "Forcing loose. That's just a sneakier brace.";
        this.banner = "FORCE";
        this.displayJuice = 0.2;
      }
      return;
    }

    if (id === "widen") {
      const ready = this.contact >= 40 && this.grip < 72 && this.feltChair;
      if (ready) {
        this.applyDelta({ grip: -4, contact: 5, field: 16, quota: -2 });
        this.widened = true;
        this.ritual.widen = true;
        this.pushCombo("room");
        this.log = "Printer. Hum. Window edge. The spotlight isn't the whole building.";
        this.banner = "ROOM";
        this.fog = clamp(this.fog - 0.16, 0, 1);
        this.displayJuice = 0.42;
        if (this.softened) {
          this.whooshCount += 0.4;
        }
      } else {
        this.backfireInsight("The room is a theory. Your jaw is a fact.");
      }
      return;
    }

    if (id === "story") {
      const ready =
        this.grip < 42 &&
        this.contact > 55 &&
        this.feltChair &&
        this.heldIt &&
        this.softened;
      if (ready) {
        this.applyDelta({ grip: -12, contact: 6, field: 18, quota: -10 });
        this.ritual.story = true;
        this.whoosh = true;
        this.whooshCount += 1;
        this.pushCombo("story");
        this.log = "The plot thins. Same desk. More air. Weirdly enough.";
        this.banner = "ALIVE";
        this.displayJuice = 0.9;
        this.fog = clamp(this.fog - 0.3, 0, 1);
        this.creep = Math.max(0, this.creep - 1.5);
      } else {
        this.backfireInsight("Insight without landing. The floor gets farther.");
      }
    }
  }

  backfireInsight(text) {
    this.applyDelta({ grip: 4, contact: -10, field: -12, quota: 2 });
    this.fog = clamp(this.fog + 0.22, 0, 1);
    this.creep += 1.2;
    this.log = text;
    this.banner = "VOID";
    this.shake = 0.25;
    this.displayJuice = 0.15;
    this.hollowHit = true;
    this.combo = [];
  }

  pushCombo(step) {
    const order = ["sit", "stay", "2%", "room", "story"];
    const last = this.combo[this.combo.length - 1];
    const lastI = order.indexOf(last);
    const nextI = order.indexOf(step);
    if (!this.combo.length && step === "sit") {
      this.combo = ["sit"];
      return;
    }
    if (nextI === lastI) return;
    if (nextI === lastI + 1) {
      this.combo = order.slice(0, nextI + 1);
      return;
    }
    if (step === "sit") {
      this.combo = ["sit"];
    }
  }

  updateCreepFace() {
    if (this.creep >= 3.2 && this.contact < 28) {
      this.faceOverride = this.contact < 16 ? "void" : "flat";
    } else if (this.contact >= 40) {
      this.faceOverride = null;
    }
  }

  trueClearReady() {
    return (
      this.grip <= 56 &&
      this.contact >= 54 &&
      this.field >= 44 &&
      this.ritual.chair &&
      this.ritual.okay &&
      this.ritual.soften &&
      this.ritual.widen &&
      this.whooshCount >= 1
    );
  }

  dissociated() {
    const numbFace = ["void", "neutral", "empty", "flat"].includes(this.fighterId);
    if (this.trueClearReady()) return false;
    if (numbFace && this.contact <= 32 && this.turns >= 2) return true;
    if (this.faceOverride && this.contact <= 22 && this.turns >= 5) return true;
    if (this.contact <= 16 && this.grip <= 38 && this.turns >= 5) return true;
    return false;
  }

  checkEnd() {
    if (this.ending) return;
    if (this.trueClearReady()) {
      this.ending = "clear";
      this.log = "Neon got quieter. Nobody lost. Same chair. Enough.";
      this.banner = "SAME DESK";
      return;
    }
    if (this.dissociated()) {
      this.ending = "hollow";
      this.log = "So still. So not-here. The chair misses you.";
      this.banner = "FINE";
      return;
    }
    if (this.quota >= 100) {
      this.ending = "quota";
      this.log = "The sign is very proud. Your hands are still upstairs.";
      this.banner = "QUOTA ACHIEVED";
    }
  }

  resolveTimeUp() {
    if (this.ending) return;
    if (
      this.ritual.chair &&
      this.ritual.okay &&
      this.ritual.soften &&
      this.contact >= 48 &&
      this.grip <= 58
    ) {
      this.ending = "clear";
      this.banner = "SAME DESK";
      this.log = "The clock left. You still landed. Same chair. Enough.";
      return;
    }
    if (this.dissociated() || (this.contact < 28 && this.grip <= 45)) {
      this.ending = "hollow";
      this.banner = "FINE";
      this.log = "Round over. You went quiet without sitting down.";
      return;
    }
    if (this.quota >= 70) {
      this.ending = "quota";
      this.banner = "QUOTA ACHIEVED";
      this.log = "Time's up, quota's loud. Hollow confetti. Sit bones unanswered.";
      return;
    }
    this.ending = "hover";
    this.banner = "STILL HOVERING";
    this.log = "The timer clocked out. The chair isn't going anywhere.";
  }
}

export const ENDINGS = {
  quota: {
    kind: "quota",
    title: "QUOTA ACHIEVED",
    kicker: "A trophy that tastes like fluorescent light.",
    body: "You did it. It didn't do anything. The sign will ask again in eight minutes. Your jaw already volunteered.",
    next: "The office resets its face. Pick again — or notice the chair first.",
  },
  clear: {
    kind: "clear",
    title: "SAME DESK",
    kicker: "The win is that nothing had to be defeated.",
    body: "Neon quieter. Coffee still smells like office coffee. Hands are down here. Weirdly enough — this is the alive one.",
    next: "Keep the cheap mesh. Keep the window. You can go back; the chair comes too.",
  },
  hollow: {
    kind: "hollow",
    title: "FINE",
    kicker: "False calm. The lights dimmed because you left the room.",
    body: "Quiet isn't the same as here. Neutral is a costume. Void is a hallway. The chair would like a word with your sit bones.",
    next: "Come back as someone who can feel the mesh. Fine can wait.",
  },
  hover: {
    kind: "hover",
    title: "STILL HOVERING",
    kicker: "Not a loss. Just unfinished landing.",
    body: "Sixty seconds of weather. Your shoulders may still be trying to hold up the ceiling. They don't have to.",
    next: "Same office. Same invite. Feel the chair on the way in.",
  },
};

export const CUE = {
  line: "Where are you still hovering above the chair?",
  hint: "Jaw. Belly. Sit bones. Just look. No improving.",
  seconds: 5,
};
