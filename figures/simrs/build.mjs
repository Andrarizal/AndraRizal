import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SKILL = "C:/Users/TOSHIBA/.claude/skills/anatomy";
const k = await import(pathToFileURL(`${SKILL}/kit/iso-kit.mjs`).href);
const { kitScript } = await import(pathToFileURL(`${SKILL}/scripts/inline-kit.mjs`).href);

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

// One chart carriage on a records bench. Seven stations sit behind the rail.
// The outpatient stamp drops only while the chart is under it. Two collars
// climb the dispatch rods only when the chart sits at the medical record.
const NAMES = ["Pendaftaran", "Rawat jalan", "IGD", "Farmasi", "Laboratorium", "Billing", "Rekam medis"];
const STOPS = [-120, -72, -24, 24, 72, 120, 158];

const WIDTH = 820;
const HEIGHT = 480;
const PLATE = { x: -168, y: -86, w: 372, d: 168, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;
const RAIL_Y = [2, 24];
const RAIL_FROM = -132;
const RAIL_TO = 176;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 46), [STOPS[6] + 36, -70, 40]],
  WIDTH,
  HEIGHT,
  { pad: 34, azimuth: 48 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 24))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 11);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  const strip = { x: -140, y: PLATE.y + PLATE.d - 16, w: 300, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));
  const label = { x: 150, y: 48, w: 28, d: 16, r: 1.2 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P), { tone: "faint" }));
  out.push(L(k.lineOnTop([label.x + 3, label.y + 4], [label.x + 22, label.y + 4], 0.8, P), { tone: "lo", free: true }));
  out.push(L(k.lineOnTop([label.x + 3, label.y + 8], [label.x + 18, label.y + 8], 0.8, P), { tone: "lo", free: true }));
  out.push(L(k.lineOnTop([label.x + 3, label.y + 12], [label.x + 14, label.y + 12], 0.8, P), { tone: "lo", free: true }));
  out.push(D([at([label.x + 2.2, label.y + 2.2, 0.8]), at([label.x + label.w - 2.2, label.y + 2.2, 0.8])], { size: 0.4 }));
  const crank = [0, 62];
  out.push(S(k.cylinder(crank[0], crank[1], 5.5, 0, 4, P, 28), { tone: "mid" }));
  out.push(L(k.knurl(crank[0], crank[1], 5.5, 0, 4, 32, P), { tone: "lo" }));
  out.push(L(k.lineOnTop([crank[0] - 2, crank[1]], [crank[0] + 4.2, crank[1]], 4, P), { tone: "hi" }));
  out.push(D([at([crank[0], crank[1], 4])], { size: 0.45, tone: "hi" }));
  return out.join("");
}

function rails() {
  const out = [];
  for (const y of RAIL_Y) {
    out.push(S(k.slabOf({ x: RAIL_FROM, y, w: RAIL_TO - RAIL_FROM, d: 5, r: 1 }, 0, 3, P, 3, 0.4), { tone: "mid" }));
    out.push(D([RAIL_FROM + 8, RAIL_TO - 8].map((x) => at([x, y + 2.5, 3])), { size: 0.4 }));
  }
  for (const x of [RAIL_FROM - 6, RAIL_TO]) {
    out.push(S(k.slabOf({ x, y: -2, w: 6, d: 34, r: 1.2 }, 0, 8, P, 3, 0.5), { tone: "mid" }));
    out.push(D([at([x + 3, 2, 8]), at([x + 3, 26, 8])], { size: 0.45 }));
  }
  return out.join("");
}

function hopper() {
  const x = STOPS[0];
  const out = [];
  out.push(S(k.slabOf({ x: x - 16, y: -70, w: 32, d: 22, r: 2 }, 0, 8, P, 4, 0.5), { tone: "mid" }));
  [0, 1, 2].forEach((i) => {
    out.push(S(k.slabOf({ x: x - 10 + i * 1.2, y: -64, w: 16, d: 12, r: 0.6 }, 8 + i * 1.4, 1.1, P, 3), { tone: i === 2 ? "hi" : "lo", crease: "faint" }));
  });
  out.push(D([at([x - 12, -66, 8]), at([x + 12, -66, 8])], { size: 0.4 }));
  return out.join("");
}

