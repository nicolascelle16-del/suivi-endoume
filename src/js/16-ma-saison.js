/* ---------- ma saison : courbe par mois + données ---------- */
const SER = { e: "#e0182d", m: "#b08c40" };
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const monthKey = d => d.slice(0, 7);
const monthLab = k => { const [y, m] = k.split("-"); return MOIS[+m - 1] + " " + y.slice(2); };
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const compteAssid = x => x && typeof x.date === "string" && (x.type || "Entraînement") !== "Match" && !x.ex && dansSaison(x);
function matchStats(f) {
  const m = (Array.isArray(f.presences) ? f.presences : []).filter(x => x && typeof x.date === "string" && x.type === "Match");
  return { conv: m.length, ok: m.filter(x => x.p).length, ex: m.filter(x => x.ex).length };
}
function presStats(f, from) {
  const p = (Array.isArray(f.presences) ? f.presences : []).filter(x => compteAssid(x) && (!from || x.date >= from));
  const ok = p.filter(x => x.p).length;
  return { n: p.length, ok, rate: p.length ? ok / p.length : null };
}
function tipBox() { return h("div", { class: "tip", role: "status", hidden: true }); }
function showTip(tip, host, html, x, y) {
  tip.innerHTML = html; tip.hidden = false;
  const hb = host.getBoundingClientRect(), tw = tip.offsetWidth;
  tip.style.left = Math.max(0, Math.min(hb.width - tw, x - tw / 2)) + "px"; tip.style.top = Math.max(0, y - tip.offsetHeight - 12) + "px";
}
function saisonCard(fid, f, parent) {
  const g = groupOf(f), G = GROUPS[g], notes = sortedNotes(f);
  const listeC = GRILLES[g] ? [...GRILLES[g].E.map(c => [c[0], c[1], "Entraînement"]), ...mGrid(g, f).map(c => [c[0], c[1], "Match"])] : G.crit;
  const crit = S.saisonCrit && listeC.some(c => c[0] === S.saisonCrit) ? S.saisonCrit : "";
  const val = n => crit ? (n.crit && typeof n.crit[crit] === "number" ? n.crit[crit] : null) : noteAvg(n, g);
  const card = h("div", { class: "card stack" }, h("h3", { style: "margin:0" }, parent ? "Sa saison en chiffres" : "Ma saison en chiffres"));
  // tuiles
  const all = notes.map(n => noteAvg(n, g)).filter(v => v != null);
  const first = mean(all.slice(0, 5)), last = mean(all.slice(-5));
  const prog = all.length >= 6 ? last - first : null;
  let best = null; notes.forEach(n => { const v = noteAvg(n, g); if (v != null && (!best || v > best.v)) best = { v, d: n.date, t: n.type }; });
  const ps = presStats(f);
  const nM = notes.filter(n => n.type === "Match").length;
  const tile = (lab, v, sub) => h("div", { class: "stat" }, h("div", { class: "stat-l" }, lab), h("div", { class: "stat-v" }, v), sub ? h("div", { class: "stat-s" }, sub) : null);
  card.append(h("div", { class: "stats-row" },
    tile("Moyenne saison", all.length ? n1(mean(all)) : "–", "sur 5"),
    tile("Progression", prog == null ? "–" : (prog >= 0 ? "+" : "−") + n1(Math.abs(prog)), prog == null ? "dès 6 évaluations" : "5 dernières vs 5 premières"),
    tile("Meilleure note", best ? n1(best.v) : "–", best ? `${fmtDate(best.d)} · ${best.t}` : null),
    tile("Évaluations", String(notes.length), `${notes.length - nM} entraînement${notes.length - nM > 1 ? "s" : ""} · ${nM} match${nM > 1 ? "s" : ""}`),
    tile("Présence", ps.rate == null ? "–" : Math.round(ps.rate * 100) + " %", ps.n ? `${ps.ok} entraînement${ps.ok > 1 ? "s" : ""} sur ${ps.n}` : "pas encore d'appel"),
    ...(() => { const ms = matchStats(f); return ms.conv ? [tile("Matchs", `${ms.ok}`, `joué${ms.ok > 1 ? "s" : ""} sur ${ms.conv} convocation${ms.conv > 1 ? "s" : ""}${ms.ex ? ` · ${ms.ex} excusé${ms.ex > 1 ? "s" : ""}` : ""}`)] : []; })(),
    ...(isGK(f) ? (() => { const st = notes.filter(n => n.type === "Match" && n.stats && typeof n.stats.be === "number"); if (!st.length) return [];
      const cs = st.filter(n => n.stats.be === 0).length, be = st.reduce((a, n) => a + n.stats.be, 0);
      return [tile("Clean sheets", String(cs), `${be} but${be > 1 ? "s" : ""} encaissé${be > 1 ? "s" : ""} en ${st.length} match${st.length > 1 ? "s" : ""}`)]; })() : []),
    ...(g === "U19" && !isGK(f) ? (() => { const st = notes.filter(n => n.type === "Match" && n.stats); if (!st.length) return [];
      const sum = k => st.reduce((a, n) => a + (typeof n.stats[k] === "number" ? n.stats[k] : 0), 0), nmin = st.filter(n => typeof n.stats.min === "number").length;
      return [tile("Buts", String(sum("buts")), `${sum("pd")} passe${sum("pd") > 1 ? "s" : ""} décisive${sum("pd") > 1 ? "s" : ""}`), tile("Temps de jeu", nmin ? `${sum("min")} min` : "–", nmin ? `sur ${nmin} match${nmin > 1 ? "s" : ""} renseigné${nmin > 1 ? "s" : ""}` : null)]; })() : [])));
  // filtre critère
  const optB = ([k, lab]) => h("button", { type: "button", class: "opt", "aria-pressed": String(crit === k), onclick: () => { S.saisonCrit = k; render(); } }, lab);
  if (GRILLES[g]) {
    card.append(h("div", { class: "row", style: "gap:6px" }, optB(["", "Toutes les notes"])));
    card.append(h("div", { class: "row", style: "gap:6px;align-items:center" }, h("span", { class: "note" }, "Entraînement :"), GRILLES[g].E.map(optB)));
    card.append(h("div", { class: "row", style: "gap:6px;align-items:center" }, h("span", { class: "note" }, "Match :"), mGrid(g, f).map(optB)));
    if (crit && DESC[crit]) card.append(h("p", { class: "note", style: "margin:0" }, `${LABEL[crit]} : ${DESC[crit]}`));
  } else card.append(h("div", { class: "row", style: "gap:6px" }, [["", "Toutes les notes"], ...G.crit].map(optB)));
  // données par mois
  const nbM = new Set(notes.map(n => monthKey(n.date))).size, parMois = nbM >= 2;
  const kf = parMois ? monthKey : (d => String(d).slice(0, 10)), labK = parMois ? monthLab : (k => fmtDate(k));
  const months = [...new Set(notes.map(n => kf(n.date)))].sort();
  const rows = months.map(k => {
    const ns = notes.filter(n => kf(n.date) === k);
    const e = ns.filter(n => n.type !== "Match").map(val).filter(v => v != null), m = ns.filter(n => n.type === "Match").map(val).filter(v => v != null);
    const p = (Array.isArray(f.presences) ? f.presences : []).filter(x => compteAssid(x) && kf(x.date) === k);
    return { k, e: mean(e), ne: e.length, m: mean(m), nm: m.length, pres: p.length ? p.filter(x => x.p).length / p.length : null, np: p.length };
  });
  if (months.length < 2 || notes.length < 4) { card.append(h("p", { class: "note", style: "margin:0" }, `La courbe apparaît dès 4 évaluations (${notes.length} pour l'instant).`)); }
  else {
    const W = 560, H = 240, L = 30, R = 104, T = 16, B = 30;
    const x = i => L + i * (W - L - R) / (months.length - 1), y = v => T + (5 - v) * (H - T - B) / 4;
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${parMois ? "Évolution mois par mois" : "Évolution séance par séance"}${crit ? " : " + esc(LABEL[crit] || crit) : ""}">`;
    for (let v = 1; v <= 5; v++) s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#2e2a2b" stroke-width="1"/><text x="${L - 10}" y="${y(v) + 4}" fill="#aaa294" font-size="12" text-anchor="end">${v}</text>`;
    rows.forEach((r, i) => s += `<text x="${x(i)}" y="${H - 8}" fill="#aaa294" font-size="12" text-anchor="middle">${esc(labK(r.k))}</text>`);
    s += `<line class="xh" x1="0" x2="0" y1="${T}" y2="${H - B}" stroke="#aaa294" stroke-width="1" stroke-dasharray="3 3" visibility="hidden"/>`;
    const labs = [];
    for (const [key, name] of [["e", "Entraînement"], ["m", "Match"]]) {
      const pts = rows.map((r, i) => r[key] == null ? null : [x(i), y(r[key]), r[key]]);
      let seg = [], d = "";
      pts.forEach(p => { if (p) seg.push(p); else { if (seg.length) d += "M" + seg.map(q => q[0].toFixed(1) + "," + q[1].toFixed(1)).join("L"); seg = []; } });
      if (seg.length) d += "M" + seg.map(q => q[0].toFixed(1) + "," + q[1].toFixed(1)).join("L");
      if (d) s += `<path d="${d}" fill="none" stroke="${SER[key]}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
      pts.forEach(p => { if (p) s += `<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="${SER[key]}" stroke="#1b1819" stroke-width="2"/>`; });
      const lp = [...pts].reverse().find(Boolean);
      if (lp && rows[rows.length - 1][key] != null) labs.push({ y: lp[1], x: lp[0], t: `${name} ${n1(lp[2])}` });
    }
    labs.sort((a, b) => a.y - b.y); if (labs.length === 2 && labs[1].y - labs[0].y < 15) { labs[0].y -= (15 - (labs[1].y - labs[0].y)) / 2; labs[1].y = labs[0].y + 15; }
    labs.forEach(l => s += `<text x="${l.x + 9}" y="${l.y + 4}" fill="#f5f2ec" font-size="12">${esc(l.t)}</text>`);
    const colW = (W - L - R) / (months.length - 1);
    rows.forEach((r, i) => s += `<rect class="hit" data-i="${i}" x="${x(i) - colW / 2}" y="${T}" width="${colW}" height="${H - T - B}" fill="transparent"/>`);
    s += `</svg>`;
    const host = h("div", { class: "chart", style: "position:relative" }); host.innerHTML = s;
    const tip = tipBox(); host.append(tip);
    const svg = host.querySelector("svg"), xh = svg.querySelector(".xh");
    const lv = v => parent && v != null ? ` (${LEVELS[Math.round(v)]})` : "";
    svg.querySelectorAll(".hit").forEach(rc => {
      const i = +rc.dataset.i, r = rows[i];
      const on = () => {
        xh.setAttribute("x1", x(i)); xh.setAttribute("x2", x(i)); xh.setAttribute("visibility", "visible");
        const sb = svg.getBoundingClientRect(), hb = host.getBoundingClientRect(), k = sb.width / W;
        showTip(tip, host, `<b>${esc(labK(r.k))}</b><span><i style="background:${SER.e}"></i>Entraînement : ${r.e == null ? "–" : n1(r.e) + lv(r.e)} <em>(${r.ne})</em></span><span><i style="background:${SER.m}"></i>Match : ${r.m == null ? "–" : n1(r.m) + lv(r.m)} <em>(${r.nm})</em></span><span>Présence : ${r.pres == null ? "–" : Math.round(r.pres * 100) + " %"}</span>`, sb.left - hb.left + x(i) * k, sb.top - hb.top + T * k + 20);
      };
      rc.addEventListener("pointerenter", on); rc.addEventListener("click", on);
    });
    svg.addEventListener("pointerleave", () => { tip.hidden = true; xh.setAttribute("visibility", "hidden"); });
    card.append(h("div", { class: "legend", style: "margin:0" }, h("span", {}, h("span", { class: "dot", style: `background:${SER.e}` }), "Entraînement"), h("span", {}, h("span", { class: "dot", style: `background:${SER.m}` }), "Match"), h("span", {}, parMois ? "moyenne du mois, sur 5" : "note de la séance, sur 5")), host);
  }
  if (rows.length) {
    const open = !!S.saisonTable;
    card.append(h("button", { type: "button", class: "linkbtn", style: "align-self:flex-start", "aria-expanded": String(open), onclick: () => { S.saisonTable = !open; render(); } }, open ? "Masquer les données" : parMois ? "Voir les données mois par mois" : "Voir les données séance par séance"));
    if (open) card.append(h("div", { class: "tablebox" }, h("table", { class: "stats" },
      h("thead", {}, h("tr", {}, h("th", {}, parMois ? "Mois" : "Séance"), h("th", {}, "Entraînement"), h("th", {}, "Match"), ...(GRILLES[g] ? [] : G.crit.map(c => h("th", {}, ABBR[c[0]] || c[1]))), h("th", {}, "Présence"))),
      h("tbody", {}, rows.map(r => {
        const ns = notes.filter(n => kf(n.date) === r.k);
        return h("tr", {}, h("td", {}, labK(r.k)), h("td", {}, r.e == null ? "–" : `${n1(r.e)} (${r.ne})`), h("td", {}, r.m == null ? "–" : `${n1(r.m)} (${r.nm})`),
          ...(GRILLES[g] ? [] : G.crit.map(c => h("td", {}, n1(mean(ns.map(n => n.crit && n.crit[c[0]]).filter(v => typeof v === "number")))))),
          h("td", {}, r.pres == null ? "–" : `${Math.round(r.pres * 100)} % (${r.np})`));
      })))));
  }
  return card;
}

