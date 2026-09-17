let ctx;
let muted = false;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  if (!muted) ac();
  return muted;
}

export function unlockAudio() {
  ac();
}

function tone(freq, dur, type, gain, when = 0) {
  const c = ac();
  if (!c || muted) return;
  const t = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export function sfx(kind) {
  if (muted) return;
  switch (kind) {
    case "select":
      tone(520, 0.08, "square", 0.04);
      break;
    case "clench":
      tone(140, 0.16, "square", 0.07);
      tone(90, 0.22, "sawtooth", 0.03, 0.02);
      break;
    case "soft":
      tone(330, 0.14, "sine", 0.035);
      break;
    case "whoosh":
      tone(220, 0.28, "sine", 0.05);
      tone(330, 0.32, "triangle", 0.04, 0.05);
      tone(494, 0.4, "sine", 0.03, 0.1);
      break;
    case "backfire":
      tone(180, 0.2, "sawtooth", 0.04);
      tone(140, 0.25, "square", 0.03, 0.05);
      break;
    case "quota":
      tone(523, 0.12, "square", 0.06);
      tone(659, 0.12, "square", 0.05, 0.1);
      tone(784, 0.12, "square", 0.05, 0.2);
      tone(200, 0.5, "sawtooth", 0.04, 0.38);
      break;
    case "clear":
      tone(262, 0.4, "sine", 0.05);
      tone(330, 0.5, "sine", 0.04, 0.08);
      tone(392, 0.7, "triangle", 0.035, 0.16);
      break;
    case "hollow":
      tone(196, 0.4, "sine", 0.03);
      tone(185, 0.55, "triangle", 0.02, 0.1);
      break;
    case "tick":
      tone(880, 0.04, "square", 0.015);
      break;
    default:
      break;
  }
}