function pharmacy() {
  const x = STOPS[3];
  const out = [];
  out.push(S(k.slabOf({ x: x - 14, y: -72, w: 28, d: 24, r: 2 }, 0, 22, P, 4, 0.6), { tone: "mid", inner: k.lineSvg(k.sideSeam({ x: x - 14, y: -72, w: 28, d: 24, r: 2 }, 11, P, 4), { tone: "faint" }) }));
  [6, 12, 18].forEach((z) => {
    out.push(S(k.cylinder(x + 8, -62, 1.3, z, 1.6, P, 16), { tone: "hi" }));
  });
  return out.join("");
}

function laboratory() {
  const x = STOPS[4];
  const out = [];
  out.push(S(k.slabOf({ x: x - 16, y: -70, w: 34, d: 18, r: 1.5 }, 0, 3, P, 4, 0.4), { tone: "lo" }));
  [10, 16, 12, 18].forEach((h, i) => {
    const cx = x - 10 + i * 7;
    out.push(S(k.cylinder(cx, -60, 2.2, 3, h, P, 20), { tone: "hi", crease: "lo" }));
    out.push(L(k.sideArc(cx, -60, 2.2, 3 + h * 0.55, P, 12), { tone: "faint" }));
  });
  return out.join("");
}

function billing() {
  const x = STOPS[5];
  const z = 16;
  const out = [];
  out.push(S(k.cylinder(x, -58, 4, 0, 6, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(x, -58, 11, 6, 8, P, 40, 0.6), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, -58, 11, 10, 14, 48, P, 0.3), { tone: "lo" }));
  const ticks = k.radialTicks(x, -58, 8, 28, 7, 14, [1.2, 2.4], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(L(k.ring(x, -58, 2, 14, P, 16), { tone: "mid" }));
  out.push(`<path data-part="counter" class="iso-line" data-tone="hi" data-free="start" d="${k.lineOnTop([x, -58], [x, -50], 14.2, P)}" style="stroke-width:1.1"/>`);
  return out.join("");
}

function ledger() {
  const x = STOPS[6];
  const plan = { x: x - 16, y: -74, w: 34, d: 26, r: 2 };
  const out = [];
  out.push(S(k.slabOf(plan, 0, 16, P, 4, 0.7), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(plan, 3), 16, P), { tone: "lo" }));
  out.push(k.faceTextSvg(k.topMatrix([x + 1, -61], 16.05, P), "RM", { size: 3.2, tone: "mid", anchor: "middle" }));
  [18, 32].forEach((dx) => {
    out.push(S(k.cylinder(x + dx, -58, 1.7, 0, 34, P, 16), { tone: "mid", crease: "none" }));
    out.push(L(k.sideArc(x + dx, -58, 1.7, 12, P, 10), { tone: "faint" }));
  });
  return out.join("");
}

function gate() {
  const x = STOPS[2];
  const out = [];
  out.push(S(k.cylinder(x, -60, 3.2, 0, 20, P, 20), { tone: "mid" }));
  out.push(S(k.slabOf({ x: x - 1.4, y: -60, w: 16, d: 2.8, r: 1 }, 14, 3, P, 2), { tone: "hi" }));
  out.push(S(k.cylinder(x + 14, -58.6, 2.4, 13, 5, P, 18), { tone: "mid" }));
  out.push(L(k.knurl(x + 14, -58.6, 2.4, 13, 18, 16, P), { tone: "lo" }));
  return out.join("");
}

function stampBack() {
  const x = STOPS[1];
  return S(k.cylinder(x, -28, 2.6, 0, 36, P, 18), { tone: "mid" });
}

