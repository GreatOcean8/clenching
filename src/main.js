import "./style.css";
import { FIGHTERS, getFighter, hotspotStyle } from "./fighters.js";
import {
  ALL_ACTIONS,
  BRACE,
  CUE,
  ENDINGS,
  INSTRUMENTS,
  LAYERS,
  NOTICE,
  Shift,
  qualityNote,
} from "./game.js";
import { isMuted, sfx, toggleMute, unlockAudio } from "./audio.js";

const app = document.querySelector("#app");
const DEEP_KEY = "clenching:deep-unlocked";

const state = {
  phase: "select",
  selected: "grimace",
  deep: false,
  shift: null,
  snap: null,
  endingKind: null,
};

let lastTs = 0;
let root = null;
let lastFxSeq = -1;
let lastFace = null;
let briefArmed = false;
let helpOpen = false;

const asset = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
const faceUrl = (id) => asset(`faces/${id}.jpg`);

function deepUnlocked() {
  try {
    return localStorage.getItem(DEEP_KEY) === "1";
  } catch {
    return false;
  }
}

function unlockDeep() {
  try {
    localStorage.setItem(DEEP_KEY, "1");
  } catch {
    /* private mode is fine, the toggle just won't persist */
  }
}

/* ————————————————— rules (brief + in-shift help) ————————————————— */

function stackListHtml() {
  return [...LAYERS]
    .reverse()
    .map(
      (l, i) => `<li${i === LAYERS.length - 1 ? ' class="base"' : ""}>
        <b>${l.name}</b><span>${l.where}</span>
      </li>`,
    )
    .join("");
}

function instrumentRowsHtml() {
  const rows = [NOTICE, ...INSTRUMENTS, BRACE];
  return rows
    .map(
      (t) => `<tr>
        <td class="rk"><kbd>${t.key}</kbd> ${t.name}</td>
        <td>${t.tag}</td>
      </tr>`,
    )
    .join("");
}

function endingsListHtml() {
  return [
    ["Same desk", "All five down, clean, ground under you"],
    ["Clear enough", "Most of it met honestly"],
    ["Fine", "Numb or bypass-shaped — quiet isn’t here"],
    ["Still hovering", "Shift ended with stack still up"],
    ["Quota achieved", "Bracing carried the day — hollow trophy"],
  ]
    .map(([t, d]) => `<li><b>${t}</b> — ${d}</li>`)
    .join("");
}

function rulesBodyHtml() {
  return `
    <section class="rules-block">
      <h3>The stack</h3>
      <p class="rules-lede">Work from the bottom up. Pink bar = held. Striped = armor.</p>
      <ol class="brief-stack">${stackListHtml()}</ol>
    </section>
    <section class="rules-block">
      <h3>What to do</h3>
      <ul class="rules-bullets">
        <li><b>Loud</b> = what the office just hit. <b>Ready</b> = the lowest layer that can let go. They’re often different — <b>Notice</b> names both.</li>
        <li><b>Order:</b> Contact (ground) → Allow (stop arguing) → Soften the ready layer. Orient for attention pings. Digest for heat. Drop It last.</li>
        <li><b>Settle bar:</b> on the beat works best. Off-beat still works, a little worse.</li>
        <li><b>Skip order</b> and the log says so: forced, float, flood, above it (looks calm, isn’t).</li>
      </ul>
    </section>
    <section class="rules-block">
      <h3>Instruments</h3>
      <table class="rules-table">
        <thead><tr><th>Key</th><th>Does</th></tr></thead>
        <tbody>${instrumentRowsHtml()}</tbody>
      </table>
    </section>
    <section class="rules-block rules-brace">
      <h3>Brace</h3>
      <p>Kills any incoming hit instantly. Feels great. Also feeds <b>Quota</b>, tightens your jaw, and blurs the stack. At <b>Quota 100</b> the office wins — confetti, hollow.</p>
    </section>
    <section class="rules-block">
      <h3>Win / lose</h3>
      <ul class="rules-bullets rules-endings">${endingsListHtml()}</ul>
      <p class="rules-foot">Goal: settle all five layers before Quota maxes or the shift ends. Three office blocks, then done.</p>
    </section>
  `;
}

