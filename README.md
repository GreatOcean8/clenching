# CLENCHING

A browser game about working a shift while the office pings you. Pick a stuck face from the meme grid. The puzzle is not the neon — it is the stack of holding patterns underneath: muscle, breath, attention, feeling, and the story that you are fine.

## Play in a browser (draft preview)

Once GitHub Pages is on for this repo:

**https://greatocean8.github.io/clenching/**

If that 404s, one-time in the GitHub UI: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch `gh-pages` / folder `/ (root)` → Save.**

## Play locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

Balance harness (optional):

```bash
node scripts/sim.mjs
node scripts/sim.mjs --deep   # harder shift with micro-braces
```

## Static deploy

```bash
npm install
npm run build
```

Upload the `dist/` folder to any static host. Production base path for GitHub Pages is `/clenching/`.

## How a shift works

1. **Choose a face** — same meme art as always. Each fighter starts with a different stack (jaw-first, breath-first, “I’m fine” on top, etc.).
2. **How the shift works** — one screen before you clock in. Enter or tap to skip.
3. **Three office blocks** — standup, ping storm, the meeting. Between blocks, a short breath gap.
4. **Clear all five layers before Quota hits 100** or the clock runs out.

### The stack (bottom → top)

| Layer | What it feels like |
| --- | --- |
| Muscle | Jaw, shoulders, sit bones |
| Breath | Air parked high, half a sip |
| Attention | Welded to the ping |
| Feeling | Heat with armor on it |
| Fine | The story that you’re okay |

Only the **lowest held** layer can actually let go. What is **loud** (what the office just hit) is often not what is **ready**. **Notice** names both.

### Instruments (not a button mash)

| Key | Move | Role |
| --- | --- | --- |
| N | Notice | Read the stack; clears murk briefly |
| Q | Contact | Weight down — builds **Ground** |
| W | Allow | Hold with the loud layer; drops armor |
| E | Soften | 2% off the ready layer (needs floor + no armor) |
| R | Orient | Room, not spotlight; can meet an attention ping |
| T | Digest | Let heat move (needs floor first) |
| Y | Drop It | The story — last |
| Space | Brace | Cancels any incoming hit; feeds **Quota** and blurs readings |

Skip the order and the game says so in plain words: **forced**, **float**, **flood**, **above it** (looks calm, isn’t).

The **settle** bar is timing, not spam. On the beat works best; off the beat still works, a little worse.

### Endings

- **Same desk** — all five down, clean enough, ground under you
- **Clear enough** — most of it met honestly
- **Fine** — numb or bypass-shaped; quiet isn’t the same as here
- **Still hovering** — shift ended with stack still up
- **Quota achieved** — bracing carried the day; hollow trophy

After a run, a short cue, then back to select. Unlock **deep shift** after a clean run for subtler readings.

## Controls

**Select:** arrow keys, tap grid or phone picker, Enter to clock in.

**Shift:** Q W E R T Y, N, Space — or tap the buttons.

Phone layout keeps the stack, gauges, and tools on one screen without scrolling.
