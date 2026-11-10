/* Endoume Avatar Studio — moteur 3D (Three.js, chargé à la demande)
   Personnage cartoon sculpté par géométrie procédurale : tête caricaturale déformée,
   yeux avec iris/paupières, mèches 3D en tubes, maillot texturé avec le blason du club.
   Les tenues sont décrites dans KITS : le club peut les modifier sans toucher au reste. */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export const KITS = {
  dom:   { label: "Domicile",   base: "#d9172e", stripe: "#0c0b0b", stripes: 7, pin: "#c9a85a", collar: "#0c0b0b", trim: "#c9a85a", num: "#ffffff", numEdge: "#0c0b0b", sleeve: "stripes" },
  ext:   { label: "Extérieur",  base: "#f3f0ea", stripe: null, bands: ["#d9172e", "#0c0b0b"], pin: null, collar: "#0c0b0b", trim: "#d9172e", num: "#0c0b0b", numEdge: null, sleeve: "base" },
  third: { label: "Third",      base: "#1a1718", stripe: null, bands: ["#b08c40"], pin: "#b08c40", collar: "#b08c40", trim: "#b08c40", num: "#b08c40", numEdge: null, sleeve: "base" },
  gb:    { label: "Gardien",    base: "#f2c230", stripe: null, bands: ["#0c0b0b"], pin: null, collar: "#0c0b0b", trim: "#0c0b0b", num: "#0c0b0b", numEdge: null, sleeve: "base", gloves: "#0c0b0b" }
};
export const SKIN = ["#f7d9c4", "#ecbf9b", "#d9a47a", "#c08559", "#a06a42", "#7f502f", "#5e3820", "#3f2516"];
export const HAIR = ["#141010", "#3b2416", "#6b4423", "#a8763a", "#dcb769", "#9a9a9a", "#2e4f9a", "#b3202f"];
export const EYES = ["#3a2316", "#6b4423", "#2f6a96", "#3f7a48", "#6f6f6f"];
export const CLOTH = ["#0c0b0b", "#f3f0ea", "#d9172e", "#b08c40"];
export const BOOTS = ["#111111", "#f3f0ea", "#d9172e", "#c9a85a", "#2e4f9a", "#ff4f8b"];

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const gauss = (dx, dy, s) => Math.exp(-(dx * dx + dy * dy) / s);
const mix = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);

/* ---------- tête sculptée ---------- */
function headShape(face) {
  return face === "rond" ? { sx: 1.07, sy: 1.1, jaw: .55, chin: .9 } : face === "fin" ? { sx: .9, sy: 1.22, jaw: 1.25, chin: 1.05 } : { sx: 1, sy: 1.16, jaw: .9, chin: 1 };
}
function sculpt(p, S) {
  // p : point de la sphère unité ; renvoie le point déformé (repère tête)
  let { x, y, z } = p;
  y *= S.sy; x *= S.sx;
  if (y < 0) { const t = Math.pow(-y / S.sy, 1.35); x *= 1 - .3 * S.jaw * t; z *= 1 - .16 * t; }
  const cb = -.78 * S.sy * S.chin; if (y < cb) y = cb + (y - cb) * .55;
  if (z < 0) z *= 1.07;                       // crâne
  if (y > .2 && z > 0) z *= .97;              // front
  if (z > 0) {
    z += .055 * gauss(Math.abs(x) - .46, y + .2, .05);   // pommettes
    z += .03 * gauss(x, y - .36, .05);                   // arcade
    z -= .045 * gauss(Math.abs(x) - .34, y - .06, .018); // orbites
    z += .03 * gauss(x, y + .92, .03);                   // menton
  }
  return V3(x, y, z);
}
function headGeometry(S) {
  const g = new THREE.SphereGeometry(1, 96, 72), pos = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); const q = sculpt(v, S); pos.setXYZ(i, q.x, q.y, q.z); }
  g.computeVertexNormals(); return g;
}
function shellGeometry(S, keep, off) {
  // coque suivant la forme de la tête (cheveux, barbe) : on garde les triangles où keep(point) est vrai
  const g = new THREE.SphereGeometry(1, 96, 72), pos = g.attributes.position, v = new THREE.Vector3(), ok = [];
  const sph = [];
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); sph.push(v.clone()); const q = sculpt(v, S); const n = q.clone().normalize(); const o = typeof off === "function" ? off(v) : off; pos.setXYZ(i, q.x + n.x * o, q.y + n.y * o, q.z + n.z * o); }
  for (let i = 0; i < pos.count; i++) ok.push(keep(sph[i]));
  const idx = g.index.array, ni = [];
  for (let t = 0; t < idx.length; t += 3) if (ok[idx[t]] && ok[idx[t + 1]] && ok[idx[t + 2]]) ni.push(idx[t], idx[t + 1], idx[t + 2]);
  g.setIndex(ni); g.computeVertexNormals(); return g;
}
const hairline = d => { // d : direction unité. Au-dessus de la ligne = cuir chevelu
  const front = sstep(-.15, .85, d.z);
  const lim = (-.42 * (1 - front) + .5 * front) - .32 * Math.abs(d.x) * front;
  return d.y > lim && !(Math.abs(d.x) > .82 && d.y < .25 && d.y > -.45); // dégage les oreilles
};
function scalpPoints(n, filter) {
  const pts = [];
  for (let i = 0; i < n * 3 && pts.length < n; i++) {
    const k = i + .5, phi = Math.acos(1 - 2 * k / (n * 3)), th = Math.PI * (1 + Math.sqrt(5)) * k;
    const d = V3(Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th));
    if (hairline(d) && (!filter || filter(d))) pts.push(d);
  }
  return pts;
}
function tubeStrands(S, roots, build, radius) {
  const gs = [];
  for (const d of roots) {
    const r = sculpt(d, S), n = r.clone().normalize();
    const path = build(r, n, d);
    const curve = new THREE.CatmullRomCurve3(path);
    const tg = new THREE.TubeGeometry(curve, 20, radius(d), 7, false);
    // pointe arrondie
    const tip = new THREE.SphereGeometry(radius(d) * .95, 8, 6); tip.translate(...path[path.length - 1].toArray());
    gs.push(tg, tip);
  }
  return mergeGeometries(gs.map(g => g.toNonIndexed ? g.toNonIndexed() : g));
}