function openHelp() {
  closeHelp();
  helpOpen = true;
  const overlay = document.createElement("div");
  overlay.className = "rules-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Rules");
  overlay.innerHTML = `
    <div class="rules-modal">
      <header class="rules-head">
        <h2>Rules</h2>
        <button type="button" class="rules-close" data-close>Close</button>
      </header>
      <div class="rules-scroll">${rulesBodyHtml()}</div>
      <p class="rules-hint">Press <kbd>?</kbd> or Esc to close. The shift pauses while you read.</p>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.closest("[data-close]")) closeHelp();
  });
  overlay.querySelector(".rules-modal").addEventListener("click", (e) => e.stopPropagation());
  overlay.querySelector("[data-close]").focus();
}

function closeHelp() {
  helpOpen = false;
  document.querySelector(".rules-overlay")?.remove();
}

function bindHelp() {
  app.querySelectorAll("[data-help]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      unlockAudio();
      sfx("select");
      openHelp();
    });
  });
}

function helpBtn(label = "Rules") {
  return `<button class="help-btn" type="button" data-help aria-label="Open rules">${label}</button>`;
}

/* ————————————————— select ————————————————— */

function renderSelect() {
  state.phase = "select";
  const f = getFighter(state.selected);
  const hotspots = FIGHTERS.map((fighter) => {
    const s = hotspotStyle(fighter);
    const sel = fighter.id === state.selected ? " selected" : "";
    return `<button class="hotspot${sel}" type="button" data-id="${fighter.id}"
      style="left:${s.left};top:${s.top};width:${s.width};height:${s.height}"
      aria-label="${fighter.name}"></button>`;
  }).join("");

  const picks = FIGHTERS.map((fighter) => {
    const sel = fighter.id === state.selected ? " selected" : "";
    return `<button class="pick${sel}" type="button" data-id="${fighter.id}">
      <img src="${faceUrl(fighter.id)}" alt="">
      <span>${fighter.name}</span>
    </button>`;
  }).join("");

  const deepToggle = deepUnlocked()
    ? `<button class="deep-chip${state.deep ? " on" : ""}" type="button" data-deep>
        deep shift ${state.deep ? "on" : "off"}
      </button>`
    : "";

  app.innerHTML = `
    <section class="select-screen" aria-label="Choose your fighter">
      <div class="help-chip">Every face is a different holding pattern.</div>
      ${helpBtn("Rules ?")}
      <button class="mute-btn" type="button" data-mute>${isMuted() ? "sound off" : "sound on"}</button>
      <div class="meme-stage">
        <img class="meme" src="${asset("clenching-select.jpg")}" alt="CLENCHING — choose your fighter" />
        <div class="hotspots">${hotspots}</div>
      </div>
      <div class="picker">${picks}</div>
      <div class="select-bar">
        <div class="who">
          <img src="${faceUrl(f.id)}" alt="${f.name}">
          <div>
            <h2>${f.name}</h2>
            <p>${f.tag} — ${f.read}</p>
          </div>
        </div>
        ${deepToggle}
        <button class="fight-btn" type="button" data-fight>CLOCK IN</button>
      </div>
    </section>
  `;

  app.querySelectorAll("[data-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      unlockAudio();
      const id = btn.getAttribute("data-id");
      if (state.selected === id && btn.classList.contains("hotspot")) {
        showBrief();
        return;
      }
      state.selected = id;
      sfx("select");
      renderSelect();
    });
  });
  app.querySelector("[data-fight]").addEventListener("click", () => {
    unlockAudio();
    showBrief();
  });
  const deepBtn = app.querySelector("[data-deep]");
  if (deepBtn) {
    deepBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      state.deep = !state.deep;
      sfx("select");
      renderSelect();
    });
  }
  bindMute();
  bindHelp();
}

function showBrief() {
  if (state.phase === "brief" || state.phase === "shift") return;
  state.phase = "brief";
  briefArmed = false;

  app.innerHTML = `
    <section class="brief-screen" aria-label="How the shift works">
      ${helpBtn("Rules ?")}
      <button class="mute-btn" type="button" data-mute style="position:absolute;top:calc(8px + var(--safe-t));right:10px">${isMuted() ? "sound off" : "sound on"}</button>
      <div class="brief-card">
        <p class="brief-kicker">How the shift works</p>
        <h1>The office is weather. You're the stack.</h1>
        <div class="rules-scroll brief-rules">${rulesBodyHtml()}</div>
        <button class="fight-btn brief-go" type="button" data-go>Got it — clock in</button>
        <p class="brief-skip">Enter or tap outside · <b>?</b> opens rules during the shift too</p>
      </div>
    </section>
  `;
  const screen = app.querySelector(".brief-screen");
  screen.addEventListener("click", (e) => {
    if (e.target.closest("[data-mute]") || e.target.closest("[data-help]") || e.target.closest(".rules-overlay"))
      return;
    if (e.target.closest(".brief-rules") || e.target.closest(".rules-scroll")) return;
    startShift();
  });
  app.querySelector("[data-go]").addEventListener("click", (e) => {
    e.stopPropagation();
    startShift();
  });
  window.setTimeout(() => {
    if (state.phase !== "brief") return;
    briefArmed = true;
    const go = app.querySelector("[data-go]");
    if (go) go.focus();
  }, 220);
  bindMute();
  bindHelp();
  sfx("select");
}

/* ————————————————— the shift ————————————————— */

function startShift() {
  if (state.phase !== "brief" || !briefArmed) return;
  state.shift = new Shift(state.selected, { deep: state.deep });
  state.phase = "shift";
  state.snap = state.shift.snapshot();
  lastTs = performance.now();
  lastFxSeq = -1;
  lastFace = null;
  renderShiftShell();
  paint(state.snap);
  sfx("select");
  requestAnimationFrame(loop);
}

function toolButton(tool, cls) {
  return `<button class="tool ${cls}" type="button" data-act="${tool.id}" title="${tool.hint}">
    <span class="tname">${tool.name}</span>
    <span class="ttag">${tool.tag}</span>
    <span class="tkey">${tool.key}</span>
    <span class="cool"></span>
  </button>`;
}

function renderShiftShell() {
  const f = getFighter(state.selected);
  const layerRows = [...LAYERS]
    .reverse()
    .map(
      (l) => `<div class="layer" data-layer="${l.id}">
        <div class="lhead">
          <span class="lname">${l.name}</span>
          <span class="lwhere">${l.where}</span>
        </div>
        <div class="lmeters">
          <div class="lbar"><i></i></div>
          <div class="gbar"><i></i></div>
        </div>
        <div class="lchips">
          <span class="chip floor" title="is there ground under this layer">floor</span>
          <span class="chip state"></span>
        </div>
      </div>`,
    )
    .join("");

  app.innerHTML = `
    <section class="shift-screen" id="shift">
      <div class="office" aria-hidden="true">
        <div class="neon prod">PRODUCTIVITY</div>
        <div class="neon meet">MEETING!</div>
        <div class="drift d1"></div>
        <div class="drift d2"></div>
        <div class="drift d3"></div>
      </div>
      <div class="veil" aria-hidden="true"></div>
      <div class="stage">
        <header class="shift-top">
          <div class="block">
            <b id="block-name">—</b>
            <span class="pips" id="pips"></span>
          </div>
          <div class="clock" id="clock">0</div>
          ${helpBtn("?")}
          <button class="mute-btn" type="button" data-mute style="position:static">${isMuted() ? "sound off" : "sound on"}</button>
        </header>

        <div class="quota-row">
          <span class="qlabel">QUOTA</span>
          <div class="qbar"><i id="qfill"></i></div>
          <span class="qval" id="qval">0</span>
        </div>

        <div class="board">
          <div class="board-left">
            <div class="who-row">
              <img id="face" src="${faceUrl(f.id)}" alt="${f.name}">
              <div class="who-text">
                <b id="who-name">${f.name}</b>
                <span id="who-sub">${f.tag}</span>
              </div>
              <div class="settled" id="settled"></div>
            </div>

            <div class="incoming empty" id="incoming">
              <span class="itext" id="itext">Office is quiet. Use it.</span>
              <span class="itarget" id="itarget"></span>
              <div class="ifuse"><i id="ifuse"></i></div>
            </div>

            <div class="stack" id="stack">
              <div class="legend"><span class="k-hold">held</span><span class="k-guard">armor</span></div>
              ${layerRows}
            </div>
          </div>

          <div class="board-right">
            <div class="gauges">
              ${gauge("ground", "Ground")}
              ${gauge("room", "Room")}
              ${gauge("charge", "Charge")}
            </div>
            <div class="beat" id="beat">
              <div class="band" id="band"></div>
              <div class="marker" id="marker"></div>
              <span class="beat-label">settle</span>
            </div>
            <div class="log-box">
              <b class="banner" id="banner"></b>
              <p class="line" id="log"></p>
            </div>
            <div class="tools">
              <div class="tool-grid">
                ${INSTRUMENTS.map((t) => toolButton(t, "instrument")).join("")}
              </div>
              <div class="tool-row">
                ${toolButton(NOTICE, "notice")}
                ${toolButton(BRACE, "brace")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
  root = app.querySelector("#shift");
  root.querySelectorAll("[data-act]").forEach((btn) => {
    btn.addEventListener("click", () => act(btn.getAttribute("data-act")));
  });
  bindMute();
  bindHelp();
}

