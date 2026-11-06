import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SKILL = "C:/Users/TOSHIBA/.claude/skills/anatomy";
const k = await import(pathToFileURL(`${SKILL}/kit/iso-kit.mjs`).href);
const { kitScript } = await import(pathToFileURL(`${SKILL}/scripts/inline-kit.mjs`).href);

const HERE = dirname(fileURLToPath(import.meta.url));
const DOCS = join(HERE, "..", "..", "docs");
const WIDTH = 820;
const HEIGHT = 480;

function shell(names, setup) {
  return `
const NAMES = ${JSON.stringify(names)};
const LAST = NAMES.length - 1;
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
let t = 0, target = 0, frame = 0, last = 0, clock = 0;
let touring = !still.matches, visible = false, idleTimer = 0;
${setup}
function draw() {
  pose(t);
  const index = clamp(Math.round(t), 0, LAST);
  const text = NAMES[index] + " · " + (index + 1) + "/" + NAMES.length;
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(index + 1));
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring) { clock += dt; target = Math.floor(clock / 2.3) % NAMES.length; }
  t = still.matches ? target : t + (target - t) * (1 - Math.exp(-dt / 0.34));
  if (Math.abs(target - t) < 0.02) t = target;
  draw();
  frame = visible && (touring || t !== target) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => {
  touring = false;
  target = clamp(next, 0, LAST);
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 4200);
  run();
};
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  steer(clamp((event.clientX - box.left) / box.width, 0, 1) * LAST);
});
stage.addEventListener("pointerleave", () => steer(target));
stage.addEventListener("keydown", (event) => {
  const here = clamp(Math.round(target), 0, LAST);
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = Math.min(LAST, here + 1);
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = Math.max(0, here - 1);
  if (event.key === "Home") to = 0;
  if (event.key === "End") to = LAST;
  if (to === null) return;
  event.preventDefault();
  steer(to);
});
draw();
`;
}

function publish(spec, body, live) {
  const stage = `<div class="iso-stage" tabindex="0" role="slider" aria-label="${spec.aria}" aria-valuemin="1" aria-valuemax="${spec.names.length}" aria-valuenow="1">${body}</div>`;
  const plate = k.plateHtml({
    fig: spec.fig,
    title: spec.title,
    hint: spec.hint,
    readout: `${spec.names[0]} · 1/${spec.names.length}`,
    keys: spec.keys,
    caption: spec.caption,
    body: stage,
  });
  const pageBody = `${plate}<p class="back-link" style="margin:1.6rem 0 0;font-size:0.85rem"><a href="index.html" style="color:inherit">Kembali ke profil</a></p><style>html.framed,html.framed body{overflow:hidden;background:#e6e6e6}html.framed .iso-page{margin:0;padding:0}html.framed .iso-figure{margin:0}html.framed .iso-legend,html.framed .back-link{display:none}</style><script>if(window.top!==window)document.documentElement.classList.add("framed")</script>`;
  const html = k.pageHtml({
    title: spec.title,
    theme: "light",
    body: pageBody,
    script: kitScript() + live,
    width: 860,
  });
  writeFileSync(join(HERE, spec.file), html);
  writeFileSync(join(DOCS, spec.file), html);
  console.log("wrote", spec.file);
}

