/* ---------- profil en araignée : coach et auto-évaluation ---------- */
const RLAB = { app: "Consignes", qtec: "Technique", info: "Prise d'info", role: "Rôle au poste", tac: "Tactique", vol: "Volume", ment: "Mental", imp: "Impact", int: "Intensité", att: "Attitude", ballon: "Ballon", partage: "Jouer ensemble", collectif: "Collectif", attdef: "Attaque-défense", fair: "Fair-play" };
function radarSVG(axes, series) {
  const W = 380, H = 300, cx = W / 2, cy = 148, R = 92, n = axes.length;
  const pt = (i, v) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * R * v / 5, cy + Math.sin(a) * R * v / 5]; };
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Profil par critère">`;
  for (const v of [1, 2, 3, 4, 5]) s += `<polygon points="${axes.map((_, i) => pt(i, v).join(",")).join(" ")}" fill="none" stroke="#3b3536" stroke-width="${v === 5 ? 1.5 : 1}"/>`;
  axes.forEach(([k, labL], i) => {
    const lab = RLAB[k] || labL;
    const [x, y] = pt(i, 5); s += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#3b3536"/>`;
    const [lx, ly] = pt(i, 6.3), anc = Math.abs(lx - cx) < 8 ? "middle" : lx > cx ? "start" : "end";
    const mots = lab.split(" "), l1 = [], l2 = []; for (const m of mots) ((l1.join(" ").length + m.length) <= 13 && !l2.length ? l1 : l2).push(m);
    const dy = ly < cy - 10 ? -6 : ly > cy + 10 ? 6 : 0;
    s += `<text x="${lx}" y="${ly + dy - (l2.length ? 6 : 0)}" text-anchor="${anc}" fill="#cfc8bb" font-size="11.5">${esc(l1.join(" "))}${l2.length ? `<tspan x="${lx}" dy="13">${esc(l2.join(" "))}</tspan>` : ""}</text>`;
  });
  s += `<text x="${cx + 3}" y="${cy - R - 3}" fill="#7d766b" font-size="9">5</text>`;
  for (const se of series) {
    const ok = axes.filter(([k]) => typeof se.vals[k] === "number");
    if (ok.length < 3) continue;
    const pts = axes.map(([k], i) => pt(i, typeof se.vals[k] === "number" ? se.vals[k] : 0));
    s += `<polygon points="${pts.map(p => p.join(",")).join(" ")}" fill="${se.c}" fill-opacity="${se.fill ? .22 : 0}" stroke="${se.c}" stroke-width="2" ${se.dash ? 'stroke-dasharray="5 4"' : ""} stroke-linejoin="round"/>`;
    axes.forEach(([k, lab], i) => { if (typeof se.vals[k] !== "number") return; const [x, y] = pts[i]; s += `<circle cx="${x}" cy="${y}" r="3.5" fill="${se.c}"><title>${esc(se.n)} · ${esc(lab)} : ${n1(se.vals[k])} sur 5</title></circle>`; });
  }
  const el = h("div", { class: "radar" }); el.innerHTML = s + "</svg>"; return el;
}
function moyCrit(list, crits) { const o = {}; for (const [k] of crits) { const v = list.map(x => x.crit && x.crit[k]).filter(x => typeof x === "number"); if (v.length) o[k] = mean(v); } return o; }
function profilCard(fid, f, parent, asCoach) {
  const g = groupOf(f), notes = sortedNotes(f), autos = (S.autos[fid] || []).slice().sort((a, b) => a.date < b.date ? -1 : 1);
  const per = S.radarPer || "5";
  const prendre = list => per === "1" ? list.slice(-1) : per === "5" ? list.slice(-5) : list;
  const grilles = GRILLES[g] ? [["Entraînement", GRILLES[g].E, n => n.type !== "Match" && !isOldNote(n, g), a => a.type !== "Match"], ["Match", mGrid(g, f), n => n.type === "Match" && !isOldNote(n, g), a => a.type === "Match"]]
    : [["Toutes séances", GROUPS[g].crit, () => true, () => true]];
  const card = h("div", { class: "card stack" }, h("div", { class: "bar", style: "margin:0;gap:8px" }, h("h3", { style: "margin:0" }, parent ? "Son profil" : "Profil par critère"),
    h("div", { class: "row", style: "gap:6px" }, [["1", "Dernière"], ["5", "5 dernières"], ["s", "Saison"]].map(([k, l]) => h("button", { type: "button", class: "opt", "aria-pressed": String(per === k), onclick: () => { S.radarPer = k; render(); } }, l)))));
  const zone = h("div", { class: "radars" });
  let rien = true;
  for (const [titre, crits, fn, fa] of grilles) {
    const ns = prendre(notes.filter(fn)); if (!ns.length) continue; rien = false;
    const as = parent ? [] : prendre(autos.filter(a => fa(a) && Object.keys(a.crit || {}).some(k => crits.some(c => c[0] === k))));
    const series = [{ n: "Coach", c: "#e0182d", fill: true, vals: moyCrit(ns, crits) }];
    if (as.length) series.push({ n: "Auto-évaluation", c: "#cdbd8f", dash: true, vals: moyCrit(as, crits) });
    zone.append(h("div", { class: "radar-box" }, h("div", { class: "bars-t", style: "text-align:center" }, `${titre} · ${ns.length} note${ns.length > 1 ? "s" : ""}`), radarSVG(crits, series)));
  }
  if (rien) return null;
  card.append(zone, h("div", { class: "legend", style: "justify-content:center" }, h("span", {}, h("span", { class: "dot", style: "background:var(--rouge)" }), "Note du coach"),
    parent ? null : h("span", {}, h("span", { class: "dot", style: "background:var(--or)" }), "Auto-évaluation")),
    h("p", { class: "note", style: "margin:0;text-align:center" }, parent ? "Plus la forme est grande, plus il est à l'aise sur le critère. Elle se met à jour à chaque nouvelle note." : asCoach ? "Plus la forme est grande, meilleur c'est. Elle se met à jour à chaque nouvelle note : l'écart entre les deux formes montre où le joueur se sur-note ou se sous-note." : "Plus la forme est grande, meilleur c'est. Elle se met à jour à chaque nouvelle note : compare ta forme à celle du coach pour voir où tu te sur-notes ou te sous-notes."));
  return card;
}