function gauge(id, label) {
  return `<div class="gauge ${id}">
    <span class="glabel">${label}</span>
    <div class="gtrack"><i id="g-${id}"></i></div>
    <span class="gval" id="gv-${id}">0</span>
  </div>`;
}

function act(id) {
  if (!state.shift || state.phase !== "shift") return;
  unlockAudio();
  const snap = state.shift.act(id);
  state.snap = snap;
  soundFor(id, snap);
  paint(snap);
}

function soundFor(id, snap) {
  const b = snap.banner;
  if (b === "LATE") return;
  if (b === "FORCED" || b === "FLOOD") return sfx("forced");
  if (b === "FLOAT") return sfx("float");
  if (b === "ABOVE IT") return sfx("float");
  if (id === "brace") return sfx("brace");
  if (id === "notice") return sfx("read");
  if (id === "contact") return sfx("ground");
  if (id === "allow") return sfx("allow");
  if (id === "digest") return sfx("digest");
  if (id === "drop" || id === "soften" || id === "orient") return sfx("release");
  return sfx("select");
}

function paint(snap) {
  if (!root) return;

  root.style.setProperty("--quota", snap.quota);
  root.style.setProperty("--ground", snap.support);
  root.style.setProperty("--room", snap.field);
  root.style.setProperty("--charge", snap.charge);
  root.style.setProperty("--noise", snap.noise.toFixed(3));
  root.classList.toggle("gap", snap.isGap);
  root.classList.toggle("hot", snap.charge > 66);
  root.classList.toggle("settling", snap.support > 58 && snap.charge < 40);
  root.classList.toggle("in-band", snap.inBand);

  root.querySelector("#block-name").textContent = snap.blockName;
  root.querySelector("#clock").textContent = snap.phaseLeft;
  root.querySelector("#pips").innerHTML = Array.from({ length: snap.blockCount })
    .map((_, i) => `<i class="${i < snap.blockIndex ? "done" : i === snap.blockIndex ? "now" : ""}"></i>`)
    .join("");

  root.querySelector("#qfill").style.width = `${snap.quota}%`;
  root.querySelector("#qval").textContent = snap.quota;
  root.classList.toggle("quota-warn", snap.quota >= 70);

  setGauge("ground", snap.support);
  setGauge("room", snap.field);
  setGauge("charge", snap.charge);

  const face = root.querySelector("#face");
  if (snap.faceId !== lastFace) {
    lastFace = snap.faceId;
    face.src = faceUrl(snap.faceId);
    face.classList.remove("morph");
    void face.offsetWidth;
    face.classList.add("morph");
    root.querySelector("#who-sub").textContent =
      snap.faceId === snap.fighterId ? getFighter(state.selected).tag : "the face is a readout";
  }

  root.querySelector("#settled").innerHTML = LAYERS.map((l) => {
    const on = snap.layers.find((x) => x.id === l.id).released;
    return `<i class="${on ? "on" : ""}"></i>`;
  }).join("");

  paintIncoming(snap);
  paintStack(snap);
  paintBeat(snap);

  root.querySelector("#banner").textContent = snap.banner || "";
  root.querySelector("#log").textContent = snap.log;

  root.querySelectorAll("[data-act]").forEach((btn) => {
    btn.classList.toggle("cooling", snap.recovery > 0.02);
  });

  if (snap.fxSeq !== lastFxSeq) {
    lastFxSeq = snap.fxSeq;
    if (snap.shake > 0.4) {
      root.classList.remove("shake");
      void root.offsetWidth;
      root.classList.add("shake");
    }
    if (snap.flash) {
      root.setAttribute("data-flash", snap.flash);
      window.setTimeout(() => root && root.removeAttribute("data-flash"), 420);
    }
  }

  if (snap.ending && state.phase === "shift") {
    state.endingKind = snap.ending;
    state.phase = "ending-wait";
    sfx(snap.ending === "deep" || snap.ending === "enough" ? "clear" : snap.ending === "quota" ? "quota" : "hollow");
    if (snap.ending === "deep" || snap.ending === "enough") unlockDeep();
    window.setTimeout(() => showReport(snap), 1000);
  }
}