/* ---------- textures ---------- */
function canvasTex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function jerseyTexture(kit, cfg, plain) {
  return canvasTex(2048, 1024, (x, W, H) => {
    x.fillStyle = kit.base; x.fillRect(0, 0, W, H);
    if (kit.stripe) {
      const n = kit.stripes * 2, sw = W / n;
      x.fillStyle = kit.stripe; for (let i = 0; i < n; i += 2) x.fillRect(i * sw + sw * .5, 0, sw, H);
      if (kit.pin) { x.strokeStyle = kit.pin; x.globalAlpha = .55; x.lineWidth = 2; for (let px = 0; px < W; px += sw / 4) { x.beginPath(); x.moveTo(px + 6, 0); x.lineTo(px + 6, H); x.stroke(); } x.globalAlpha = 1; }
    } else if (kit.bands) {
      // bandes verticales sur les flancs
      kit.bands.forEach((c, i) => { x.fillStyle = c; x.fillRect(W * .24 + i * 26, 0, 22, H); x.fillRect(W * .74 - i * 26, 0, 22, H); });
      if (kit.pin) { x.globalAlpha = .25; x.strokeStyle = kit.pin; for (let px = 0; px < W; px += 40) { x.beginPath(); x.moveTo(px, 0); x.lineTo(px, H); x.stroke(); } x.globalAlpha = 1; }
    }
    // ourlet bas
    x.fillStyle = kit.collar; x.fillRect(0, H - 34, W, 34); x.fillStyle = kit.trim; x.fillRect(0, H - 38, W, 6);
    // dos : nom + numéro (centré sur la couture u=0/1, dessiné des deux côtés)
    const num = plain ? "" : String(cfg.num || "").slice(0, 2), nom = plain ? "" : String(cfg.nomDos || "").toUpperCase().slice(0, 12);
    x.textAlign = "center"; x.textBaseline = "middle";
    for (const cx of [0, W]) {
      if (nom) { x.font = "600 64px 'Barlow Condensed', 'Arial Narrow', Arial, sans-serif"; if (kit.numEdge) { x.lineWidth = 8; x.strokeStyle = kit.numEdge; x.strokeText(nom, cx, 250); } x.fillStyle = kit.num; x.fillText(nom, cx, 250); }
      if (num) { x.font = "330px Oranienbaum, Georgia, serif"; if (kit.numEdge) { x.lineWidth = 14; x.strokeStyle = kit.numEdge; x.strokeText(num, cx, 520); } x.fillStyle = kit.num; x.fillText(num, cx, 520); }
    }
    // tissu : léger grain
    const img = x.getImageData(0, 0, W, H), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - .5) * 10; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    x.putImageData(img, 0, 0);
  });
}
function shortsTexture(color, kit) {
  return canvasTex(1024, 256, (x, W, H) => {
    x.fillStyle = color; x.fillRect(0, 0, W, H);
    const stripe = new THREE.Color(color).getHSL({}).l < .5 ? (kit.trim || "#c9a85a") : "#0c0b0b";
    x.fillStyle = stripe; x.fillRect(W * .25 - 8, 0, 16, H); x.fillRect(W * .75 - 8, 0, 16, H);
    x.fillRect(0, H - 14, W, 6);
  });
}
function socksTexture(color, kit) {
  return canvasTex(512, 512, (x, W, H) => {
    x.fillStyle = color; x.fillRect(0, 0, W, H);
    const band = new THREE.Color(color).getHSL({}).l < .5 ? (kit.trim || "#c9a85a") : "#d9172e";
    x.fillStyle = band; x.fillRect(0, 40, W, 22); x.fillRect(0, 74, W, 10);
    // côtes
    x.globalAlpha = .12; x.fillStyle = "#000"; for (let px = 0; px < W; px += 12) x.fillRect(px, 0, 4, 120); x.globalAlpha = 1;
  });
}
function irisTexture(col) {
  return canvasTex(256, 256, (x, W) => {
    const c = W / 2, g = x.createRadialGradient(c, c, 10, c, c, c);
    const base = new THREE.Color(col);
    g.addColorStop(0, "#" + base.clone().multiplyScalar(.5).getHexString()); g.addColorStop(.55, col); g.addColorStop(.9, "#" + base.clone().multiplyScalar(.6).getHexString()); g.addColorStop(1, "#0b0807");
    x.fillStyle = g; x.beginPath(); x.arc(c, c, c, 0, 7); x.fill();
    x.globalAlpha = .25; x.strokeStyle = "#fff"; for (let a = 0; a < 6.28; a += .18) { x.beginPath(); x.moveTo(c + Math.cos(a) * 40, c + Math.sin(a) * 40); x.lineTo(c + Math.cos(a) * 110, c + Math.sin(a) * 110); x.stroke(); }
    x.globalAlpha = 1; x.fillStyle = "#050404"; x.beginPath(); x.arc(c, c, 44, 0, 7); x.fill();
  });
}
function backgroundTexture() {
  return canvasTex(1024, 1024, (x, W, H) => {
    const g = x.createRadialGradient(W * .5, H * .42, 40, W * .5, H * .5, W * .75);
    g.addColorStop(0, "#3a1418"); g.addColorStop(.45, "#1c0f11"); g.addColorStop(1, "#090808");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.globalAlpha = .18; x.fillStyle = "#d9172e"; x.beginPath(); x.moveTo(W * .62, 0); x.lineTo(W * .78, 0); x.lineTo(W * .38, H); x.lineTo(W * .22, H); x.fill();
    x.globalAlpha = .1; x.fillStyle = "#c9a85a"; x.beginPath(); x.moveTo(W * .82, 0); x.lineTo(W * .86, 0); x.lineTo(W * .46, H); x.lineTo(W * .42, H); x.fill();
  });
}
function floorTexture() {
  return canvasTex(512, 512, (x, W) => {
    const c = W / 2, g = x.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, "rgba(201,168,90,.32)"); g.addColorStop(.62, "rgba(201,168,90,.08)"); g.addColorStop(.64, "rgba(201,168,90,.5)"); g.addColorStop(.66, "rgba(201,168,90,.06)"); g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g; x.fillRect(0, 0, W, W);
  });
}

