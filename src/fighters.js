export const MEME = { w: 1024, h: 559 };

export const FACE_CENTERS = {
  cols: [171, 309, 447, 584, 722, 860],
  rows: [200, 355],
};

/**
 * Each face starts the shift with a different holding pattern, so the same
 * instruments have to be used in a different order. hold = how much is held,
 * guard = how much it argues back when met.
 */
export const FIGHTERS = [
  {
    id: "grimace",
    name: "Grimace",
    row: 0,
    col: 0,
    tag: "Jaw lock",
    bio: "Teeth doing a full-time job. The rest of you is on mute.",
    read: "Loud and low. Start at the floor.",
    start: {
      hold: { muscle: 86, breath: 58, attention: 50, feeling: 44, fine: 50 },
      guard: { muscle: 50, breath: 38, attention: 30, feeling: 54, fine: 42 },
      support: 26,
      field: 30,
      charge: 42,
      noise: 0.08,
    },
  },
  {
    id: "strained",
    name: "Strained",
    row: 0,
    col: 1,
    tag: "Effort as identity",
    bio: "The frown is a résumé. It would like a promotion.",
    read: "The story is doing the gripping.",
    start: {
      hold: { muscle: 70, breath: 62, attention: 48, feeling: 50, fine: 80 },
      guard: { muscle: 44, breath: 46, attention: 30, feeling: 50, fine: 66 },
      support: 22,
      field: 28,
      charge: 48,
      noise: 0.12,
    },
  },
  {
    id: "flat",
    name: "Flat",
    row: 0,
    col: 2,
    tag: "Line mouth",
    bio: "Not calm. Just… reduced. The volume knob fell off.",
    read: "Readings are quiet because you turned them down.",
    start: {
      hold: { muscle: 52, breath: 54, attention: 40, feeling: 62, fine: 66 },
      guard: { muscle: 40, breath: 42, attention: 26, feeling: 62, fine: 54 },
      support: 18,
      field: 22,
      charge: 24,
      noise: 0.42,
    },
  },
  {
    id: "skeptical",
    name: "Skeptical",
    row: 0,
    col: 3,
    tag: "Won't trust the chair",
    bio: "Side-eye at the floor. As if sitting were a scam.",
    read: "Armor everywhere. Allow does the heavy lifting.",
    start: {
      hold: { muscle: 58, breath: 52, attention: 54, feeling: 52, fine: 58 },
      guard: { muscle: 66, breath: 60, attention: 58, feeling: 68, fine: 62 },
      support: 24,
      field: 34,
      charge: 38,
      noise: 0.14,
    },
  },
  {
    id: "empty",
    name: "Empty",
    row: 0,
    col: 4,
    tag: "Already upstairs",
    bio: "A dotted line where a person was. The desk still has a chair.",
    read: "No floor at all. Contact, twice, before anything clever.",
    start: {
      hold: { muscle: 44, breath: 48, attention: 36, feeling: 58, fine: 72 },
      guard: { muscle: 34, breath: 38, attention: 26, feeling: 60, fine: 58 },
      support: 8,
      field: 18,
      charge: 20,
      noise: 0.5,
    },
  },
  {
    id: "silenced",
    name: "Silenced",
    row: 0,
    col: 5,
    tag: "Zipper mouth",
    bio: "Holding it in like a meeting that never ends.",
    read: "Breath is the whole puzzle. It will not be pushed.",
    start: {
      hold: { muscle: 64, breath: 88, attention: 44, feeling: 62, fine: 56 },
      guard: { muscle: 42, breath: 72, attention: 28, feeling: 58, fine: 46 },
      support: 20,
      field: 26,
      charge: 46,
      noise: 0.16,
    },
  },
  {
    id: "deranged",
    name: "Deranged",
    row: 1,
    col: 0,
    tag: "Scattered",
    bio: "Eyes went on a field trip. Sit bones did not get the memo.",
    read: "Wide already. Wide is not the same as here.",
    start: {
      hold: { muscle: 56, breath: 60, attention: 74, feeling: 54, fine: 48 },
      guard: { muscle: 38, breath: 40, attention: 44, feeling: 52, fine: 40 },
      support: 12,
      field: 62,
      charge: 58,
      noise: 0.24,
    },
  },
  {
    id: "void",
    name: "Void",
    row: 1,
    col: 1,
    tag: "Blank smile",
    bio: "So agreeable. So not here. The cheap mesh misses you.",
    read: "Armored heat under a very polite lid.",
    start: {
      hold: { muscle: 40, breath: 46, attention: 30, feeling: 76, fine: 88 },
      guard: { muscle: 30, breath: 34, attention: 24, feeling: 78, fine: 70 },
      support: 12,
      field: 18,
      charge: 22,
      noise: 0.46,
    },
  },
  {
    id: "neutral",
    name: "Neutral",
    row: 1,
    col: 2,
    tag: "I'm fine",
    bio: "The official face of fine. Fine is doing a lot of work.",
    read: "Nothing looks wrong. That is the tell.",
    start: {
      hold: { muscle: 48, breath: 50, attention: 42, feeling: 56, fine: 84 },
      guard: { muscle: 36, breath: 38, attention: 28, feeling: 54, fine: 74 },
      support: 22,
      field: 34,
      charge: 30,
      noise: 0.3,
    },
  },
  {
    id: "anxious",
    name: "Anxious",
    row: 1,
    col: 3,
    tag: "Threat spotlight",
    bio: "The future is a laser pointer. The room is still a room.",
    read: "Attention is welded to the ping. Charge runs hot.",
    start: {
      hold: { muscle: 66, breath: 70, attention: 88, feeling: 60, fine: 46 },
      guard: { muscle: 44, breath: 48, attention: 52, feeling: 56, fine: 38 },
      support: 16,
      field: 12,
      charge: 72,
      noise: 0.18,
    },
  },
  {
    id: "defeated",
    name: "Defeated",
    row: 1,
    col: 4,
    tag: "Collapsed grip",
    bio: "X-eyed and still bracing for a loss that already clocked out.",
    read: "Collapse is a brace too. It just points down.",
    start: {
      hold: { muscle: 62, breath: 52, attention: 34, feeling: 64, fine: 62 },
      guard: { muscle: 46, breath: 42, attention: 24, feeling: 58, fine: 52 },
      support: 10,
      field: 20,
      charge: 26,
      noise: 0.34,
    },
  },
  {
    id: "agonized",
    name: "Agonized",
    row: 1,
    col: 5,
    tag: "World = jaw",
    bio: "Tension took the whole cubicle. Belly is on unpaid leave.",
    read: "Everything is loud. Only the floor is workable.",
    start: {
      hold: { muscle: 96, breath: 78, attention: 60, feeling: 66, fine: 52 },
      guard: { muscle: 68, breath: 56, attention: 36, feeling: 60, fine: 44 },
      support: 18,
      field: 22,
      charge: 66,
      noise: 0.2,
    },
  },
];

export function getFighter(id) {
  return FIGHTERS.find((f) => f.id === id) ?? FIGHTERS[0];
}

export function hotspotStyle(fighter) {
  const x = FACE_CENTERS.cols[fighter.col];
  const y = FACE_CENTERS.rows[fighter.row];
  const tw = 132;
  const th = 128;
  return {
    left: `${((x - tw / 2) / MEME.w) * 100}%`,
    top: `${((y - th / 2) / MEME.h) * 100}%`,
    width: `${(tw / MEME.w) * 100}%`,
    height: `${(th / MEME.h) * 100}%`,
  };
}