function setGauge(id, n) {
  root.querySelector(`#g-${id}`).style.width = `${n}%`;
  root.querySelector(`#gv-${id}`).textContent = n;
}

function paintIncoming(snap) {
  const box = root.querySelector("#incoming");
  const text = root.querySelector("#itext");
  const target = root.querySelector("#itarget");
  const fuse = root.querySelector("#ifuse");
  if (!snap.incoming) {
    box.classList.add("empty");
    text.textContent = snap.isGap
      ? "Breath gap. Nothing is due. This is where it sticks."
      : "Office is quiet. Build the floor.";
    target.textContent = "";
    fuse.style.width = "0%";
    return;
  }
  box.classList.remove("empty");
  text.textContent = snap.incoming.text;
  target.textContent = snap.incoming.shown ? `→ ${snap.incoming.targetName}` : "→ ?";
  target.classList.toggle("unknown", !snap.incoming.shown);
  fuse.style.width = `${snap.incoming.frac * 100}%`;
}

function paintStack(snap) {
  const incomingTarget = snap.incoming && snap.incoming.shown ? snap.incoming.target : null;
  snap.layers.forEach((l) => {
    const row = root.querySelector(`.layer[data-layer="${l.id}"]`);
    row.querySelector(".lbar i").style.width = `${l.hold}%`;
    row.querySelector(".gbar i").style.width = `${l.guard}%`;
    row.classList.toggle("released", l.released);
    row.classList.toggle("ready", l.isReady && !l.released);
    row.classList.toggle("loud", l.isLoud && !l.released);
    row.classList.toggle("unknown", !l.known);
    row.classList.toggle("floored", l.supported);
    row.classList.toggle("targeted", incomingTarget === l.id);
    row.querySelector(".lname").textContent = l.known ? l.name : "— — —";
    row.querySelector(".lwhere").textContent = l.known ? l.where : "unreadable from here";
    const chip = row.querySelector(".chip.state");
    chip.textContent = l.released ? "settled" : l.isReady ? "ready" : l.isLoud ? "loud" : "";
  });
}