function ctxFor(points, azimuth = 46) {
  const P = k.fitProjection(points, WIDTH, HEIGHT, { pad: 36, azimuth });
  const at = (point) => k.iso(point, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const L = (d, style) => k.lineSvg(d, style);
  const D = (points, style) => k.dotsSvg(points, style);
  const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
  return { P, at, S, L, D, byDepth };
}

function feet(c, plan, z) {
  const { P, S, L, D, at, byDepth } = c;
  const out = [`<path class="iso-halo" d="${k.haloOf(plan, z - 6, 4, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(plan, 8))) {
    out.push(S(k.cylinder(x, y, 3.4, z - 6, 1.4, P, 20), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 2.4, z - 4.6, 4.6, P, 18), { tone: "mid" }));
  }
  out.push(S(k.slabOf(plan, z, 4, P, 6, 0.8), { tone: "mid" }));
  const screws = k.corners(plan, 5);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 1.5, z + 4, P, 14)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, z + 4])), { size: 0.4 }));
  return out.join("");
}

function cabinet() {
  const W = 62;
  const depth = 40;
  const H = 78;
  const c = ctxFor([[-50, -40, -8], [50, 50, H + 16], [0, 0, 0]]);
  const { P, S, L, D, at } = c;
  const out = [];
  out.push(feet(c, { x: -40, y: -28, w: 80, d: 56, r: 4 }, 0));
  out.push(S(k.slabOf({ x: -W / 2, y: -depth / 2, w: W, d: 5, r: 1 }, 4, H, P, 4, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: -W / 2, y: -depth / 2, w: 5, d: depth, r: 1 }, 4, H, P, 4, 0.4), { tone: "lo" }));
  out.push(S(k.slabOf({ x: W / 2 - 5, y: -depth / 2, w: 5, d: depth, r: 1 }, 4, H, P, 4, 0.4), { tone: "lo" }));
  out.push(S(k.slabOf({ x: -W / 2, y: -depth / 2, w: W, d: depth, r: 1.5 }, H + 4, 5, P, 4, 0.5), { tone: "hi" }));
  const label = { x: -12, y: -8, w: 24, d: 14, r: 1 };
  out.push(S(k.slabOf(label, H + 9, 0.8, P, 3), { tone: "lo", crease: "none" }));
  out.push(k.faceTextSvg(k.topMatrix([0, -1], H + 9.9, P), "PG", { size: 3.2, tone: "mid", anchor: "middle" }));
  const drawers = [];
  for (let i = 0; i < 4; i += 1) {
    const z = 10 + i * 16;
    const box = { x: -W / 2 + 7, y: -depth / 2 + 6, w: W - 14, d: depth - 8, r: 1 };
    const bits = [];
    bits.push(S(k.slabOf(box, z, 13, P, 3, 0.4), { tone: i === 1 ? "hi" : "mid" }));
    bits.push(L(k.planOutline(k.insetPlan(box, 1.4), z + 13, P), { tone: "lo" }));
    bits.push(S(k.cylinder(0, depth / 2 - 8, 1.6, z + 5, 4, P, 14), { tone: "hi" }));
    bits.push(L(k.knurl(0, depth / 2 - 8, 1.6, z + 5, z + 9, 12, P), { tone: "lo" }));
    if (i === 0) {
      const card = { x: -8, y: -2, w: 14, d: 18, r: 0.5 };
      bits.push(S(k.slabOf(card, z + 13, 12, P, 2, 0.3), { tone: "hi", lit: true, crease: "lo" }));
      bits.push(L(k.planOutline(k.insetPlan(card, 1.5), z + 25, P), { tone: "faint" }));
    }
    bits.push(D([at([-18, depth / 2 - 10, z + 13]), at([18, depth / 2 - 10, z + 13])], { size: 0.35 }));
    drawers.push(`<g data-part="drawer" data-i="${i}">${bits.join("")}</g>`);
  }
  const svg = k.figureSvg({
    width: WIDTH,
    height: HEIGHT,
    label: "A personnel cabinet. One of four drawers slides toward you: identity, post, attendance, pay. The staff card stands in the identity drawer.",
    body: out.concat(drawers),
  });
  const to = k.towardViewer(P);
  publish({
    file: "gambar-simpeg.html",
    fig: "Fig 2",
    title: "SIMPEG",
    names: ["Identitas", "Jabatan", "Absen", "Gaji"],
    hint: "Arahkan kursor untuk membuka laci",
    aria: "Lemari SIMPEG. Tombol panah membuka laci berikutnya.",
    caption: "Empat laci: identitas, jabatan, absen, dan gaji. Laci yang dipilih terdorong ke depan. Kartu pegawai berdiri di laci identitas.",
    keys: [
      { mark: "lit", label: "Kartu pegawai di laci identitas" },
      { mark: "raised", label: "Laci yang sedang terbuka" },
    ],
  }, svg, shell(["Identitas", "Jabatan", "Absen", "Gaji"], `
const P = ${JSON.stringify(P)};
const TO = ${JSON.stringify(to)};
const drawers = [...svg.querySelectorAll('[data-part="drawer"]')];
function pose(t) {
  drawers.forEach((drawer, i) => {
    const open = Math.max(0, 1 - Math.abs(t - i)) * 18;
    drawer.setAttribute("transform", translateAlong(P, [TO[0] * open, TO[1] * open, 0]));
  });
}
`));
}

function hoist() {
  const c = ctxFor([[-70, -40, -8], [70, 40, 96]]);
  const { P, S, L, D, at } = c;
  const out = [];
  out.push(feet(c, { x: -36, y: -28, w: 72, d: 52, r: 4 }, 0));
  out.push(S(k.cylinder(0, 0, 4.2, 4, 74, P, 20), { tone: "mid" }));
  out.push(L(k.knurl(0, 0, 4.2, 8, 70, 18, P), { tone: "lo" }));
  [18, 36, 54, 70].forEach((z, i) => {
    out.push(S(k.slabOf({ x: 6, y: -16, w: 28, d: 22, r: 1.2 }, z, 3, P, 3, 0.3), { tone: i === 2 ? "hi" : "lo" }));
    out.push(D([at([10, -12, z + 3]), at([30, 2, z + 3])], { size: 0.4 }));
  });
  out.push(S(k.cylinder(0, 0, 7, 78, 4, P, 24), { tone: "hi" }));
  out.push(L(k.ring(0, 0, 5, 80, P, 20), { tone: "mid" }));
  const hook = [
    S(k.cylinder(0, 0, 6.2, 0, 6, P, 22), { tone: "mid" }),
    S(k.slabOf({ x: 4, y: -4, w: 22, d: 8, r: 1 }, 4, 3, P, 2), { tone: "hi" }),
    S(k.slabOf({ x: 16, y: -8, w: 16, d: 14, r: 1 }, 2, 9, P, 2, 0.3), { tone: "hi", lit: true, crease: "lo" }),
    S(k.cylinder(22, -1, 1.1, 11, 4, P, 12), { tone: "mid" }),
  ].join("");
  const svg = k.figureSvg({
    width: WIDTH,
    height: HEIGHT,
    label: "An instrument hoist. A tagged case climbs a mast past receiving, inspection, the rack and dispatch.",
    body: [...out, `<g data-part="hook" transform="${k.translateAlong(P, [0, 0, 16])}">${hook}</g>`],
  });
  publish({
    file: "gambar-alkes.html",
    fig: "Fig 3",
    title: "Inventaris alkes",
    names: ["Terima", "Cek", "Rak", "Keluar"],
    hint: "Arahkan kursor untuk menaikkan kotak",
    aria: "Kerekan alkes. Tombol panah menggeser kotak ke rak berikutnya.",
    caption: "Kotak alat naik di tiang: terima, cek, rak, lalu keluar. Setiap tinggi berhenti di raknya.",
    keys: [
      { mark: "lit", label: "Kotak alat yang diangkat" },
      { mark: "raised", label: "Rak tujuan" },
    ],
  }, svg, shell(["Terima", "Cek", "Rak", "Keluar"], `
const P = ${JSON.stringify(P)};
const HEIGHTS = [16, 34, 52, 68];
const hook = svg.querySelector('[data-part="hook"]');
function pose(t) {
  const i = Math.max(0, Math.min(3, Math.floor(t)));
  const f = t - i;
  const z = HEIGHTS[i] + (HEIGHTS[Math.min(3, i + 1)] - HEIGHTS[i]) * f;
  hook.setAttribute("transform", translateAlong(P, [0, 0, z]));
}
`));
}

function scale() {
  const c = ctxFor([[-70, -36, -8], [70, 36, 48]]);
  const { P, S, L, D, at } = c;
  const out = [];
  out.push(feet(c, { x: -54, y: -24, w: 108, d: 48, r: 6 }, 0));
  out.push(S(k.cylinder(0, 0, 5, 4, 14, P, 22), { tone: "mid" }));
  out.push(S(k.cylinder(0, 0, 2.2, 18, 6, P, 16), { tone: "hi" }));
  out.push(L(k.ring(0, 0, 3.4, 18, P, 16), { tone: "lo" }));
  const pan = (cx, kind) => {
    const bits = [];
    bits.push(S(k.cylinder(cx, 0, 2, 8, 10, P, 14), { tone: "mid" }));
    bits.push(S(k.cylinder(cx, 0, 11, 18, 3, P, 32, 0.6), { tone: "hi", crease: "lo" }));
    bits.push(L(k.ring(cx, 0, 9, 20.2, P, 28), { tone: "mid" }));
    if (kind === "left") {
      bits.push(S(k.cylinder(cx, 0, 5.5, 21, 8, P, 24, 0.5), { tone: "hi", lit: true, crease: "lo" }));
      bits.push(L(k.knurl(cx, 0, 5.5, 23, 29, 20, P), { tone: "faint" }));
    } else {
      [0, 1, 2].forEach((i) => bits.push(S(k.cylinder(cx - 4 + i * 4, 0, 2.2, 21 + i * 3.2, 3, P, 14), { tone: "mid" })));
    }
    return `<g data-part="${kind}">${bits.join("")}</g>`;
  };
  out.push(pan(-38, "left"));
  out.push(pan(38, "right"));
  out.push(`<path data-part="beam" class="iso-line" data-tone="hi" d="${k.segment([-38, 0, 20], [38, 0, 20], P)}" style="stroke-width:2.2"/>`);
  out.push(D([at([-38, 0, 20]), at([38, 0, 20]), at([0, 0, 24])], { size: 0.55, tone: "hi" }));
  const svg = k.figureSvg({
    width: WIDTH,
    height: HEIGHT,
    label: "A shop balance. A tin on the left pan and weights on the right. The beam tips as the load changes.",
    body: out,
  });
  publish({
    file: "gambar-tobacco.html",
    fig: "Fig 4",
    title: "Tobacco shop",
    names: ["Ringan", "Imbang", "Berat"],
    hint: "Arahkan kursor untuk menimbang",
    aria: "Timbangan toko. Tombol panah mengubah beban.",
    caption: "Kaleng di pan kiri, anak timbangan di pan kanan. Batang naik atau turun: ringan, imbang, lalu berat.",
    keys: [
      { mark: "lit", label: "Kaleng di pan kiri" },
      { mark: "raised", label: "Batang timbangan" },
    ],
  }, svg, shell(["Ringan", "Imbang", "Berat"], `
const P = ${JSON.stringify(P)};
const left = svg.querySelector('[data-part="left"]');
const right = svg.querySelector('[data-part="right"]');
const beam = svg.querySelector('[data-part="beam"]');
function pose(t) {
  const tip = (t - 1) * 8;
  left.setAttribute("transform", translateAlong(P, [0, 0, tip]));
  right.setAttribute("transform", translateAlong(P, [0, 0, -tip]));
  const rightLeg = segment([0, 0, 24], [38, 0, 20 - tip], P).replace("M", "L");
  beam.setAttribute("d", segment([-38, 0, 20 + tip], [0, 0, 24], P) + rightLeg);
}
`));
}

function till() {
  const c = ctxFor([[-70, -30, -8], [70, 46, 52]]);
  const { P, S, L, D, at } = c;
  const out = [];
  out.push(feet(c, { x: -58, y: -22, w: 116, d: 50, r: 4 }, 0));
  out.push(S(k.slabOf({ x: -52, y: -16, w: 104, d: 40, r: 2 }, 4, 16, P, 4, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan({ x: -52, y: -16, w: 104, d: 40, r: 2 }, 3), 20, P), { tone: "lo" }));
  out.push(S(k.slabOf({ x: -22, y: -4, w: 20, d: 16, r: 1 }, 20, 10, P, 2, 0.3), { tone: "hi", lit: true, crease: "lo" }));
  out.push(L(k.lineOnTop([-16, 4], [ -4, 4], 30, P), { tone: "mid" }));
  out.push(S(k.cylinder(36, 0, 3, 20, 14, P, 16), { tone: "mid" }));
  out.push(S(k.cylinder(36, 0, 7, 34, 6, P, 24, 1), { tone: "hi", crease: "lo" }));
  out.push(L(k.ring(36, 0, 4.5, 38, P, 18), { tone: "mid" }));
  const drawer = [
    S(k.slabOf({ x: -40, y: -8, w: 46, d: 28, r: 1.2 }, 6, 10, P, 3, 0.4), { tone: "hi" }),
    S(k.cylinder(-17, 16, 1.5, 9, 4, P, 12), { tone: "mid" }),
    L(k.knurl(-17, 16, 1.5, 9, 13, 10, P), { tone: "lo" }),
    D([at([-36, 14, 16]), at([2, 14, 16])], { size: 0.35 }),
  ].join("");
  const hammer = [
    S(k.slabOf({ x: 30, y: -1.2, w: 14, d: 2.4, r: 1 }, 36, 2.4, P, 2), { tone: "hi" }),
    S(k.cylinder(44, 0, 2.1, 35, 4, P, 12), { tone: "mid" }),
  ].join("");
  const to = k.towardViewer(P);
  const svg = k.figureSvg({
    width: WIDTH,
    height: HEIGHT,
    label: "A shop till. The drawer slides out, then the bell hammer drops.",
    body: [
      ...out,
      `<g data-part="drawer">${drawer}</g>`,
      `<g data-part="hammer">${hammer}</g>`,
    ],
  });
  publish({
    file: "gambar-tokoku.html",
    fig: "Fig 5",
    title: "Tokoku",
    names: ["Tutup", "Tarik", "Bel"],
    hint: "Arahkan kursor untuk membuka laci",
    aria: "Kasir toko. Tombol panah membuka laci lalu memukul bel.",
    caption: "Laci kas tertutup, lalu tertarik ke depan. Palu bel turun setelah laci terbuka. Paket tetap di atas meja.",
    keys: [
      { mark: "lit", label: "Paket di atas meja" },
      { mark: "raised", label: "Laci kas dan palu bel" },
    ],
  }, svg, shell(["Tutup", "Tarik", "Bel"], `
const P = ${JSON.stringify(P)};
const TO = ${JSON.stringify(to)};
const drawer = svg.querySelector('[data-part="drawer"]');
const hammer = svg.querySelector('[data-part="hammer"]');
function pose(t) {
  const open = Math.max(0, Math.min(1, t)) * 20;
  const dip = Math.max(0, t - 1) * 8;
  drawer.setAttribute("transform", translateAlong(P, [TO[0] * open, TO[1] * open, 0]));
  hammer.setAttribute("transform", translateAlong(P, [0, 0, -dip]));
}
`));
}

function press() {
  const c = ctxFor([[-60, -36, -8], [64, 40, 70]]);
  const { P, S, L, D, at } = c;
  const out = [];
  out.push(feet(c, { x: -46, y: -26, w: 92, d: 52, r: 4 }, 0));
  out.push(S(k.slabOf({ x: -28, y: -8, w: 36, d: 24, r: 1.2 }, 4, 6, P, 3, 0.4), { tone: "lo" }));
  out.push(S(k.slabOf({ x: -22, y: -2, w: 22, d: 12, r: 0.4 }, 10, 1.2, P, 2), { tone: "hi", lit: true, crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan({ x: -22, y: -2, w: 22, d: 12, r: 0.4 }, 1.2), 11.2, P), { tone: "faint" }));
  [-24, 12].forEach((x) => {
    out.push(S(k.cylinder(x, 4, 2.6, 4, 46, P, 16), { tone: "mid" }));
    out.push(L(k.knurl(x, 4, 2.6, 8, 44, 12, P), { tone: "lo" }));
  });
  out.push(S(k.slabOf({ x: -28, y: 1, w: 44, d: 6, r: 1 }, 50, 5, P, 3, 0.4), { tone: "hi" }));
  out.push(D([at([-24, 4, 50]), at([12, 4, 50])], { size: 0.45 }));
  out.push(S(k.cylinder(40, -8, 3.2, 4, 22, P, 16), { tone: "mid" }));
  const punch = [
    S(k.cylinder(-6, 4, 3.4, 0, 4, P, 18), { tone: "hi" }),
    S(k.cylinder(-6, 4, 1.5, 4, 16, P, 12), { tone: "hi", crease: "none" }),
    S(k.cylinder(-6, 4, 4, 20, 4, P, 18), { tone: "mid" }),
    L(k.knurl(-6, 4, 4, 20, 24, 16, P), { tone: "lo" }),
  ].join("");
  const arm = S(k.slabOf({ x: 38, y: -10, w: 3, d: 22, r: 1 }, 20, 3, P, 2), { tone: "hi" });
  const svg = k.figureSvg({
    width: WIDTH,
    height: HEIGHT,
    label: "A ticket press. The punch drops onto a ticket, then a barrier arm rises.",
    body: [
      ...out,
      `<g data-part="punch" transform="${k.translateAlong(P, [0, 0, 28])}">${punch}</g>`,
      `<g data-part="arm" transform="${k.translateAlong(P, [0, 0, 0])}">${arm}</g>`,
    ],
  });
  publish({
    file: "gambar-tiket.html",
    fig: "Fig 6",
    title: "Tiket wisata",
    names: ["Siap", "Cetak", "Palang"],
    hint: "Arahkan kursor untuk mencetak",
    aria: "Alat cetak tiket. Tombol panah menurunkan pelubang lalu menaikkan palang.",
    caption: "Tiket diam di landasan. Pelubang turun untuk mencetak. Palang di samping naik setelah tiket tercetak.",
    keys: [
      { mark: "lit", label: "Tiket di landasan" },
      { mark: "raised", label: "Pelubang dan palang" },
    ],
  }, svg, shell(["Siap", "Cetak", "Palang"], `
const P = ${JSON.stringify(P)};
const punch = svg.querySelector('[data-part="punch"]');
const arm = svg.querySelector('[data-part="arm"]');
function pose(t) {
  const drop = Math.max(0, Math.min(1, t)) * 16;
  const rise = Math.max(0, t - 1) * 14;
  punch.setAttribute("transform", translateAlong(P, [0, 0, 28 - drop]));
  arm.setAttribute("transform", translateAlong(P, [0, 0, rise]));
}
`));
}

function bell() {
  const c = ctxFor([[-64, -36, -8], [64, 40, 58]]);
  const { P, S, L, D, at } = c;
  const out = [];
  out.push(feet(c, { x: -56, y: -24, w: 112, d: 50, r: 4 }, 0));
  out.push(S(k.slabOf({ x: -48, y: -16, w: 96, d: 40, r: 2 }, 4, 6, P, 4, 0.5), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan({ x: -48, y: -16, w: 96, d: 40, r: 2 }, 3), 10, P), { tone: "lo" }));
  const book = { x: -36, y: -6, w: 28, d: 20, r: 0.8 };
  out.push(S(k.slabOf(book, 10, 3, P, 2, 0.3), { tone: "hi", lit: true, crease: "lo" }));
  out.push(L(k.lineOnTop([-22, -2], [-22, 10], 13.1, P), { tone: "mid" }));
  const cover = S(k.slabOf({ x: -22, y: -6, w: 14, d: 20, r: 0.6 }, 13, 1.2, P, 2), { tone: "hi", lit: true, crease: "none" });
  out.push(S(k.cylinder(-4, 2, 4.2, 10, 3, P, 20), { tone: "lo" }));
  out.push(S(k.cylinder(-4, 2, 2.4, 13, 5, P, 16), { tone: "mid" }));
  out.push(L(k.ring(-4, 2, 3.6, 13, P, 16), { tone: "hi" }));
  out.push(S(k.cylinder(28, 0, 3, 10, 22, P, 16), { tone: "mid" }));
  out.push(S(k.cylinder(28, 0, 8, 32, 7, P, 28, 1.1), { tone: "hi", crease: "lo" }));
  out.push(L(k.ring(28, 0, 5, 36, P, 20), { tone: "mid" }));
  out.push(D([at([28, 0, 39])], { size: 0.5, tone: "hi" }));
  const pivot = k.iso([28, 0, 34], P);
  const hammer = [
    S(k.slabOf({ x: 28, y: -1.1, w: 16, d: 2.2, r: 1 }, 33, 2.2, P, 2), { tone: "hi" }),
    S(k.cylinder(44, 0, 2.3, 32, 4, P, 14), { tone: "mid" }),
  ].join("");
  const svg = k.figureSvg({
    width: WIDTH,
    height: HEIGHT,
    label: "A classroom desk. A register opens, then a hammer strikes the bell.",
    body: [...out, `<g data-part="cover">${cover}</g>`, `<g data-part="hammer">${hammer}</g>`],
  });
  publish({
    file: "gambar-sekolah.html",
    fig: "Fig 7",
    title: "SDN 1 Tegalpingen",
    names: ["Absen", "Tugas", "Bel"],
    hint: "Arahkan kursor untuk memukul bel",
    aria: "Meja kelas. Tombol panah membuka buku lalu memukul bel.",
    caption: "Buku absen terbuka saat tugas. Pemukul berayun dan mengenai bel di posisi terakhir.",
    keys: [
      { mark: "lit", label: "Buku absen" },
      { mark: "raised", label: "Pemukul bel" },
    ],
  }, svg, shell(["Absen", "Tugas", "Bel"], `
const P = ${JSON.stringify(P)};
const PIVOT = ${JSON.stringify(pivot)};
const cover = svg.querySelector('[data-part="cover"]');
const hammer = svg.querySelector('[data-part="hammer"]');
function pose(t) {
  const lift = Math.max(0, Math.min(1, t)) * 8;
  const swing = Math.max(0, t - 1) * 32;
  cover.setAttribute("transform", translateAlong(P, [0, 0, lift]));
  hammer.setAttribute("transform", "rotate(" + swing + " " + PIVOT[0] + " " + PIVOT[1] + ")");
}
`));
}

cabinet();
hoist();
scale();
till();
press();
bell();
