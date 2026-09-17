export const MEME = { w: 1024, h: 559 };

export const FACE_CENTERS = {
  cols: [171, 309, 447, 584, 722, 860],
  rows: [200, 355],
};

export const FIGHTERS = [
  {
    id: "grimace",
    name: "Grimace",
    row: 0,
    col: 0,
    grip: 74,
    contact: 26,
    field: 42,
    tag: "Jaw lock",
    bio: "Teeth doing a full-time job. The rest of you is on mute.",
  },
  {
    id: "strained",
    name: "Strained",
    row: 0,
    col: 1,
    grip: 82,
    contact: 22,
    field: 34,
    tag: "Effort as identity",
    bio: "The frown is a résumé. It would like a promotion.",
  },
  {
    id: "flat",
    name: "Flat",
    row: 0,
    col: 2,
    grip: 48,
    contact: 18,
    field: 28,
    tag: "Line mouth",
    bio: "Not calm. Just… reduced. The volume knob fell off.",
  },
  {
    id: "skeptical",
    name: "Skeptical",
    row: 0,
    col: 3,
    grip: 58,
    contact: 32,
    field: 52,
    tag: "Won't trust the chair",
    bio: "Side-eye at the floor. As if sitting were a scam.",
  },
  {
    id: "empty",
    name: "Empty",
    row: 0,
    col: 4,
    grip: 38,
    contact: 10,
    field: 18,
    tag: "Already upstairs",
    bio: "A dotted line where a person was. The desk still has a chair.",
  },
  {
    id: "silenced",
    name: "Silenced",
    row: 0,
    col: 5,
    grip: 71,
    contact: 24,
    field: 30,
    tag: "Zipper mouth",
    bio: "Holding it in like a meeting that never ends.",
  },
  {
    id: "deranged",
    name: "Deranged",
    row: 1,
    col: 0,
    grip: 62,
    contact: 16,
    field: 58,
    tag: "Scattered",
    bio: "Eyes went on a field trip. Sit bones did not get the memo.",
  },
  {
    id: "void",
    name: "Void",
    row: 1,
    col: 1,
    grip: 32,
    contact: 8,
    field: 14,
    tag: "Blank smile",
    bio: "So agreeable. So not here. The cheap mesh misses you.",
  },
  {
    id: "neutral",
    name: "Neutral",
    row: 1,
    col: 2,
    grip: 42,
    contact: 16,
    field: 38,
    tag: "I'm fine",
    bio: "The official face of fine. Fine is doing a lot of work.",
  },
  {
    id: "anxious",
    name: "Anxious",
    row: 1,
    col: 3,
    grip: 78,
    contact: 28,
    field: 18,
    tag: "Threat spotlight",
    bio: "The future is a laser pointer. The room is still a room.",
  },
  {
    id: "defeated",
    name: "Defeated",
    row: 1,
    col: 4,
    grip: 54,
    contact: 14,
    field: 26,
    tag: "Collapsed grip",
    bio: "X-eyed and still bracing for a loss that already clocked out.",
  },
  {
    id: "agonized",
    name: "Agonized",
    row: 1,
    col: 5,
    grip: 90,
    contact: 20,
    field: 24,
    tag: "World = jaw",
    bio: "Tension took the whole cubicle. Belly is on unpaid leave.",
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
