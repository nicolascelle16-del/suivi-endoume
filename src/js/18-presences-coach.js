/* ---------- présences (coach) ---------- */
function presencesView(g) {
  const box = h("div", { class: "stack" });
  const list = Object.entries(S.fiches).filter(([, f]) => groupOf(f) === g);
  const per = S.presPer || "saison";
  const d0 = new Date(); const from = per === "4s" ? new Date(d0.getTime() - 28 * 864e5).toISOString().slice(0, 10) : per === "mois" ? today().slice(0, 8) + "01" : "";
  const sessMap = new Map();
  for (const [, f] of list) for (const p of (Array.isArray(f.presences) ? f.presences : [])) {
    if (!p || typeof p.date !== "string" || (from && p.date < from)) continue;
    const k = p.date + "|" + (p.type || "Entraînement"); const s = sessMap.get(k) || { date: p.date, type: p.type || "Entraînement", ok: 0, n: 0, cnt: 0 };
    if (compteAssid(p)) { s.cnt++; } s.n++; if (p.p) s.ok++; sessMap.set(k, s);
  }
  const sess = [...sessMap.values()].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  box.append(h("div", { class: "bar", style: "margin:0" }, h("h2", {}, `Présences ${GROUPS[g].label}`),
    h("div", { class: "row", style: "gap:6px" }, [["4s", "4 dernières semaines"], ["mois", "Ce mois"], ["saison", "Saison"]].map(([k, l]) => h("button", { type: "button", class: "opt", "aria-pressed": String(per === k), onclick: () => { S.presPer = k; render(); } }, l)))));
  box.append(seancesCoachCard(g));
  if (!sess.length) { box.append(h("div", { class: "empty" }, "Aucun appel sur cette période. Les présences se remplissent avec « Noter une séance » (bouton Présent / Absent) : tu peux faire juste l'appel sans mettre de notes.")); return box; }
  const sessE = sess.filter(s => s.type !== "Match"), tot = sessE.reduce((a, s) => a + s.cnt, 0), okT = list.reduce((a, [, f]) => a + (Array.isArray(f.presences) ? f.presences : []).filter(x => compteAssid(x) && x.p && (!from || x.date >= from)).length, 0);
  const rowsP = list.map(([fid, f]) => {
    const tous = (Array.isArray(f.presences) ? f.presences : []).filter(x => x && typeof x.date === "string" && (!from || x.date >= from)).sort((a, b) => a.date < b.date ? -1 : 1);
    const p = tous.filter(compteAssid);
    let streak = 0; for (let i = p.length - 1; i >= 0 && !p[i].p; i--) streak++;
    const map = new Map(tous.map(x => [x.date + "|" + (x.type || "Entraînement"), x.ex ? "ex" : x.p]));
    return { fid, f, n: p.length, ok: p.filter(x => x.p).length, rate: p.length ? p.filter(x => x.p).length / p.length : null, streak, map };
  }).sort((a, b) => (a.rate == null ? 2 : a.rate) - (b.rate == null ? 2 : b.rate) || (a.f.nom || "").localeCompare(b.f.nom || "", "fr"));
  const low = rowsP.filter(r => r.rate != null && (r.rate < 0.7 || r.streak >= 3)).length;
  const tile = (lab, v, sub) => h("div", { class: "stat" }, h("div", { class: "stat-l" }, lab), h("div", { class: "stat-v" }, v), sub ? h("div", { class: "stat-s" }, sub) : null);
  box.append(h("div", { class: "stats-row" },
    tile("Taux de présence", Math.round(okT / tot * 100) + " %", `${okT} présences sur ${tot}`),
    tile("Séances", String(sess.length), `dont ${sess.filter(s => s.type === "Match").length} match${sess.filter(s => s.type === "Match").length > 1 ? "s" : ""}`),
    tile("Par séance", n1(okT / sess.length).replace(",0", ""), `joueurs présents en moyenne`),
    tile("À surveiller", String(low), "moins de 70 % ou 3 absences de suite")));
  // barres : présents par séance
  const W = 680, H = 170, L = 30, R = 10, T = 12, B = 26, maxN = Math.max(...sess.map(s => s.n));
  const bw = Math.min(28, (W - L - R) / sess.length - 2), x = i => L + (i + 0.5) * (W - L - R) / sess.length, y = v => T + (maxN - v) * (H - T - B) / maxN;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Joueurs présents par séance">`;
  const stepY = maxN > 12 ? 5 : 2;
  for (let v = 0; v <= maxN; v += stepY) s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#2e2a2b"/><text x="${L - 8}" y="${y(v) + 4}" fill="#aaa294" font-size="12" text-anchor="end">${v}</text>`;
  sess.forEach((se, i) => {
    const top = y(se.ok), hh = H - B - top;
    if (hh > 0) s += `<path d="M${x(i) - bw / 2},${H - B} V${top + Math.min(4, hh)} q0,-4 4,-4 h${bw - 8} q4,0 4,4 V${H - B} Z" fill="${se.type === "Match" ? SER.m : SER.e}"/>`;
    s += `<rect class="hit" data-i="${i}" x="${x(i) - (W - L - R) / sess.length / 2}" y="${T}" width="${(W - L - R) / sess.length}" height="${H - T - B}" fill="transparent"/>`;
  });
  const stepX = Math.max(1, Math.ceil(sess.length / 8));
  sess.forEach((se, i) => { if (i % stepX === 0 || i === sess.length - 1) s += `<text x="${x(i)}" y="${H - 8}" fill="#aaa294" font-size="12" text-anchor="middle">${esc(fmtDate(se.date))}</text>`; });
  s += `</svg>`;
  const host = h("div", { class: "chart", style: "position:relative" }); host.innerHTML = s; const tip = tipBox(); host.append(tip);
  const svg = host.querySelector("svg");
  svg.querySelectorAll(".hit").forEach(rc => { const i = +rc.dataset.i, se = sess[i]; const on = () => { const sb = svg.getBoundingClientRect(), hb = host.getBoundingClientRect(), k = sb.width / W;
    showTip(tip, host, `<b>${esc(fmtLong(se.date))}</b><span>${esc(se.type)}</span><span>${se.ok} présent${se.ok > 1 ? "s" : ""} sur ${se.n}</span>`, sb.left - hb.left + x(i) * k, sb.top - hb.top + y(se.ok) * k); };
    rc.addEventListener("pointerenter", on); rc.addEventListener("click", on); });
  svg.addEventListener("pointerleave", () => { tip.hidden = true; });
  box.append(h("div", { class: "card stack" }, h("h3", { style: "margin:0" }, "Présents par séance"),
    h("div", { class: "legend", style: "margin:0" }, h("span", {}, h("span", { class: "dot", style: `background:${SER.e}` }), "Entraînement"), h("span", {}, h("span", { class: "dot", style: `background:${SER.m}` }), "Match")), host));
  // tableau joueurs
  const lastS = sess.slice(-10);
  const t = h("table", { class: "stats pres" },
    h("thead", {}, h("tr", {}, h("th", {}, "Joueur"), h("th", {}, "Taux"), h("th", {}, "Présent"), h("th", {}, "Absences de suite"), ...lastS.map(se => h("th", { class: "c", title: `${fmtLong(se.date)} · ${se.type}` }, fmtDate(se.date).replace(".", ""), se.type === "Match" ? h("small", {}, " M") : null)))),
    h("tbody", {}, rowsP.map(r => h("tr", { class: "clickable", onclick: () => { S.view = "fiche"; S.sel = r.fid; render(); } },
      h("td", {}, h("span", { class: "row", style: "gap:8px;align-items:center;flex-wrap:nowrap" }, avatarNode(r.fid, r.f.nom, "av-mini"), r.f.nom || "Sans nom")),
      h("td", {}, r.rate == null ? "–" : h("span", { class: "row", style: "gap:6px;align-items:center;flex-wrap:nowrap" }, h("span", { class: "track", style: "width:60px" }, h("span", { class: "fill", style: `display:block;width:${Math.round(r.rate * 100)}%` })), `${Math.round(r.rate * 100)} %`),
        r.rate != null && r.rate < 0.7 ? h("span", { class: "pill match", style: "margin-left:6px" }, "< 70 %") : null),
      h("td", {}, r.n ? `${r.ok} / ${r.n}` : "–"),
      h("td", {}, r.streak ? h("span", { class: r.streak >= 3 ? "pill match" : "" }, String(r.streak)) : "0"),
      ...lastS.map(se => { const v = r.map.get(se.date + "|" + se.type), nc = v === undefined && se.type === "Match"; return h("td", { class: "c " + (v === true ? "pr" : v === false ? "ab" : "nr"), title: v === true ? "Présent" : v === false ? "Absent" : v === "ex" ? "Excusé ou blessé" : nc ? "Non convoqué" : "Pas noté" }, v === true ? "✓" : v === false ? "✗" : v === "ex" ? "E" : nc ? "–" : "·"); })))));
  box.append(h("div", { class: "card stack" }, h("h3", { style: "margin:0" }, "Par joueur"), h("p", { class: "note", style: "margin:0" }, `✓ présent · ✗ absent · · pas noté. Les ${lastS.length} dernières séances de la période. Clique sur un joueur pour ouvrir sa fiche.`), h("div", { class: "tablebox" }, t)));
  return box;
}