/* ---------- membres ---------- */
function limb(a, b, r0, r1, mat, bulge = 0) {
  const L = a.distanceTo(b), pts = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; const r = r0 + (r1 - r0) * t + bulge * Math.sin(Math.PI * t); pts.push(new THREE.Vector2(Math.max(.001, r), t * L)); }
  pts.unshift(new THREE.Vector2(.001, -r0 * .6)); pts.push(new THREE.Vector2(.001, L + r1 * .6));
  const g = new THREE.LatheGeometry(pts, 20);
  const m = new THREE.Mesh(g, mat); m.castShadow = true;
  m.position.copy(a); m.quaternion.setFromUnitVectors(V3(0, 1, 0), b.clone().sub(a).normalize());
  return m;
}
function hand(side, skinMat, glove) {
  const g = new THREE.Group(), mat = glove || skinMat;
  const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), mat); palm.scale.set(.062, .085, .032); palm.position.y = -.07; palm.castShadow = true; g.add(palm);
  const fingers = [[-.04, .9], [-.013, 1], [.014, .96], [.04, .8]];
  fingers.forEach(([fx, l]) => {
    const a = V3(fx, -.14, 0), b = V3(fx * 1.15, -.14 - .075 * l, .012), c = V3(fx * 1.2, -.14 - .12 * l, .03);
    g.add(limb(a, b, .015, .014, mat)); g.add(limb(b, c, .014, .012, mat));
  });
  const ta = V3(-.05 * side * -1, -.07, .02), tb = V3(-.075 * side * -1, -.12, .05);
  g.add(limb(ta, tb, .017, .014, mat));
  return g;
}
function boot(color, side) {
  const s = new THREE.Shape();
  s.moveTo(-.11, 0); s.lineTo(.17, 0); s.quadraticCurveTo(.26, .005, .25, .055); s.quadraticCurveTo(.22, .1, .1, .11);
  s.lineTo(.02, .17); s.lineTo(-.1, .17); s.quadraticCurveTo(-.13, .1, -.11, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: .1, bevelEnabled: true, bevelThickness: .025, bevelSize: .02, bevelSegments: 4, curveSegments: 16 });
  g.translate(0, 0, -.05); g.rotateY(-Math.PI / 2);
  const grp = new THREE.Group();
  const up = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color, roughness: .35, clearcoat: .6, clearcoatRoughness: .3 })); up.castShadow = true; grp.add(up);
  const soleG = new THREE.BoxGeometry(.15, .022, .38); soleG.translate(0, .005, .07);
  const sole = new THREE.Mesh(soleG, new THREE.MeshStandardMaterial({ color: "#1b1b1b", roughness: .6 })); grp.add(sole);
  const studM = new THREE.MeshStandardMaterial({ color: "#d8d8d8", metalness: .6, roughness: .3 });
  [[.04, .2], [-.04, .2], [.04, .08], [-.04, .08], [.035, -.06], [-.035, -.06]].forEach(([x, z]) => { const st = new THREE.Mesh(new THREE.CylinderGeometry(.012, .016, .025, 8), studM); st.position.set(x, -.012, z); grp.add(st); });
  // lacets
  const lace = new THREE.MeshStandardMaterial({ color: "#f3f0ea", roughness: .8 });
  for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(.07, .008, .012), lace); l.position.set(0, .135 - i * .012, .015 + i * .028); l.rotation.x = -.35; grp.add(l); }
  // virgule dorée générique (pas de marque)
  const sw = new THREE.Mesh(new THREE.TorusGeometry(.06, .006, 6, 20, Math.PI * .8), new THREE.MeshStandardMaterial({ color: "#c9a85a", metalness: .5, roughness: .3 }));
  sw.position.set(side * .078, .06, .04); sw.rotation.set(0, Math.PI / 2, -.3); grp.add(sw);
  return grp;
}

