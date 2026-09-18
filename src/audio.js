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
    case "beat":
      tone(126, 0.2, "sine", 0.014);
      break;
    case "read":
      tone(660, 0.06, "triangle", 0.03);
      tone(880, 0.07, "triangle", 0.022, 0.06);
      break;
    case "ground":
      tone(98, 0.22, "sine", 0.055);
      tone(147, 0.16, "triangle", 0.025, 0.03);
      break;
    case "allow":
      tone(294, 0.2, "sine", 0.03);
      tone(392, 0.24, "sine", 0.022, 0.06);
      break;
    case "release":
      tone(330, 0.22, "sine", 0.04);
      tone(440, 0.3, "triangle", 0.03, 0.05);
      tone(587, 0.34, "sine", 0.022, 0.11);
      break;
    case "digest":
      tone(196, 0.3, "sine", 0.045);
      tone(294, 0.36, "triangle", 0.032, 0.08);
      tone(440, 0.42, "sine", 0.024, 0.17);
      break;
    case "forced":
      tone(180, 0.18, "sawtooth", 0.045);
      tone(120, 0.24, "square", 0.03, 0.05);
      break;
    case "float":
      tone(700, 0.26, "sine", 0.02);
      tone(940, 0.3, "sine", 0.014, 0.09);
      break;
    case "brace":
      tone(150, 0.14, "square", 0.075);
      tone(96, 0.24, "sawtooth", 0.04, 0.02);
      tone(220, 0.1, "square", 0.03, 0.09);
      break;
    case "hit":
      tone(240, 0.1, "square", 0.05);
      tone(160, 0.18, "sawtooth", 0.032, 0.04);
      break;
    case "met":
      tone(196, 0.12, "sine", 0.03);
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
      tone(523, 0.8, "sine", 0.025, 0.3);
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