function carriage() {
  const body = { x: -16, y: -4, w: 32, d: 30, r: 2.4 };
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(body, 2), 3, 0.1, P)}" style="filter:blur(4px)"/>`];
  [[-12, 0], [12, 0], [-12, 22], [12, 22]].forEach(([x, y]) => {
    out.push(S(k.cylinder(x, y, 2.2, 1.2, 3.2, P, 16), { tone: "lo" }));
  });
  out.push(S(k.slabOf(body, 3, 5, P, 4, 0.6), { tone: "mid" }));
  out.push(D([-10, -4, 2, 8].map((x) => at([x, 24, 8])), { size: 0.4 }));
  out.push(S(k.slabOf({ x: -9, y: 3, w: 12, d: 16, r: 0.6 }, 8, 18, P, 3, 0.3), { tone: "lo", crease: "faint" }));
  const folder = { x: -6, y: 5, w: 14, d: 18, r: 0.6 };
  out.push(S(k.slabOf(folder, 8, 30, P, 3, 0.45), { tone: "hi", lit: true, crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(folder, 1.8), 38, P, 3), { tone: "faint" }));
  out.push(S(k.slabOf({ x: 4, y: 26, w: 4, d: 4, r: 1 }, 4, 3, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(6, 31, 2.8, 3, 5, P, 18), { tone: "mid" }));
  out.push(L(k.knurl(6, 31, 2.8, 3, 8, 16, P), { tone: "lo" }));
  return out.join("");
}

function stampFront() {
  const x = STOPS[1];
  const out = [];
  out.push(S(k.cylinder(x, 40, 2.6, 0, 36, P, 18), { tone: "mid" }));
  out.push(S(k.slabOf({ x: x - 4, y: -28, w: 8, d: 72, r: 2 }, 34, 5, P, 4, 0.5), { tone: "mid" }));
  out.push(D([at([x, -20, 39]), at([x, 32, 39])], { size: 0.45 }));
  out.push(S(k.cylinder(x + 10, 6, 2.2, 32, 6, P, 16), { tone: "mid" }));
  out.push(L(k.knurl(x + 10, 6, 2.2, 32, 38, 16, P), { tone: "lo" }));
  return out.join("");
}

function plunger() {
  const x = STOPS[1];
  return [
    S(k.cylinder(x, 12, 3.4, 0, 3, P, 20), { tone: "hi" }),
    S(k.cylinder(x, 12, 1.5, 3, 16, P, 14), { tone: "hi", crease: "none" }),
  ].join("");
}

function collars() {
  const x = STOPS[6];
  return [18, 32].map((dx) => S(k.cylinder(x + dx, -58, 4.2, 0, 5, P, 20), { tone: "hi", crease: "lo" })).join("");
}

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "A records bench. One patient chart rides a rail through registration, outpatient, emergency, pharmacy, laboratory, billing and the medical record. A stamp drops at the outpatient stop. Two collars rise, one for SATUSEHAT and one for BPJS, only when the chart sits at the record.",
  body: [
    plate(),
    hopper(),
    gate(),
    pharmacy(),
    laboratory(),
    billing(),
    ledger(),
    rails(),
    stampBack(),
    `<g data-part="carriage" transform="${k.translateAlong(P, [STOPS[0], 0, 0])}">${carriage()}</g>`,
    `<g data-part="plunger" transform="${k.translateAlong(P, [0, 0, 26])}">${plunger()}</g>`,
    stampFront(),
    `<g data-part="collars" transform="${k.translateAlong(P, [0, 0, 6])}">${collars()}</g>`,
  ],
});

