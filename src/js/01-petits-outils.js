/* ---------- petits outils ---------- */
{ const _ap = Element.prototype.append; Element.prototype.append = function (...k) { return _ap.apply(this, k.filter(x => x != null && x !== false)); }; }
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : String(kid));
  return el;
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const fmtDate = d => { const x = new Date(d + "T12:00:00"); return isNaN(x) ? d : x.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }); };
const fmtLong = d => { const x = new Date(d + "T12:00:00"); return isNaN(x) ? d : x.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }); };
const nid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const groupOf = f => GROUPS[f && f.groupe] ? f.groupe : "U19";
const byDate = (a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
const rawNotes = f => [...((f && Array.isArray(f.notes)) ? f.notes : [])].filter(n => n && typeof n.date === "string").sort(byDate);
const adjNotes = f => [...((f && Array.isArray(f.notesAdj)) ? f.notesAdj : [])].filter(n => n && typeof n.date === "string");
const POIDS = { coach: 2, adj: 1 };
function combineNotes(m, adjs) {
  const base = m || adjs[0], crit = {};
  const keys = new Set([...Object.keys((m && m.crit) || {}), ...adjs.flatMap(a => Object.keys(a.crit || {}))]);
  for (const k of keys) {
    let sum = 0, w = 0;
    if (m && m.crit && typeof m.crit[k] === "number") { sum += m.crit[k] * POIDS.coach; w += POIDS.coach; }
    for (const a of adjs) if (a.crit && typeof a.crit[k] === "number") { sum += a.crit[k] * POIDS.adj; w += POIDS.adj; }
    if (w) crit[k] = Math.round(sum / w * 10) / 10;
  }
  const stats = (m && m.stats) || (adjs.find(a => a.stats) || {}).stats;
  const out = { ...base, crit, com: [m && m.com, ...adjs.map(a => a.com)].filter(Boolean).join(" · "), detail: { coach: m ? m.crit || {} : null, adj: adjs.map(a => ({ nom: a.parNom || "Adjoint", crit: a.crit || {} })) } };
  if (stats) out.stats = stats; else delete out.stats;
  return out;
}
/* saison : du 1er août au 31 juillet. Les saisons passées restent dans la base et dans l'archive. */
const debutSaison = (d = today()) => { const y = +d.slice(0, 4), m = +d.slice(5, 7); return (m >= 8 ? y : y - 1) + "-08-01"; };
const libSaison = (d = today()) => { const y = +debutSaison(d).slice(0, 4); return `${y}-${y + 1}`; };
const dansSaison = n => S.toutesSaisons || !n || typeof n.date !== "string" || n.date >= debutSaison();
const sortedNotes = f => sortedNotesTout(f).filter(dansSaison);
const sortedNotesTout = f => {
  const main = rawNotes(f), adj = adjNotes(f);
  if (!adj.length) return main;
  const key = n => n.date + "|" + n.type, A = {};
  for (const n of adj) (A[key(n)] = A[key(n)] || []).push(n);
  const out = main.map(n => { const a = A[key(n)]; if (!a) return n; delete A[key(n)]; return combineNotes(n, a); });
  for (const k of Object.keys(A)) out.push(combineNotes(null, A[k]));
  return out.sort(byDate);
};
function noteAvg(n, g) {
  const v = critsForNote(n, g).map(c => n.crit && n.crit[c[0]]).filter(x => typeof x === "number" && x >= 1 && x <= 5);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}
function critAvg(notes, k, type) {
  const v = notes.filter(n => !type || n.type === type).map(n => n.crit && n.crit[k]).filter(x => typeof x === "number" && x >= 1 && x <= 5);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}
function overall(f, last) {
  const g = groupOf(f); let ns = sortedNotes(f); if (last) ns = ns.slice(-last);
  const v = ns.map(n => noteAvg(n, g)).filter(x => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}
const n1 = x => x == null ? "–" : x.toFixed(1).replace(".", ",");
const initials = n => (n || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
const ABBR = { arr: "ARR", sort: "SOR", plg: "PLA", rel: "REL", lead: "LEAD", eng: "ENG", tech: "TEC", intel: "INT", comp: "COM", plaisir: "PLA", jeu: "JEU", respect: "RES", prise: "PRI", plac: "PLA", pied: "PIE", comm: "COM", cour: "COU",
  int: "INT", app: "APP", qtec: "TEC", info: "INF", att: "ATT", role: "ROL", tac: "TAC", imp: "IMP", ment: "MEN", vol: "VOL",
  envie: "ENV", ballon: "BAL", ecoute: "ECO", partage: "PAR", resp: "RES", ose: "OSE", collectif: "COL", attdef: "A/D", fair: "FAI" };
function stars(v) { const r = Math.round(v || 0); const s = h("span", { class: "stars", "aria-label": `${r} sur 5` }); for (let i = 1; i <= 5; i++) s.append(i <= r ? h("span", {}, "★") : h("span", { class: "off" }, "★")); return s; }


