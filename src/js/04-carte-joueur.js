/* ---------- carte joueur ---------- */
/* fond de carte : motif du maillot 2026-27 (bandes verticales, médaillons) */
const FC_BG = (() => {
  const R = "#f2361c", N = "#262030", RD = "#c8220e", f = v => v.toFixed(1);
  const shield = "M14 0 H286 Q300 0 300 14 V346 Q300 368 279 378 L150 420 L21 378 Q0 368 0 346 V14 Q0 0 14 0 Z";
  const inner = "M18 8 H282 Q292 8 292 18 V343 Q292 360 275 368 L150 410 L25 368 Q8 360 8 343 V18 Q8 8 18 8 Z";
  const ring = (cx, cy, r) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="none" stroke="${RD}" stroke-width="1.6"/>`;
  const rosette = (cx, cy, r) => { let s = ring(cx, cy, r) + `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * .28)}" fill="${RD}"/>`;
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, x = cx + Math.cos(a) * r * .62, y = cy + Math.sin(a) * r * .62; s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r * .28)}" ry="${f(r * .12)}" transform="rotate(${k * 45} ${f(x)} ${f(y)})" fill="${RD}"/>`; } return s; };
  const vagues = (cx, cy, r) => { let s = ring(cx, cy, r); const w = r * .8;
    for (const k of [-1, 0, 1]) { const y = cy + k * r * .38; s += `<path d="M${f(cx - w)} ${f(y)} q${f(w / 4)} -${f(r * .18)} ${f(w / 2)} 0 t${f(w / 2)} 0 t${f(w / 2)} 0 t${f(w / 2)} 0" fill="none" stroke="${RD}" stroke-width="1.8"/>`; } return s; };
  const croix = (cx, cy, r) => ring(cx, cy, r) + `<path d="M${f(cx)} ${f(cy - r * .65)} V${f(cy + r * .4)} M${f(cx - r * .38)} ${f(cy - r * .3)} H${f(cx + r * .38)}" stroke="${RD}" stroke-width="2.4" fill="none"/><path d="M${f(cx - r * .42)} ${f(cy + r * .25)} Q${f(cx)} ${f(cy + r * .75)} ${f(cx + r * .42)} ${f(cy + r * .25)}" stroke="${RD}" stroke-width="2" fill="none"/>`;
  const motifs = [rosette, vagues, croix, rosette, croix, vagues], P = 110, red = 52, parts = [];
  for (let x = -96, col = 0; x < 300; x += P, col++) {
    parts.push(`<rect x="${x}" y="0" width="${red}" height="420" fill="${R}"/>`);
    for (let j = 0; j < 9; j++) { const y = j * red;
      if ((j + col) % 2) parts.push(`<rect x="${x}" y="${y}" width="${red}" height="${red}" fill="${RD}" opacity="0.28"/>`);
      parts.push(`<g opacity="0.55">${motifs[(j + col * 2) % 6](x + red / 2, y + red / 2, red * .42)}</g>`); }
    let xx = x + red; for (const [w, c] of [[3, N], [4, R], [44, N], [4, R], [3, N]]) { parts.push(`<rect x="${xx}" y="0" width="${w}" height="420" fill="${c}"/>`); xx += w; }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="420" viewBox="0 0 300 420"><defs><clipPath id="c"><path d="${shield}"/></clipPath><linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d0b10" stop-opacity="0.1"/><stop offset="0.45" stop-color="#0d0b10" stop-opacity="0.25"/><stop offset="0.62" stop-color="#0d0b10" stop-opacity="0.78"/><stop offset="1" stop-color="#0d0b10" stop-opacity="0.92"/></linearGradient></defs><path d="${shield}" fill="${N}"/><g clip-path="url(#c)">${parts.join("")}<rect width="300" height="420" fill="url(#v)"/></g><path d="${shield}" fill="none" stroke="#cdbd8f" stroke-width="3"/><path d="${inner}" fill="none" stroke="#cdbd8f" stroke-opacity="0.5" stroke-width="1"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
})();
document.documentElement.style.setProperty("--fc-bg", FC_BG);
function posteAbr(p) {
  if (!p) return "";
  if (ABR_P[p]) return ABR_P[p];
  const t = p.toLowerCase();
  const R = [["gardien", "GB"], ["central", "DC"], ["axial", "DC"], ["latéral droit", "DD"], ["latéral gauche", "DG"], ["arrière droit", "DD"], ["arrière gauche", "DG"], ["latéral", "LAT"], ["défensif", "MDC"], ["relayeur", "MC"], ["offensif", "MOC"], ["ailier droit", "AD"], ["ailier gauche", "AG"], ["ailier", "AIL"], ["attaquant", "BU"], ["avant-centre", "BU"], ["pointe", "BU"], ["milieu", "MC"], ["défenseur", "DEF"]];
  if (t.includes("milieu") && t.includes("axial")) return "MC";
  for (const [k, v] of R) if (t.includes(k)) return v;
  return p.slice(0, 3).toUpperCase();
}
function fcardData(f, parent) {
  const g = groupOf(f), G = GROUPS[g], ns = sortedNotes(f).slice(-5), o = overall(f, 5), r2 = v => v == null ? null : Math.round(v * 100) / 100;
  const items = [];
  const all = sortedNotes(f), nouv = GRILLES[g] ? all.filter(n => !isOldNote(n, g) && n.crit && Object.keys(n.crit).length) : [];
  if (GRILLES[g]) {
    const ent = nouv.filter(n => n.type !== "Match").slice(-5), mat = nouv.filter(n => n.type === "Match").slice(-5);
    for (const [k, lab] of GRILLES[g].E) items.push({ lab: parent ? lab.split(" ")[0] : (ABBR[k] || k), v: r2(critAvg(ent, k)) });
    items.push({ lab: "MATCH", v: r2(mean(mat.map(n => noteAvg(n, g)).filter(v => v != null))), hi: true });
  } else for (const [k, lab] of G.crit) items.push({ lab: parent ? lab.split(" ")[0] : (ABBR[k] || k), v: r2(critAvg(ns, k)) });
  return { parent: !!parent, note: o == null ? "–" : parent ? LEVELS[Math.round(o)] : String(Math.round(o * 20)), mot: !!(parent && o != null),
    pos: posteAbr(f.poste) || "", grp: (f.sousCat || G.label || "").toUpperCase(), nom: f.nom || "Joueur", poste: f.poste || "", items };
}
function fcardDraw(d, fid, cls) {
  const parent = !!d.parent, items = Array.isArray(d.items) ? d.items : [];
  const card = h("div", { class: "fcard" + (cls ? " " + cls : ""), role: "img", "aria-label": `Carte de ${d.nom || "joueur"}` });
  const inn = h("div", { class: "fc-in" });
  card.append(inn);
  inn.append(h("div", { class: "fc-gauche" },
    h("div", { class: "fc-note" + (d.mot ? " fc-mot" : "") + (d.vitrine ? " fc-star" : "") }, d.vitrine ? "★" : d.note || "–"),
    h("div", { class: "fc-lab" }, d.vitrine ? (d.titre === "Joueur du match" ? "JDM" : "HDM") : parent ? "NIVEAU" : "NOTE"),
    h("div", { class: "fc-filet" }),
    d.pos ? h("div", { class: "fc-pos" }, d.pos) : null,
    h("div", { class: "fc-grp" }, d.grp || "")));
  inn.append(avatarNode(fid, d.nom, "fc-ini"));
  const nom = d.nom || "Joueur", taille = nom.length > 22 ? 18 : nom.length > 16 ? 21 : nom.length > 12 ? 24 : 30;
  inn.append(h("div", { class: "fc-id" },
    h("div", { class: "fc-nom", style: `font-size:${taille}px` }, nom),
    d.poste ? h("div", { class: "fc-poste" }, d.poste) : null));
  const cell = it => parent
    ? h("div", { class: "fc-st" }, h("span", {}, String(it.lab).toUpperCase()), stars(it.v))
    : h("div", { class: "fc-st" + (it.hi ? " hi" : "") },
        h("div", {}, h("b", {}, it.v == null ? "–" : Math.round(it.v * 20)), h("span", {}, it.lab)),
        h("div", { class: "fc-jauge" }, h("i", { style: `width:${it.v == null ? 0 : Math.round(it.v * 20)}%` })));
  if (d.vitrine) {
    inn.append(h("div", { class: "fc-vit" }, h("div", { class: "fc-vt" }, d.titre), h("div", { class: "fc-vl" }, d.lab), h("div", { class: "fc-vd" }, d.date)));
    inn.append(h("div", { class: "fc-club" }, "ENDOUME · 1925"));
    return card;
  }
  const half = Math.ceil(items.length / 2);
  inn.append(h("div", { class: "fc-crit" + (parent ? " par" : "") },
    h("div", { class: "fc-col" }, ...items.slice(0, half).map(cell)),
    h("div", { class: "fc-sep" }),
    h("div", { class: "fc-col" }, ...items.slice(half).map(cell))));
  inn.append(h("div", { class: "fc-club" }, "ENDOUME · 1925"));
  return card;
}
function fcard(f, parent, fid) { return fcardDraw(fcardData(f, parent), fid); }
const stable = o => Array.isArray(o) ? "[" + o.map(stable).join(",") + "]" : o && typeof o === "object" ? "{" + Object.keys(o).sort().map(k => JSON.stringify(k) + ":" + stable(o[k])).join(",") + "}" : JSON.stringify(o === undefined ? null : o);
const avVus = new Set();
function watchAvatar(fid) {
  if (!fid || avVus.has(fid) || S.avatars[fid] || S.demo || !S.db) return;
  avVus.add(fid);
  try { S.db.doc("avatars/" + fid).onSnapshot(d => { if (d.exists) { S.avatars = { ...S.avatars, [fid]: d.data() }; softRender(); } }, () => {}); } catch (e) {}
}

