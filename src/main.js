import "./style.css";
import { FIGHTERS, getFighter, hotspotStyle } from "./fighters.js";
import {
  ALL_MOVES,
  CLENCH_MOVES,
  CUE,
  ENDINGS,
  Game,
  SOFT_MOVES,
} from "./game.js";
import { isMuted, sfx, toggleMute, unlockAudio } from "./audio.js";

const app = document.querySelector("#app");

const state = {
  phase: "select",
  selected: "grimace",
  game: null,
  snap: null,
  cueLeft: CUE.seconds,
  endingKind: null,
};

let lastTs = 0;
let fightRoot = null;
let lastFxSeq = -1;
let briefArmed = false;

const asset = (path) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

function faceUrl(id) {
  return asset(`faces/${id}.jpg`);
}

function renderSelect() {
  const f = getFighter(state.selected);
  const hotspots = FIGHTERS.map((fighter) => {
    const s = hotspotStyle(fighter);
    const sel = fighter.id === state.selected ? " selected" : "";
    return `<button class="hotspot${sel}" type="button" data-id="${fighter.id}" data-name="${fighter.name}"
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

  app.innerHTML = `
    <section class="select-screen" aria-label="Choose your fighter">
      <div class="help-chip">Clenching hits hard. The chair hits true.</div>
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
            <p>${f.tag} — ${f.bio}</p>
          </div>
        </div>
        <button class="fight-btn" type="button" data-fight>FIGHT</button>
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
  bindMute();
}

function showBrief() {
  if (state.phase === "brief" || state.phase === "fight") return;
  state.phase = "brief";
  briefArmed = false;
  const f = getFighter(state.selected);
  app.innerHTML = `
    <section class="brief-screen" aria-label="How to win">
      <div class="brief-card">
        <p class="brief-kicker">How this works</p>
        <h1>You're not beating a boss.</h1>
        <div class="brief-who">
          <img src="${faceUrl(f.id)}" alt="">
          <span>${f.name}</span>
          <span class="vs">vs</span>
          <span>office pressure</span>
        </div>
        <div class="brief-points">
          <article class="brief-point win">
            <h2>Real clear</h2>
            <p class="seq">Feel the chair → It's okay → Soften → Widen → Drop the story</p>
            <p>Land in the chair. Same desk. Quieter body.</p>
          </article>
          <article class="brief-point trap">
            <h2>Brace</h2>
            <p>Feels strong. Fills Quota. <strong>Quota Achieved is a fake trophy.</strong></p>
          </article>
        </div>
        <p class="brief-foot">Notice the clench. Don't brace harder.</p>
        <button class="fight-btn brief-go" type="button" data-go>Got it — fight</button>
        <p class="brief-skip">Enter or tap</p>
      </div>
    </section>
  `;
  const screen = app.querySelector(".brief-screen");
  screen.addEventListener("click", (e) => {
    if (e.target.closest("[data-mute]")) return;
    startFight();
  });
  /* Enter on select would also click a focused button on keyup — arm after that. */
  window.setTimeout(() => {
    if (state.phase !== "brief") return;
    briefArmed = true;
    const go = app.querySelector("[data-go]");
    if (go) go.focus();
  }, 220);
  sfx("select");
}

function startFight() {
  if (state.phase !== "brief" || !briefArmed) return;
  state.game = new Game(state.selected);
  state.phase = "fight";
  state.snap = state.game.snapshot();
  lastTs = performance.now();
  lastFxSeq = -1;
  renderFightShell();
  paintFight(state.snap);
  sfx("select");
  requestAnimationFrame(loop);
  const first = fightRoot.querySelector('[data-move="chair"]');
  if (first) first.focus();
}

function renderFightShell() {
  const f = getFighter(state.selected);
  const softBtns = SOFT_MOVES.map(
    (m) =>
      `<button class="move" type="button" data-move="${m.id}" title="${m.hint}">
        <span>${m.name}</span><span class="key">${m.key}</span>
      </button>`,
  ).join("");
  const clenchBtns = CLENCH_MOVES.map(
    (m) =>
      `<button class="move" type="button" data-move="${m.id}" title="${m.hint}">
        <span>${m.name}</span><span class="key">${m.key}</span>
      </button>`,
  ).join("");

  app.innerHTML = `
    <section class="fight-screen" id="fight">
      <div class="office" aria-hidden="true">
        <div class="neon-sign prod">PRODUCTIVITY</div>
        <div class="neon-sign quota">QUOTA ACHIEVED</div>
        <div class="neon-sign meet">MEETING!</div>
      </div>
      <div class="vignette"></div>
      <div class="fog-layer"></div>
      <div class="burst" id="burst">WHOOSH</div>
      <div class="stage">
        <div class="top-row">
          <h1 class="logo">CLENCHING</h1>
          <div class="timer" id="timer">60</div>
          <button class="mute-btn" type="button" data-mute style="position:static">${isMuted() ? "sound off" : "sound on"}</button>
        </div>
        <div class="vs-row">
          <div class="combatant">
            <img id="pface" src="${faceUrl(f.id)}" alt="${f.name}">
            <div>
              <h3 id="pname">${f.name}</h3>
              <div class="tag" id="ptag">${f.tag}</div>
            </div>
          </div>
          <div class="vs-pill">VS</div>
          <div class="combatant cpu">
            <img src="${faceUrl("neutral")}" alt="Office pressure">
            <div>
              <h3>Office</h3>
              <div class="tag">pressure, not a boss</div>
            </div>
          </div>
        </div>
        <div class="hud-card">
        <div class="meters">
          ${meter("grip", "Grip")}
          ${meter("contact", "Contact")}
          ${meter("field", "Field")}
          ${meter("quota", "Quota")}
        </div>
        <div class="log-box">
          <div class="banner" id="banner"></div>
          <p class="line" id="log"></p>
          <div class="delta-pops" id="deltas"></div>
        </div>
        <div class="ritual" id="ritual"></div>
        </div>
        <div class="moves">
          <div class="col soft">
            <h4>Land — feels small</h4>
            <div class="move-grid">${softBtns}</div>
          </div>
          <div class="col clench">
            <h4>Brace — feels strong</h4>
            <div class="move-grid">${clenchBtns}</div>
          </div>
        </div>
      </div>
    </section>
  `;
  fightRoot = app.querySelector("#fight");
  fightRoot.querySelectorAll("[data-move]").forEach((btn) => {
    btn.addEventListener("click", () => onMove(btn.getAttribute("data-move")));
  });
  bindMute();
}

function meter(id, label) {
  return `<div class="meter ${id}">
    <div class="label">${label}</div>
    <div class="track"><div class="fill" id="fill-${id}"></div></div>
    <div class="val" id="val-${id}">0</div>
  </div>`;
}

function onMove(id) {
  if (!state.game || state.phase !== "fight") return;
  unlockAudio();
  const before = state.game.snapshot();
  const snap = state.game.move(id);
  state.snap = snap;
  const clench = CLENCH_MOVES.some((m) => m.id === id);
  if (snap.whoosh) sfx("whoosh");
  else if (snap.banner === "VOID" || snap.banner === "FORCE" || snap.banner === "FOG") sfx("backfire");
  else if (clench) sfx("clench");
  else sfx("soft");
  paintFight(snap, before);
}

function paintFight(snap) {
  if (!fightRoot) return;
  const root = fightRoot;
  root.style.setProperty("--grip", snap.grip);
  root.style.setProperty("--contact", snap.contact);
  root.style.setProperty("--field", snap.field);
  root.style.setProperty("--quota", snap.quota);
  root.style.setProperty("--fog", snap.fog.toFixed(3));
  root.classList.toggle("foggy", snap.fog > 0.28);
  root.classList.toggle("clearing", snap.contact > 62 && snap.grip < 40);

  setBar("grip", snap.grip);
  setBar("contact", snap.contact);
  setBar("field", snap.field);
  setBar("quota", snap.quota);

  const timer = root.querySelector("#timer");
  timer.textContent = String(snap.timeLeft).padStart(2, "0");
  timer.classList.toggle("low", snap.timeLeft <= 10);

  root.querySelector("#banner").textContent = snap.banner || "";
  root.querySelector("#log").textContent = snap.log;
  root.querySelector("#pface").src = faceUrl(snap.faceId);
  const fighter = getFighter(state.selected);
  root.querySelector("#ptag").textContent =
    snap.faceId !== fighter.id ? "creeping blank" : fighter.tag;

  const order = [
    ["chair", "sit"],
    ["okay", "stay"],
    ["soften", "2%"],
    ["widen", "room"],
    ["story", "story"],
  ];
  const ritual = root.querySelector("#ritual");
  const next = order.find(([k]) => !snap.ritual[k]);
  ritual.innerHTML = order
    .map(([k, label]) => {
      const on = snap.ritual[k] ? " on" : "";
      const n = next && next[0] === k ? " next" : "";
      return `<span class="${on}${n}">${label}</span>`;
    })
    .join("");

  if (snap.fxSeq !== lastFxSeq) {
    lastFxSeq = snap.fxSeq;
    if (snap.whoosh) {
      const burst = root.querySelector("#burst");
      burst.textContent = snap.banner === "ALIVE" ? "ALIVE" : "WHOOSH";
      burst.classList.remove("show", "brace");
      void burst.offsetWidth;
      burst.classList.add("show");
    } else if (snap.displayJuice >= 0.9 && snap.banner) {
      const burst = root.querySelector("#burst");
      burst.textContent = snap.banner;
      burst.classList.remove("show", "brace");
      void burst.offsetWidth;
      burst.classList.add("show", "brace");
    }
    if (snap.shake > 0.4) {
      root.classList.remove("shake");
      void root.offsetWidth;
      root.classList.add("shake");
    }
    const pops = [];
    const d = snap.lastDelta;
    if (d.grip) pops.push(fmtDelta("grip", d.grip));
    if (d.contact) pops.push(fmtDelta("contact", d.contact));
    if (d.field) pops.push(fmtDelta("field", d.field));
    if (d.quota) pops.push(fmtDelta("quota", d.quota));
    root.querySelector("#deltas").innerHTML = pops.join("");
  }

  if (snap.ending && state.phase === "fight") {
    sfx(snap.ending === "clear" ? "clear" : snap.ending === "quota" ? "quota" : "hollow");
    state.endingKind = snap.ending;
    state.phase = "ending-wait";
    setTimeout(() => showEnding(snap.ending), 900);
  }
}

function fmtDelta(name, n) {
  const sign = n > 0 ? "+" : "";
  const color =
    name === "quota"
      ? "#47ff9a"
      : name === "grip"
        ? "#ff7aa0"
        : name === "contact"
          ? "#ffe56a"
          : "#3ef0ff";
  return `<div style="color:${color}">${name} ${sign}${n}</div>`;
}

function setBar(id, n) {
  fightRoot.querySelector(`#fill-${id}`).style.width = `${n}%`;
  fightRoot.querySelector(`#val-${id}`).textContent = String(n);
}

function showEnding(kind) {
  state.phase = "end";
  const info = ENDINGS[kind] || ENDINGS.hover;
  app.innerHTML = `
    <section class="end-screen ${info.kind}">
      <div class="end-card">
        <h1>${info.title}</h1>
        <p class="kicker">${info.kicker}</p>
        <p>${info.body}</p>
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
  state.cueLeft = CUE.seconds;
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
    state.cueLeft = left;
    const n = Math.ceil(left);
    const label = app.querySelector("#cue-count");
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
    if (state.endingKind === "quota" || state.endingKind === "hollow" || state.endingKind === "hover") {
      /* hollow trophy loops to select on purpose */
    }
    state.phase = "select";
    state.game = null;
    renderSelect();
  });
}

function loop(ts) {
  if (state.phase !== "fight" || !state.game) return;
  const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0.016);
  lastTs = ts;
  const prevTime = state.snap?.timeLeft;
  const snap = state.game.tick(dt);
  state.snap = snap;
  if (prevTime !== snap.timeLeft && snap.timeLeft <= 10 && snap.timeLeft > 0) {
    sfx("tick");
  }
  paintFight(snap);
  requestAnimationFrame(loop);
}

function bindMute() {
  app.querySelectorAll("[data-mute]").forEach((b) => {
    b.addEventListener("click", () => {
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
  if (state.phase === "select") {
    const idx = FIGHTERS.findIndex((f) => f.id === state.selected);
    const f = FIGHTERS[idx];
    if (key === "arrowright") {
      e.preventDefault();
      const next = FIGHTERS.find((x) => x.row === f.row && x.col === f.col + 1) || f;
      state.selected = next.id;
      renderSelect();
    } else if (key === "arrowleft") {
      e.preventDefault();
      const next = FIGHTERS.find((x) => x.row === f.row && x.col === f.col - 1) || f;
      state.selected = next.id;
      renderSelect();
    } else if (key === "arrowdown") {
      e.preventDefault();
      const next = FIGHTERS.find((x) => x.row === f.row + 1 && x.col === f.col) || f;
      state.selected = next.id;
      renderSelect();
    } else if (key === "arrowup") {
      e.preventDefault();
      const next = FIGHTERS.find((x) => x.row === f.row - 1 && x.col === f.col) || f;
      state.selected = next.id;
      renderSelect();
    } else if (key === "enter" || key === " ") {
      e.preventDefault();
      showBrief();
    }
    return;
  }
  if (state.phase === "brief") {
    if (key === "enter" || key === " ") {
      e.preventDefault();
      if (briefArmed) startFight();
    }
    return;
  }
  if (state.phase === "fight") {
    const mv = ALL_MOVES.find((m) => m.key.toLowerCase() === key);
    if (mv) {
      e.preventDefault();
      onMove(mv.id);
    }
  }
  if (state.phase === "end" && (key === "enter" || key === " ")) {
    showCue();
  }
}

window.addEventListener("keydown", onKey);
renderSelect();