const live = `
const P = ${JSON.stringify(P)};
const STOPS = ${JSON.stringify(STOPS)};
const NAMES = ${JSON.stringify(NAMES)};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const carriage = svg.querySelector('[data-part="carriage"]');
const plunger = svg.querySelector('[data-part="plunger"]');
const collars = svg.querySelector('[data-part="collars"]');
const counter = svg.querySelector('[data-part="counter"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
let x = STOPS[0], target = x;
let frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idleTimer = 0;
const nearest = (value) => STOPS.reduce((best, stop, index) => Math.abs(stop - value) < Math.abs(STOPS[best] - value) ? index : best, 0);
const tourAt = (t) => STOPS[Math.floor(t / 2.4) % STOPS.length];
function draw() {
  const index = nearest(x);
  const dip = clamp(1 - Math.abs(x - STOPS[1]) / 22, 0, 1);
  const lift = clamp(1 - Math.abs(x - STOPS[6]) / 24, 0, 1);
  carriage.setAttribute("transform", translateAlong(P, [x, 0, 0]));
  plunger.setAttribute("transform", translateAlong(P, [0, 0, 26 - dip * 14]));
  collars.setAttribute("transform", translateAlong(P, [0, 0, 6 + lift * 22]));
  const angle = index * (Math.PI * 2 / STOPS.length);
  const cx = STOPS[5], cy = -58;
  counter.setAttribute("d", lineOnTop([cx, cy], [cx + Math.sin(angle) * 7.2, cy - Math.cos(angle) * 7.2], 14.2, P));
  const copies = lift > 0.85 ? 2 : 0;
  const text = NAMES[index] + " · " + (index + 1) + "/7 · salinan " + copies;
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(index + 1));
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring) { clock += dt; target = tourAt(clock); }
  const calm = still.matches;
  x = calm ? target : x + (target - x) * (1 - Math.exp(-dt / 0.32));
  if (Math.abs(target - x) < 0.04) x = target;
  draw();
  const settled = !touring && x === target;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => {
  touring = false;
  target = clamp(next, STOPS[0], STOPS[STOPS.length - 1]);
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 4200);
  run();
};
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const share = clamp((event.clientX - box.left) / box.width, 0, 1);
  steer(STOPS[0] + share * (STOPS[STOPS.length - 1] - STOPS[0]));
});
stage.addEventListener("pointerleave", () => steer(target));
stage.addEventListener("keydown", (event) => {
  const here = nearest(target);
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = Math.min(STOPS.length - 1, here + 1);
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = Math.max(0, here - 1);
  if (event.key === "Home") to = 0;
  if (event.key === "End") to = STOPS.length - 1;
  if (to === null) return;
  event.preventDefault();
  steer(STOPS[to]);
});
draw();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Rekam medis",
  hint: "Arahkan kursor di sepanjang rel",
  readout: "Pendaftaran · 1/7 · salinan 0",
  keys: [
    { mark: "lit", label: "Berkas pasien, satu-satunya bagian yang menyala" },
    { mark: "raised", label: "Stempel rawat jalan, dan dua gelang SATUSEHAT serta BPJS" },
  ],
  caption: "Satu berkas berjalan berurutan: pendaftaran, rawat jalan, IGD, farmasi, laboratorium, billing, lalu rekam medis. Stempel turun hanya di rawat jalan. Dua gelang naik hanya di stasiun terakhir, satu ke SATUSEHAT dan satu ke BPJS.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Rel rekam medis. Tombol panah memindahkan berkas dari stasiun ke stasiun." aria-valuemin="1" aria-valuemax="7" aria-valuenow="1">${svg}</div>`,
});

const pageBody = `${body}<p class="back-link" style="margin:1.6rem 0 0;font-size:0.85rem"><a href="index.html" style="color:inherit">Kembali ke profil</a></p><style>html.framed,html.framed body{overflow:hidden;background:#e6e6e6}html.framed .iso-page{margin:0;padding:0}html.framed .iso-figure{margin:0}html.framed .iso-legend,html.framed .back-link{display:none}</style><script>if(window.top!==window)document.documentElement.classList.add("framed")</script>`;
const html = k.pageHtml({ title: "Rekam medis berjalan", theme, body: pageBody, script: kitScript() + live, width: 860 });
const file = theme === "light" ? "rekam-medis-light.html" : "rekam-medis.html";
writeFileSync(join(HERE, file), html);
writeFileSync(join(HERE, "..", "..", "docs", file), html);
console.log("wrote", file);