function chart(f) {
  const g = groupOf(f);
  const pts = sortedNotes(f).map(n => ({ d: n.date, t: n.type, v: noteAvg(n, g) })).filter(p => p.v != null);
  const box = h("div", { class: "chart" });
  if (pts.length < 2) { box.append(h("p", { class: "note" }, "La courbe apparaît à partir de 2 évaluations.")); return box; }
  const W = 640, H = 200, L = 34, R = 14, T = 12, B = 30;
  const x = i => L + (pts.length === 1 ? 0 : i * (W - L - R) / (pts.length - 1));
  const y = v => T + (5 - v) * (H - T - B) / 4;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Évolution de la note moyenne">`;
  for (let v = 1; v <= 5; v++) s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#2e2a2b" stroke-width="1"/><text x="${L - 10}" y="${y(v) + 4}" fill="#a39e94" font-size="12" text-anchor="end">${v}</text>`;
  const line = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  s += `<polygon points="${x(0)},${y(1)} ${line} ${x(pts.length - 1)},${y(1)}" fill="rgba(224,24,45,.14)"/>`;
  s += `<polyline points="${line}" fill="none" stroke="#e0182d" stroke-width="2.5" stroke-linejoin="round"/>`;
  pts.forEach((p, i) => {
    const last = i === pts.length - 1;
    s += `<circle cx="${x(i)}" cy="${y(p.v)}" r="${last ? 6 : 4}" fill="${p.t === "Match" ? "#b08c40" : "#e0182d"}" stroke="#0e0d0f" stroke-width="2"><title>${esc(fmtDate(p.d))} · ${esc(p.t)} · ${n1(p.v)}</title></circle>`;
  });
  const step = Math.max(1, Math.ceil(pts.length / 7));
  pts.forEach((p, i) => { if (i % step === 0 || i === pts.length - 1) s += `<text x="${x(i)}" y="${H - 8}" fill="#a39e94" font-size="12" text-anchor="middle">${esc(fmtDate(p.d))}</text>`; });
  const lp = pts[pts.length - 1];
  s += `<text x="${Math.min(x(pts.length - 1), W - R - 4)}" y="${y(lp.v) - 12}" fill="#f2eee6" font-size="13" font-weight="600" text-anchor="end">${n1(lp.v)}</text></svg>`;
  box.innerHTML = s;
  return box;
}