/* ---------- personnage ---------- */
export function buildCharacter(cfg, crestTex) {
  const kit = KITS[cfg.maillot] || KITS.dom;
  const root = new THREE.Group();
  const H = (cfg.taille || 100) / 100, W = cfg.corps === "fine" ? .9 : cfg.corps === "puissante" ? 1.16 : 1;
  const T = cfg.corps === "fine" ? .88 : cfg.corps === "puissante" ? 1.25 : 1; // épaisseur des membres
  const skinC = SKIN[cfg.peau] || SKIN[3];
  const skin = new THREE.MeshPhysicalMaterial({ color: skinC, roughness: .52, sheen: .4, sheenColor: new THREE.Color(skinC).lerp(new THREE.Color("#ff9e80"), .5), clearcoat: cfg.coupe === "chauve" ? .35 : .08, clearcoatRoughness: .5 });
  const hairC = HAIR[cfg.cheveux] || HAIR[0];
  const hairM = new THREE.MeshStandardMaterial({ color: hairC, roughness: .78, metalness: .05 });
  const jersey = new THREE.MeshStandardMaterial({ map: jerseyTexture(kit, cfg), roughness: .72 });
  const trimM = new THREE.MeshStandardMaterial({ color: kit.trim, roughness: .4, metalness: .35 });
  const collarM = new THREE.MeshStandardMaterial({ color: kit.collar, roughness: .7 });
  const shortsC = CLOTH[cfg.short ?? 0] || CLOTH[0], socksC = CLOTH[cfg.chaussettes ?? 0] || CLOTH[0];

  // jambes, chaussettes, chaussures
  const body = new THREE.Group(); root.add(body);
  const legs = new THREE.Group(); body.add(legs);
  const sockM = new THREE.MeshStandardMaterial({ map: socksTexture(socksC, kit), roughness: .85 });
  for (const s of [-1, 1]) {
    const hip = V3(s * .17 * W, 1.12 * H, 0), knee = V3(s * .175 * W, .64 * H, .02), ank = V3(s * .18 * W, .14, -.01);
    legs.add(limb(hip, knee, .11 * T, .078 * T, skin, .012));
    const calf = limb(knee, ank, .084 * T, .06 * T, sockM, .02 * T); legs.add(calf);
    const b = boot(BOOTS[cfg.chaussures ?? 0] || BOOTS[0], s); b.position.set(s * .18 * W, .02, -.02); legs.add(b);
  }
  // short
  const shM = new THREE.MeshStandardMaterial({ map: shortsTexture(shortsC, kit), roughness: .75 });
  const pel = new THREE.LatheGeometry([[.001, 1.42], [.35, 1.42], [.39, 1.34], [.4, 1.2], [.39, 1.12]].map(([r, y]) => new THREE.Vector2(r, y * H)), 40);
  const pelvis = new THREE.Mesh(pel, shM); pelvis.scale.set(W, 1, .66); pelvis.castShadow = true; body.add(pelvis);
  for (const s of [-1, 1]) { const leg = limb(V3(s * .18 * W, 1.24 * H, 0), V3(s * .2 * W, .95 * H, .01), .19 * Math.min(W, 1.08), .175 * Math.min(W, 1.08), shM); leg.scale.z = .9; body.add(leg); }

  // torse (maillot)
  const prof = [[.001, 1.36], [.36, 1.36], [.39, 1.5], [.41, 1.7], [.45, 1.88], [.5, 2.0], [.49, 2.07], [.4, 2.13], [.22, 2.18], [.13, 2.2]].map(([r, y]) => new THREE.Vector2(r, 1.36 * H + (y - 1.36) * H));
  const torsoG = new THREE.LatheGeometry(prof, 64, Math.PI, Math.PI * 2);
  const torso = new THREE.Mesh(torsoG, jersey); torso.scale.set(W, 1, .62); torso.castShadow = true; body.add(torso);
  const neckBase = 2.2 * H;
  // blason sur le cœur (côté gauche du joueur = +x)
  if (crestTex) {
    const cg = new THREE.PlaneGeometry(.13, .143);
    const crest = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ map: crestTex, transparent: true, roughness: .5, polygonOffset: true, polygonOffsetFactor: -4 }));
    const cy = 1.9 * H, rr = .45 * W, cx = .19 * W, cz = rr * .62 * Math.sqrt(Math.max(0, 1 - (cx / rr) ** 2));
    crest.position.set(cx, cy, cz + .01); crest.rotation.y = Math.atan2(cx * .62 * .62, cz) * .9; crest.rotation.x = -.06; body.add(crest);
  }
  // col polo
  const col = new THREE.Mesh(new THREE.TorusGeometry(.135, .03, 10, 40), collarM); col.rotation.x = Math.PI / 2; col.position.y = neckBase - .015; col.scale.set(1.05, 1, .9); body.add(col);
  const colT = new THREE.Mesh(new THREE.TorusGeometry(.137, .007, 6, 40), trimM); colT.rotation.x = Math.PI / 2; colT.position.y = neckBase - .045; colT.scale.set(1.12, 1, .97); body.add(colT);
  for (const s of [-1, 1]) { const flap = new THREE.Mesh(new THREE.BoxGeometry(.1, .1, .012), collarM); flap.position.set(s * .05, neckBase - .07, .1); flap.rotation.set(-.45, 0, s * .55); body.add(flap); }

  // bras
  const arms = [];
  const sleeveM = kit.sleeve === "stripes" ? new THREE.MeshStandardMaterial({ map: jerseyTexture(kit, cfg, true), roughness: .72 }) : new THREE.MeshStandardMaterial({ color: kit.base, roughness: .72 });
  for (const s of [-1, 1]) {
    const g = new THREE.Group(); body.add(g); arms.push(g);
    const sh = V3(s * .46 * W, 1.99 * H, 0), el = V3(s * .58 * W, 1.52 * H, -.02), wr = V3(s * .63 * W, 1.12 * H, .05);
    g.add(limb(sh, el, .1 * T, .078 * T, skin, .014 * T));
    g.add(limb(el, wr, .076 * T, .056 * T, skin, .012 * T));
    const sleeve = limb(sh.clone().add(V3(-s * .02, .02, 0)), sh.clone().lerp(el, .5), .14 * Math.max(T, 1), .12 * Math.max(T, 1), sleeveM); g.add(sleeve);
    const cuffP = sh.clone().lerp(el, .5);
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(.12 * Math.max(T, 1), .012, 6, 24), trimM); cuff.position.copy(cuffP); cuff.quaternion.setFromUnitVectors(V3(0, 0, 1), el.clone().sub(sh).normalize()); g.add(cuff);
    const hd = hand(s, skin, kit.gloves ? new THREE.MeshStandardMaterial({ color: kit.gloves, roughness: .55 }) : null);
    hd.position.copy(wr); hd.rotation.z = s * .1; hd.scale.setScalar(kit.gloves ? 1.25 : 1); g.add(hd);
  }

  // cou (long et fin, style caricature)
  const neck = limb(V3(0, neckBase - .08, 0), V3(0, neckBase + .3, .01), .105, .09, skin); body.add(neck);
  const adam = new THREE.Mesh(new THREE.SphereGeometry(.018, 10, 8), skin); adam.position.set(0, neckBase + .09, .07); body.add(adam);

  // tête
  const head = new THREE.Group(); head.position.set(0, neckBase + .6, .02); body.add(head);
  const R = .42, S = headShape(cfg.visage);
  const hg = new THREE.Group(); hg.scale.setScalar(R); head.add(hg);
  const skull = new THREE.Mesh(headGeometry(S), skin); skull.castShadow = true; hg.add(skull);
  // oreilles
  for (const s of [-1, 1]) {
    const ear = new THREE.Group(); ear.position.set(s * 1.0 * S.sx, -.02, -.06); ear.rotation.set(0, s * .62, s * -.1);
    const o = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), skin); o.scale.set(.12, .3, .2); ear.add(o);
    const inn = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshStandardMaterial({ color: mix(skinC, "#3a1a12", .35), roughness: .7 })); inn.scale.set(.06, .19, .12); inn.position.set(s * .06, .01, .02); ear.add(inn);
    hg.add(ear);
    if (cfg.acc === "boucles") { const ring = new THREE.Mesh(new THREE.TorusGeometry(.05, .014, 8, 20), new THREE.MeshStandardMaterial({ color: "#d8b55a", metalness: .9, roughness: .2 })); ring.position.set(s * (.96 * S.sx + .03), -.25, .02); ring.rotation.y = Math.PI / 2; hg.add(ring); }
  }
  // yeux
  const eyeWhite = new THREE.MeshPhysicalMaterial({ color: "#f6f1ea", roughness: .15, clearcoat: 1 });
  const irisM = new THREE.MeshPhysicalMaterial({ map: irisTexture(EYES[cfg.yeux ?? 0] || EYES[0]), roughness: .1, clearcoat: 1 });
  const lidM = skin, lashM = new THREE.MeshStandardMaterial({ color: "#120c0a", roughness: .6 });
  const ser = cfg.expr === "serieux", ronde = cfg.formeYeux === "rond";
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(s * .33 * S.sx, .09, .83); hg.add(e);
    const er = .175;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(er, 32, 24), eyeWhite); e.add(ball);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(er * 1.005, 32, 12, 0, Math.PI * 2, 0, .62), irisM); iris.rotation.x = Math.PI / 2; e.add(iris);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(.018, 8, 6), new THREE.MeshBasicMaterial({ color: "#ffffff" })); hl.position.set(.045, .05, er * .99); e.add(hl);
    // paupières
    const lidTop = ser ? .6 : ronde ? .25 : .42, lidBot = ronde ? 2.55 : 2.35;
    const up = new THREE.Mesh(new THREE.SphereGeometry(er * 1.09, 32, 16, 0, Math.PI * 2, 0, lidTop + .55), lidM); up.rotation.x = -.15; e.add(up);
    const low = new THREE.Mesh(new THREE.SphereGeometry(er * 1.07, 32, 16, 0, Math.PI * 2, lidBot, Math.PI - lidBot), lidM); low.rotation.x = .2; e.add(low);
    const th = lidTop + .55, lr = er * 1.09;
    const lashG = new THREE.Group(); lashG.rotation.x = -.15; e.add(lashG);
    const lash = new THREE.Mesh(new THREE.TorusGeometry(lr * Math.sin(th), .011, 6, 40), lashM); lash.rotation.x = Math.PI / 2; lash.position.y = lr * Math.cos(th); lashG.add(lash);
    e.userData.base = e.rotation.clone(); eyes.push(e);
  }
  // sourcils
  const browM = new THREE.MeshStandardMaterial({ color: cfg.cheveux >= 5 ? "#2a1a12" : mix(hairC, "#000", .25), roughness: .9 });
  for (const s of [-1, 1]) {
    const thick = cfg.sourcils === "fins" ? .028 : .05;
    const tilt = ser ? -.07 : .02;
    const pts = [V3(s * .16, .27 + tilt * .2, .84), V3(s * .32, .33, .84), V3(s * .5, .28 + tilt, .74)].map(p => { const d = p.clone().normalize(); const q = sculpt(d, S); return q.add(q.clone().normalize().multiplyScalar(.03)); });
    const b = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, thick, 8, false), browM); b.scale.set(1, 1, 1); hg.add(b);
    for (const p of [pts[0], pts[2]]) { const cap = new THREE.Mesh(new THREE.SphereGeometry(thick, 8, 6), browM); cap.position.copy(p); hg.add(cap); }
  }
  // nez
  const nw = cfg.nez === "fin" ? .8 : cfg.nez === "large" ? 1.25 : 1;
  const noseP = [[.001, .3], [.06, .22], [.085, .05], [.12, -.08], [.14, -.17], [.07, -.235], [.001, -.24]].map(([r, y]) => new THREE.Vector2(r, y));
  const nose = new THREE.Mesh(new THREE.LatheGeometry(noseP, 24), skin); nose.scale.set(nw * 1.1, 1, 1.55); nose.position.set(0, -.16, .93); nose.rotation.x = .1; hg.add(nose);
  for (const s of [-1, 1]) { const al = new THREE.Mesh(new THREE.SphereGeometry(.07 * nw, 16, 12), skin); al.position.set(s * .1 * nw, -.33, .9); hg.add(al);
    const ns = new THREE.Mesh(new THREE.SphereGeometry(.03, 8, 6), new THREE.MeshStandardMaterial({ color: mix(skinC, "#000", .6) })); ns.scale.set(1, .6, .6); ns.position.set(s * .055 * nw, -.37, .93); hg.add(ns); }
  // bouche
  const lipC = mix(mix(skinC, "#000", .3), "#9a3b3b", .35);
  const lipM = new THREE.MeshPhysicalMaterial({ color: lipC, roughness: .35, clearcoat: .4 });
  const smile = cfg.expr === "dents" ? .14 : ser ? -.01 : .08, wide = cfg.expr === "dents" ? .32 : .26;
  const mouthPts = (yOff, z, k) => [-1, -.5, 0, .5, 1].map(t => { const x = t * wide; const y = -.6 + yOff + smile * (t * t) - (k || 0) * (1 - t * t); return sculpt(V3(x, y, z).normalize(), S).add(V3(0, 0, .015)); });
  if (cfg.expr === "dents") {
    const inside = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#2a0e0e", side: THREE.DoubleSide }));
    inside.scale.set(.27, .11, .08); inside.position.set(0, -.575, .9); hg.add(inside);
    const teeth = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(mouthPts(-.045, .9, .005).map(p => p.add(V3(0, 0, -.015)))), 24, .045, 8, false), new THREE.MeshPhysicalMaterial({ color: "#fbf8f1", roughness: .2, clearcoat: 1 })); teeth.scale.z = .7; hg.add(teeth);
  }
  const upL = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(mouthPts(.035, .9, 0)), 24, .028, 8, false), lipM); hg.add(upL);
  const loL = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(mouthPts(cfg.expr === "dents" ? -.13 : -.035, .9, cfg.expr === "dents" ? .02 : .025)), 24, .036, 8, false), lipM); hg.add(loL);
  for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.SphereGeometry(.03, 8, 6), lipM); c.position.copy(mouthPts(.0, .9, 0)[s < 0 ? 0 : 4]); hg.add(c); }

  // barbe
  if (cfg.barbe && cfg.barbe !== "non") {
    const legere = cfg.barbe === "legere";
    const beardM = new THREE.MeshStandardMaterial({ color: legere ? mix(hairC, skinC, .45) : hairC, roughness: .95 });
    const mouthHole = d => Math.abs(d.x) < .3 && d.y < -.38 && d.y > -.66 && d.z > .5;
    if (cfg.barbe === "oui" || legere) hg.add(new THREE.Mesh(shellGeometry(S, d => d.y < -.28 && d.z > -.35 && !mouthHole(d) && !(Math.abs(d.x) < .22 && d.y > -.42), legere ? .012 : .05), beardM));
    if (cfg.barbe === "bouc") hg.add(new THREE.Mesh(shellGeometry(S, d => Math.abs(d.x) < .22 && d.y < -.72 && d.z > .3, .04), beardM));
    if (cfg.barbe !== "legere") { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(mouthPts(.11, .9, -.02).map(p => p.add(V3(0, 0, .02)))), 20, .035, 8, false), beardM); hg.add(m); }
    if (cfg.barbe === "moustache") { /* moustache seule : déjà ajoutée */ }
  }

  // cheveux
  const sty = cfg.coupe || "court";
  const capThick = { ras: .012, court: .05, degrade: .03, flattop: .05, boucle: .04, afro: .05, tresses: .035, nattes: .02, long: .05, crete: .012 }[sty];
  const addShell = (keep, off, mat) => { const m = new THREE.Mesh(shellGeometry(S, keep, off), mat); m.castShadow = true; hg.add(m); return m; };
  const fadeM = new THREE.MeshStandardMaterial({ color: mix(hairC, skinC, .5), roughness: .95 });
  if (sty !== "chauve") {
    if (sty === "ras" || sty === "crete") addShell(hairline, capThick, new THREE.MeshStandardMaterial({ color: mix(hairC, skinC, .38), roughness: .95 }));
    else if (sty === "degrade") { addShell(hairline, .015, fadeM); addShell(d => hairline(d) && d.y > .42, .07, hairM); }
    else if (sty === "nattes") addShell(hairline, .012, fadeM);
    else addShell(hairline, d => capThick * (d.y > .3 ? 1 : .6), hairM);
  }
  if (sty === "flattop") {
    const ft = new THREE.Mesh(new THREE.CylinderGeometry(.74 * S.sx, .82 * S.sx, .55, 40, 1), hairM); ft.position.y = .98 * S.sy; ft.scale.z = .95; ft.castShadow = true; hg.add(ft);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(.74 * S.sx, .74 * S.sx, .02, 40), new THREE.MeshStandardMaterial({ color: mix(hairC, "#fff", .15), roughness: .9 })); top.position.y = 1.26 * S.sy; top.scale.z = .95; hg.add(top);
  }
  if (sty === "afro") {
    const ag = new THREE.SphereGeometry(1, 64, 48), p = ag.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = 1 + .05 * Math.sin(v.x * 17) * Math.sin(v.y * 15) * Math.sin(v.z * 13) + .03 * Math.sin(v.x * 31 + v.y * 23); p.setXYZ(i, v.x * n, v.y * n, v.z * n); }
    ag.computeVertexNormals();
    const af = new THREE.Mesh(ag, new THREE.MeshStandardMaterial({ color: hairC, roughness: 1 })); af.scale.set(1.42 * S.sx, 1.22, 1.3); af.position.set(0, .48, -.12); af.castShadow = true; hg.add(af);
  }
  if (sty === "boucle" || sty === "long") {
    const pts = scalpPoints(sty === "long" ? 120 : 160, d => d.y > (sty === "long" ? .25 : .1));
    const g = mergeGeometries(pts.map(d => { const q = sculpt(d, S); const n = q.clone().normalize(); const t = new THREE.TorusGeometry(.075, .035, 8, 14); t.lookAt(n); t.translate(...q.add(n.multiplyScalar(.07)).toArray()); return t.toNonIndexed(); }));
    const m = new THREE.Mesh(g, hairM); m.castShadow = true; hg.add(m);
  }
  if (sty === "tresses" || sty === "long") {
    const long = sty === "long";
    const roots = scalpPoints(long ? 70 : 64, d => !(d.z > .45 && Math.abs(d.x) < .35 && d.y < .7) || !long);
    const g = tubeStrands(S, roots, (r, n, d) => {
      const out = n.clone().multiplyScalar(.12), front = d.z > .25 && Math.abs(d.x) < .6;
      if (front) { const p0 = r.clone().sub(n.clone().multiplyScalar(.02)), p1 = r.clone().add(out), p2 = p1.clone().add(V3(d.x * .25, .04, .1)), p3 = p2.clone().add(V3(d.x * .3, -.1, .05)); return [p0, p1, p2, p3]; }
      const len = long ? 1.55 + .2 * Math.sin(d.x * 9) : 1.05 + .15 * Math.sin(d.x * 7 + d.z * 5);
      const side = V3(d.x, 0, d.z).normalize();
      const p0 = r.clone().sub(n.clone().multiplyScalar(.02)), p1 = r.clone().add(out);
      const sweep = front ? V3(d.x * .6, -.1, .25) : side.clone().multiplyScalar(.3);
      const p2 = p1.clone().add(sweep).add(V3(0, -len * .4, 0));
      const p3 = p2.clone().add(side.clone().multiplyScalar(long ? .12 : .05)).add(V3(0, -len * .6, front ? .05 : 0));
      const wav = long ? [p0, p1, p2.clone().add(V3(.06, 0, .04)), p2.clone().lerp(p3, .5).add(V3(-.06, 0, -.04)), p3] : [p0, p1, p2, p3];
      // garder les mèches hors du visage
      wav.forEach(p => { if (p.z > .55 && Math.abs(p.x) < .75 && p.y < .3) p.x = Math.sign(p.x || 1) * Math.max(Math.abs(p.x), .78); });
      return wav;
    }, () => long ? .055 : .062);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: hairC, roughness: .85 })); m.castShadow = true; hg.add(m);
  }
  if (sty === "nattes") {
    const beads = [];
    for (let row = -3; row <= 3; row++) for (let i = 0; i <= 18; i++) {
      const ang = .45 + i / 18 * 2.85, d = V3(row * .15, Math.sin(ang), Math.cos(ang)).normalize();
      if (!hairline(d)) continue;
      const q = sculpt(d, S), n = q.clone().normalize(), b = new THREE.SphereGeometry(.06, 10, 8); b.scale(1, .8, 1.5);
      const along = V3(0, Math.cos(ang), -Math.sin(ang));
      const m4 = new THREE.Matrix4().lookAt(V3(0, 0, 0), along, n); b.applyMatrix4(m4); b.translate(...q.add(n.multiplyScalar(.035)).toArray()); beads.push(b.toNonIndexed());
    }
    if (beads.length) { const m = new THREE.Mesh(mergeGeometries(beads), hairM); m.castShadow = true; hg.add(m); }
  }
  if (sty === "crete") {
    const beads = [];
    for (let i = 0; i <= 16; i++) { const t = i / 16, a = .5 + t * 2.6; const d = V3(0, Math.sin(a), Math.cos(a)).normalize(); if (!hairline(d)) continue; const q = sculpt(d, S), n = q.clone().normalize(); const b = new THREE.SphereGeometry(.09, 12, 10); b.scale(.8, 1, 1.6 - Math.abs(t - .45)); b.translate(...q.add(n.multiplyScalar(.12)).toArray()); beads.push(b.toNonIndexed()); }
    const m = new THREE.Mesh(mergeGeometries(beads), hairM); m.castShadow = true; hg.add(m);
  }
  // accessoires
  if (cfg.acc === "bandeau") {
    const band = new THREE.Mesh(new THREE.TorusGeometry(1, .07, 12, 64), new THREE.MeshStandardMaterial({ color: "#0c0b0b", roughness: .7 }));
    band.scale.set(1.04 * S.sx, 1.02 * 1.04, 1.06); band.rotation.x = Math.PI / 2 - .38; band.position.y = .48; hg.add(band);
    const line = new THREE.Mesh(new THREE.TorusGeometry(1, .016, 6, 64), new THREE.MeshStandardMaterial({ color: "#d9172e" }));
    line.scale.copy(band.scale).multiplyScalar(1.025); line.rotation.copy(band.rotation); line.position.copy(band.position); hg.add(line);
  }
  if (cfg.acc === "lunettes") {
    const fr = new THREE.MeshStandardMaterial({ color: "#0c0b0b", roughness: .3, metalness: .3 });
    for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(.2, .025, 10, 32), fr); r.position.set(s * .34 * S.sx, .06, .97); r.scale.set(1.1, .85, 1); hg.add(r);
      const glass = new THREE.Mesh(new THREE.CircleGeometry(.2, 32), new THREE.MeshPhysicalMaterial({ color: "#ffffff", transmission: .9, transparent: true, opacity: .15, roughness: 0 })); glass.position.copy(r.position).add(V3(0, 0, .01)); glass.scale.copy(r.scale); hg.add(glass);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .75, 6), fr); arm.rotation.x = Math.PI / 2; arm.position.set(s * .58 * S.sx, .1, .62); arm.rotation.y = s * .12; hg.add(arm); }
    const br = new THREE.Mesh(new THREE.TorusGeometry(.07, .02, 6, 12, Math.PI), fr); br.position.set(0, .1, 1.0); hg.add(br);
  }
  root.userData = { head, arms, body, eyes, torso };
  return root;
}