function paintBeat(snap) {
  const band = root.querySelector("#band");
  const marker = root.querySelector("#marker");
  const left = (snap.bandCenter - snap.bandWidth / 2) * 100;
  band.style.left = `${left}%`;
  band.style.width = `${snap.bandWidth * 100}%`;
  marker.style.left = `${snap.beatPhase * 100}%`;
  root.querySelector("#beat").classList.toggle("faint", !snap.beatVisible);
  if (snap.beatCue) sfx("beat");
}

/* ————————————————— report + cue ————————————————— */

function showReport(snap) {
  state.phase = "report";
  const info = ENDINGS[snap.ending] || ENDINGS.hover;
  const t = snap.tally;
  const stats = [
    ["settled", `${snap.released}/5`],
    ["on the beat", t.clean],
    ["off the beat", t.offbeat],
    ["reads", t.reads],
    ["forced", t.forced],
    ["floated", t.float],
    ["flooded", t.flood],
    ["above it", t.bypass],
    ["braced", t.braces],
    ["quota", snap.quota],
  ]
    .map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`)
    .join("");

  app.innerHTML = `
    <section class="end-screen ${info.kind}">
      <div class="end-card">
        <h1>${info.title}</h1>
        <p class="kicker">${info.kicker}</p>
        <p>${info.body}</p>
        <div class="report">${stats}</div>
        <p class="note">${qualityNote(t, snap.ending)}</p>
        <p class="next">${info.next}</p>
        <div class="end-actions">
          <button class="again" type="button" data-cue>continue</button>
        </div>
      </div>
    </section>
  `;
  app.querySelector("[data-cue]").addEventListener("click", showCue);
}

function showCue() {
  state.phase = "cue";
  app.innerHTML = `
    <section class="cue-screen">
      <div class="cue-card">
        <h1>${CUE.line}</h1>
        <p>${CUE.hint}</p>
        <div class="cue-count" id="cue-count">${CUE.seconds}</div>
        <button class="again" type="button" data-again disabled>back to select</button>
      </div>
    </section>
  `;
  const btn = app.querySelector("[data-again]");
  const started = performance.now();
  const tickCue = (t) => {
    if (state.phase !== "cue") return;
    const left = Math.max(0, CUE.seconds - (t - started) / 1000);
    const label = app.querySelector("#cue-count");
    const n = Math.ceil(left);
    if (label) label.textContent = n > 0 ? String(n) : "here";
    if (left <= 0) {
      btn.disabled = false;
      btn.focus();
      return;
    }
    requestAnimationFrame(tickCue);
  };
  requestAnimationFrame(tickCue);
  btn.addEventListener("click", () => {
    if (btn.disabled) return;
    state.shift = null;
    renderSelect();
  });
}

/* ————————————————— loop + input ————————————————— */

function loop(ts) {
  if (state.phase !== "shift" || !state.shift) return;
  if (helpOpen) {
    requestAnimationFrame(loop);
    return;
  }
  const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016);
  lastTs = ts;
  const prev = state.snap;
  const snap = state.shift.tick(dt);
  state.snap = snap;
  if (prev && !prev.incoming && snap.incoming) sfx("tick");
  if (prev && prev.tally.hits !== snap.tally.hits) sfx(snap.banner === "MET" ? "met" : "hit");
  paint(snap);
  requestAnimationFrame(loop);
}

function bindMute() {
  app.querySelectorAll("[data-mute]").forEach((b) => {
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      const m = toggleMute();
      app.querySelectorAll("[data-mute]").forEach((x) => {
        x.textContent = m ? "sound off" : "sound on";
      });
    });
  });
}

function onKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const key = e.key.toLowerCase();

  if (helpOpen) {
    if (key === "escape" || key === "?") {
      e.preventDefault();
      closeHelp();
    }
    return;
  }

  if (key === "?" || key === "h") {
    if (state.phase === "select" || state.phase === "brief" || state.phase === "shift") {
      e.preventDefault();
      openHelp();
      return;
    }
  }

  if (state.phase === "select") {
    const f = getFighter(state.selected);
    const step = (dr, dc) => {
      const next = FIGHTERS.find((x) => x.row === f.row + dr && x.col === f.col + dc);
      if (next) {
        state.selected = next.id;
        sfx("select");
        renderSelect();
      }
    };
    if (key === "arrowright") return e.preventDefault(), step(0, 1);
    if (key === "arrowleft") return e.preventDefault(), step(0, -1);
    if (key === "arrowdown") return e.preventDefault(), step(1, 0);
    if (key === "arrowup") return e.preventDefault(), step(-1, 0);
    if (key === "enter" || key === " ") {
      e.preventDefault();
      showBrief();
    }
    return;
  }

  if (state.phase === "brief") {
    if (key === "enter" || key === " ") {
      e.preventDefault();
      if (briefArmed) startShift();
    }
    return;
  }

  if (state.phase === "shift") {
    if (key === " ") {
      e.preventDefault();
      act("brace");
      return;
    }
    const tool = ALL_ACTIONS.find((t) => t.key.toLowerCase() === key);
    if (tool) {
      e.preventDefault();
      act(tool.id);
    }
    return;
  }

  if (state.phase === "report" && (key === "enter" || key === " ")) {
    e.preventDefault();
    showCue();
  }
}

window.addEventListener("keydown", onKey);
renderSelect();