/* ---------- studio ---------- */
export function createStudio(container, cfg, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.append(renderer.domElement); renderer.domElement.style.display = "block"; renderer.domElement.style.touchAction = "none";
  const scene = new THREE.Scene(); scene.background = backgroundTexture();
  const cam = new THREE.PerspectiveCamera(28, 1, .1, 60);
  const HOME = { pos: V3(2.6, 2.5, 7.4), target: V3(0, 1.75, 0) };
  cam.position.copy(HOME.pos);
  const ctl = new OrbitControls(cam, renderer.domElement); ctl.target.copy(HOME.target); ctl.enableDamping = true; ctl.dampingFactor = .08; ctl.minDistance = 1.6; ctl.maxDistance = 11; ctl.enablePan = false;
  ctl.minPolarAngle = .35; ctl.maxPolarAngle = 1.75; ctl.autoRotateSpeed = 1.6; ctl.update();
  scene.add(new THREE.HemisphereLight("#fff4ea", "#2a1414", .9));
  const key = new THREE.DirectionalLight("#fff1e0", 2.4); key.position.set(3, 7, 5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -2; key.shadow.camera.right = 2; key.shadow.camera.top = 4; key.shadow.camera.bottom = -1; key.shadow.radius = 6; key.shadow.bias = -.0004; scene.add(key);
  const rim = new THREE.DirectionalLight("#ff3b4f", 1.6); rim.position.set(-4, 4, -5); scene.add(rim);
  const rim2 = new THREE.DirectionalLight("#e8c879", .9); rim2.position.set(4, 3, -4); scene.add(rim2);
  const fill = new THREE.DirectionalLight("#cfe0ff", .45); fill.position.set(-5, 2, 4); scene.add(fill);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(2.2, 64), new THREE.MeshBasicMaterial({ map: floorTexture(), transparent: true, depthWrite: false })); floor.rotation.x = -Math.PI / 2; floor.position.y = .001; scene.add(floor);
  const sh = new THREE.Mesh(new THREE.CircleGeometry(2, 48), new THREE.ShadowMaterial({ opacity: .45 })); sh.rotation.x = -Math.PI / 2; sh.position.y = .002; sh.receiveShadow = true; scene.add(sh);
  let crestTex = null, char = null, cur = { ...cfg }, raf = 0, t0 = performance.now(), disposed = false;
  const rebuild = () => {
    if (char) { scene.remove(char); char.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map && o.material.map !== crestTex) o.material.map.dispose(); o.material.dispose(); } }); }
    char = buildCharacter(cur, crestTex); scene.add(char);
  };
  if (opts.crestUrl) new THREE.TextureLoader().load(opts.crestUrl, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; crestTex = t; if (!disposed) rebuild(); });
  rebuild();
  const resize = () => { const w = container.clientWidth || 300, h = container.clientHeight || 300; renderer.setSize(w, h, false); renderer.domElement.style.width = w + "px"; renderer.domElement.style.height = h + "px"; cam.aspect = w / h; cam.updateProjectionMatrix(); };
  const ro = new ResizeObserver(resize); ro.observe(container); resize();
  const loop = now => {
    raf = requestAnimationFrame(loop); const t = (now - t0) / 1000;
    if (char) { const u = char.userData; u.body.position.y = Math.sin(t * 1.6) * .008; u.head.rotation.y = Math.sin(t * .6) * .08; u.head.rotation.x = Math.sin(t * .9) * .025; u.arms.forEach((a, i) => a.rotation.z = Math.sin(t * 1.6 + i) * .012);
      const blink = (t % 4.2) < .12; u.eyes.forEach(e => e.scale.y = blink ? .15 : 1); }
    ctl.update(); renderer.render(scene, cam);
  };
  raf = requestAnimationFrame(loop);
  return {
    set(next) { cur = { ...next }; rebuild(); },
    reset() { cam.position.copy(HOME.pos); ctl.target.copy(HOME.target); ctl.update(); },
    autoRotate(on) { ctl.autoRotate = !!on; },
    snapshot(size = 200) {
      // portrait tête et épaules : rendu avec une caméra dédiée, puis recadrage carré
      const w = renderer.domElement.width, h = renderer.domElement.height;
      const pc = new THREE.PerspectiveCamera(22, w / h, .1, 50);
      const hp = char ? char.userData.head.getWorldPosition(new THREE.Vector3()) : V3(0, 2.8, 0);
      pc.position.set(.6, hp.y + .02, 3.4); pc.lookAt(0, hp.y - .25, 0);
      const save = char.userData.eyes.map(e => e.scale.y); char.userData.eyes.forEach(e => e.scale.y = 1);
      renderer.render(scene, pc);
      const side = Math.min(w, h), o = document.createElement("canvas"); o.width = size; o.height = size;
      o.getContext("2d").drawImage(renderer.domElement, (w - side) / 2, (h - side) / 2, side, side, 0, 0, size, size);
      char.userData.eyes.forEach((e, i) => e.scale.y = save[i]);
      return o.toDataURL("image/jpeg", .85);
    },
    dispose() { disposed = true; cancelAnimationFrame(raf); ro.disconnect(); ctl.dispose(); renderer.dispose(); renderer.domElement.remove(); }
  };
}
export function webglOK() { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; } }
