/* ---------- avatar ---------- */
const AV = {
  peau: ["#f7d9c4", "#ecbf9b", "#d9a47a", "#c08559", "#a06a42", "#7f502f", "#5e3820", "#3f2516"],
  cheveux: ["#141010", "#3b2416", "#6b4423", "#a8763a", "#dcb769", "#9a9a9a", "#2e4f9a", "#b3202f"],
  coupe: [["ras", "Rasé"], ["court", "Court"], ["degrade", "Dégradé"], ["flattop", "Flat-top"], ["boucle", "Bouclé"], ["afro", "Afro"], ["tresses", "Dreads"], ["nattes", "Tresses"], ["long", "Long bouclé"], ["crete", "Crête"], ["chauve", "Chauve"]],
  barbe: [["non", "Aucune"], ["legere", "Légère"], ["moustache", "Moustache"], ["bouc", "Bouc"], ["oui", "Barbe"]],
  expr: [["sourire", "Sourire"], ["dents", "Grand sourire"], ["serieux", "Sérieux"]],
  maillot: [["dom", "Domicile"], ["ext", "Extérieur"], ["third", "Third"], ["gb", "Gardien"]],
  acc: [["non", "Aucun"], ["bandeau", "Bandeau"], ["lunettes", "Lunettes"], ["boucles", "Boucles d'oreilles"]],
  visage: [["ovale"], ["rond"], ["fin"]], formeYeux: [["amande"], ["rond"]], sourcils: [["epais"], ["fins"]], nez: [["moyen"], ["fin"], ["large"]], corps: [["athletique"], ["fine"], ["puissante"]]
};
const AV_DEF = { peau: 3, cheveux: 0, coupe: "court", barbe: "non", expr: "sourire", maillot: "dom", num: "10", acc: "non", visage: "ovale", yeux: 0, formeYeux: "amande", sourcils: "epais", nez: "moyen", corps: "athletique", taille: 100, nomDos: "", short: 0, chaussettes: 0, chaussures: 0 };
const avClean = a => {
  const o = { ...AV_DEF, ...(a || {}) };
  const inList = (v, l) => l.some(x => x[0] === v);
  const int = (v, lo, hi, d) => Number.isInteger(v) && v >= lo && v <= hi ? v : d;
  const r = { peau: int(o.peau, 0, 7, 3), cheveux: int(o.cheveux, 0, 7, 0),
    coupe: inList(o.coupe, AV.coupe) ? o.coupe : "court", barbe: inList(o.barbe, AV.barbe) ? o.barbe : "non", expr: inList(o.expr, AV.expr) ? o.expr : "sourire",
    maillot: inList(o.maillot, AV.maillot) ? o.maillot : "dom", acc: inList(o.acc, AV.acc) ? o.acc : "non", num: String(o.num || "").replace(/\D/g, "").slice(0, 2),
    visage: inList(o.visage, AV.visage) ? o.visage : "ovale", yeux: int(o.yeux, 0, 4, 0), formeYeux: inList(o.formeYeux, AV.formeYeux) ? o.formeYeux : "amande",
    sourcils: inList(o.sourcils, AV.sourcils) ? o.sourcils : "epais", nez: inList(o.nez, AV.nez) ? o.nez : "moyen", corps: inList(o.corps, AV.corps) ? o.corps : "athletique",
    taille: int(o.taille, 94, 106, 100), nomDos: String(o.nomDos || "").toUpperCase().replace(/[^A-Z0-9 .-]/g, "").slice(0, 12),
    short: int(o.short, 0, 3, 0), chaussettes: int(o.chaussettes, 0, 3, 0), chaussures: int(o.chaussures, 0, 5, 0) };
  if (typeof o.img === "string" && /^data:image\/jpeg;base64,/.test(o.img) && o.img.length <= 60000) r.img = o.img;
  return r;
};
const hx = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const toHex = a => "#" + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const mixC = (a, b, t) => { const A = hx(a), B = hx(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const CREST_S = "data:image/png;base64,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";
let avSeq = 0;
function avatarSVG(a0) {
  const a = avClean(a0), k = "av" + (++avSeq);
  const skin = AV.peau[a.peau], light = mixC(skin, "#ffffff", .22), dark = mixC(skin, "#000000", .3), deep = mixC(skin, "#000000", .5);
  const hair = AV.cheveux[a.cheveux], hairL = mixC(hair, "#ffffff", .18), hairD = mixC(hair, "#000000", .45);
  const brow = a.cheveux >= 5 ? mixC(AV.cheveux[1], "#000000", .3) : mixC(hair, "#000000", .3);
  const lip = mixC(mixC(skin, "#000000", .35), "#8a3a3a", .3);
  const shirt = { dom: ["#e0182d", "#0b0a0a", "#ffffff"], ext: ["#f4f1ea", "#e0182d", "#0b0a0a"], third: ["#1a1718", "#b08c40", "#b08c40"], gb: ["#f2c230", "#0b0a0a", "#0b0a0a"] }[a.maillot] || ["#e0182d", "#0b0a0a", "#ffffff"];
  const HG = `url(#${k}h)`;
  const cap = `<path d="M27 47 C25 22 40 5 60 5 C80 5 95 22 93 47 C90 35 86 29 81 27 C72 23 48 23 39 27 C34 29 30 35 27 47Z" fill="${HG}"/>`;
  let back = "", top = "";
  switch (a.coupe) {
    case "ras": top = `<path d="M28 44 C27 22 41 7 60 7 C79 7 93 22 92 44 C88 33 83 28 78 27 C70 25 50 25 42 27 C37 28 32 33 28 44Z" fill="${hair}" opacity=".5"/>`; break;
    case "court": top = cap + `<path d="M40 27 Q46 21 52 25 Q57 20 63 24 Q69 20 74 25 Q78 23 81 27 C72 24 48 24 40 27Z" fill="${hairD}" opacity=".5"/>`; break;
    case "degrade": top = `<path d="M27 47 C25 22 40 6 60 6 C80 6 95 22 93 47 C90 36 86 30 81 28 C72 25 48 25 39 28 C34 30 30 36 27 47Z" fill="${hair}" opacity=".32"/><path d="M33 33 C32 11 46 3 60 3 C74 3 88 11 87 33 C80 26 40 26 33 33Z" fill="${HG}"/>`; break;
    case "flattop": top = `<path d="M28 44 C27 34 28 30 30 28 L32 1 Q60 -2 88 1 L90 28 C92 30 93 34 92 44 C88 34 84 29 80 27 C72 24 48 24 40 27 C36 29 32 34 28 44Z" fill="${HG}"/><path d="M32 1 Q60 -2 88 1 L88 5 Q60 2 32 5Z" fill="${hairL}" opacity=".5"/>`; break;
    case "boucle": top = cap + [[34, 26], [41, 17], [50, 11], [60, 9], [70, 11], [79, 17], [86, 26], [45, 22], [55, 18], [65, 18], [75, 22]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="${HG}" stroke="${hairD}" stroke-width=".8"/>`).join(""); break;
    case "afro": back = `<circle cx="60" cy="36" r="42" fill="${HG}"/><circle cx="60" cy="36" r="42" fill="none" stroke="${hairD}" stroke-width="1.2" opacity=".6"/>`; top = cap; break;
    case "tresses": {
      const st = [["M34 40 Q24 54 22 74"], ["M86 40 Q96 54 98 74"], ["M30 30 Q20 42 16 58"], ["M90 30 Q100 42 104 58"]];
      back = st.map(([d]) => `<path d="${d}" stroke="${hairD}" stroke-width="8" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${HG}" stroke-width="6" fill="none" stroke-linecap="round"/>`).join("");
      const fr = ["M52 9 Q34 12 26 30", "M58 6 Q44 8 34 24", "M68 9 Q86 12 94 30", "M62 6 Q76 8 86 24", "M57 8 Q52 18 44 26", "M63 8 Q70 18 78 25", "M60 6 Q60 16 58 24"];
      top = `<path d="M30 40 C30 20 42 8 60 8 C78 8 90 20 90 40 C84 30 76 27 60 27 C44 27 36 30 30 40Z" fill="${hairD}"/>` + fr.map(d => `<path d="${d}" stroke="${hairD}" stroke-width="7.5" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${HG}" stroke-width="5.5" fill="none" stroke-linecap="round"/>`).join("");
      break;
    }
    case "long": back = `<path d="M24 46 C18 18 38 1 60 1 C82 1 102 18 96 46 C101 68 99 90 92 102 L80 94 C85 78 85 62 82 50 L38 50 C35 62 35 78 40 94 L28 102 C21 90 19 68 24 46Z" fill="${HG}"/>` + [[24, 60], [22, 74], [26, 88], [96, 60], [98, 74], [94, 88], [30, 98], [90, 98]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="${hair}" stroke="${hairD}" stroke-width=".8"/>`).join(""); top = cap + [[38, 24], [48, 17], [60, 15], [72, 17], [82, 24]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="${HG}" stroke="${hairD}" stroke-width=".8"/>`).join(""); break;
    case "crete": top = `<path d="M28 44 C27 22 41 7 60 7 C79 7 93 22 92 44 C88 33 83 28 78 27 C70 25 50 25 42 27 C37 28 32 33 28 44Z" fill="${hair}" opacity=".3"/><path d="M51 27 Q49 4 60 -1 Q71 4 69 27 Q60 24 51 27Z" fill="${HG}"/>`; break;
    case "chauve": top = ""; break;
    case "nattes": top = `<path d="M28 44 C27 22 41 7 60 7 C79 7 93 22 92 44 C88 33 83 28 78 27 C70 25 50 25 42 27 C37 28 32 33 28 44Z" fill="${hair}" opacity=".45"/>` + [36, 44, 52, 60, 68, 76, 84].map(x => `<path d="M${x} 27 Q${60 + (x - 60) * .8} 12 ${60 + (x - 60) * .55} 6" stroke="${HG}" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-dasharray="3 1.2"/>`).join(""); break;
  }
  const shine = (a.coupe === "chauve" || a.coupe === "ras") ? `<ellipse cx="47" cy="17" rx="11" ry="5" fill="#fff" opacity=".22" transform="rotate(-18 47 17)"/>` : "";
  const beard = a.barbe === "legere" || a.barbe === "oui" ? `<path d="M29 56 C31 75 45 88 60 88 C75 88 89 75 91 56 C87 69 79 79 70 81 Q60 77 50 81 C41 79 33 69 29 56Z" fill="${hair}" opacity="${a.barbe === "oui" ? .92 : .35}"/>${a.barbe === "oui" ? `<path d="M50 69 Q60 65 70 69 Q60 70.5 50 69Z" fill="${hair}"/>` : ""}`
    : a.barbe === "moustache" ? `<path d="M50 69.5 Q60 65.5 70 69.5 Q66 70.5 60 69.5 Q54 70.5 50 69.5Z" fill="${hair}" opacity=".95"/>`
    : a.barbe === "bouc" ? `<path d="M50 69.5 Q60 65.5 70 69.5 Q66 70.5 60 69.5 Q54 70.5 50 69.5Z" fill="${hair}" opacity=".95"/><path d="M53 80 Q60 92 67 80 Q60 84 53 80Z" fill="${hair}" opacity=".95"/>` : "";
  const ser = a.expr === "serieux";
  const browL = ser ? "M38 41 Q46 39 54 43.5 L53.5 46 Q46 42.5 38.5 43.5Z" : "M38 42.5 Q46 37 54 40 L54 42.6 Q46 40.2 38.6 44.6Z";
  const browR = ser ? "M82 41 Q74 39 66 43.5 L66.5 46 Q74 42.5 81.5 43.5Z" : "M82 42.5 Q74 37 66 40 L66 42.6 Q74 40.2 81.4 44.6Z";
  const eye = (cx, dir) => `<ellipse cx="${cx}" cy="51" rx="6.6" ry="${ser ? 3.6 : 4.4}" fill="#f8f4ee"/><circle cx="${cx + dir * .4}" cy="51.2" r="3.4" fill="#3a2316"/><circle cx="${cx + dir * .4}" cy="51.2" r="1.6" fill="#0b0a0a"/><circle cx="${cx + dir * .4 + 1.2}" cy="50" r=".95" fill="#fff"/><path d="M${cx - 7} ${ser ? 49.6 : 50} Q${cx} ${ser ? 46.2 : 45.3} ${cx + 7} ${ser ? 49.6 : 50}" stroke="${deep}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
  const mouth = a.expr === "dents"
    ? `<path d="M48.5 71.5 Q60 86 71.5 71.5 Q60 75 48.5 71.5Z" fill="#fbf8f2" stroke="${lip}" stroke-width="1.8" stroke-linejoin="round"/><path d="M51 73.6 Q60 76 69 73.6" stroke="#d9d2c6" stroke-width=".7" fill="none"/><path d="M53 79.5 Q60 83.5 67 79.5" stroke="${lip}" stroke-width="1.2" fill="none" opacity=".6"/>`
    : ser ? `<path d="M52 74.5 Q60 73.4 68 74.5" stroke="${lip}" stroke-width="1.9" fill="none" stroke-linecap="round"/><path d="M53.5 76 Q60 79.6 66.5 76 Q60 77 53.5 76Z" fill="${lip}" opacity=".55"/>`
    : `<path d="M50 72.5 Q60 79.5 70 72.5" stroke="${lip}" stroke-width="1.9" fill="none" stroke-linecap="round"/><path d="M54.5 76.8 Q60 79.4 65.5 76.8" stroke="${light}" stroke-width="1.1" fill="none" opacity=".55" stroke-linecap="round"/>`;
  const acc = a.acc === "boucles" ? `<circle cx="26" cy="61" r="2.6" fill="none" stroke="#d8b55a" stroke-width="1.6"/><circle cx="94" cy="61" r="2.6" fill="none" stroke="#d8b55a" stroke-width="1.6"/>`
    : a.acc === "bandeau" ? `<path d="M27 35 C40 23 80 23 93 35 L93 42 C80 30 40 30 27 42Z" fill="#0b0a0a"/><path d="M28 36.5 C41 25 79 25 92 36.5" stroke="#e0182d" stroke-width="1.2" fill="none"/>`
    : a.acc === "lunettes" ? `<g fill="none" stroke="#0b0a0a" stroke-width="2.2"><rect x="38.5" y="44" width="17" height="13" rx="5"/><rect x="64.5" y="44" width="17" height="13" rx="5"/><path d="M55.5 49 Q60 47 64.5 49 M38.5 48 L28 46 M81.5 48 L92 46"/></g><rect x="40" y="45.5" width="5" height="3" rx="1.5" fill="#fff" opacity=".35"/>` : "";
  const num = a.num ? `<text x="49" y="116" text-anchor="middle" font-family="Oranienbaum, Georgia, serif" font-size="11" fill="${a.maillot === "ext" ? "#0b0a0a" : "#ffffff"}" stroke="${a.maillot === "ext" ? "none" : "#0b0a0a"}" stroke-width=".5" paint-order="stroke">${esc(a.num)}</text>` : "";
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<defs>
<radialGradient id="${k}f" cx="42%" cy="34%" r="72%"><stop offset="0" stop-color="${light}"/><stop offset=".55" stop-color="${skin}"/><stop offset="1" stop-color="${dark}"/></radialGradient>
<linearGradient id="${k}n" x1="0" x2="1"><stop offset="0" stop-color="${dark}"/><stop offset=".45" stop-color="${skin}"/><stop offset="1" stop-color="${dark}"/></linearGradient>
<linearGradient id="${k}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hairL}"/><stop offset="1" stop-color="${hairD}"/></linearGradient>
<linearGradient id="${k}t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient>
<clipPath id="${k}s"><path d="M20 120 C22 106 37 100 51 99 L69 99 C83 100 98 106 100 120Z"/></clipPath>
</defs>
${back}
<path d="M20 120 C22 106 37 100 51 99 L69 99 C83 100 98 106 100 120Z" fill="${shirt[0]}"/>
<g clip-path="url(#${k}s)">${a.maillot === "dom" ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => `<rect x="${15 + i * 9}" y="95" width="4.5" height="26" fill="#0b0a0a"/>`).join("") + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21].map(i => `<line x1="${17.2 + i * 4.5}" y1="95" x2="${17.2 + i * 4.5}" y2="121" stroke="#c9a85a" stroke-width=".25" opacity=".7"/>`).join("")
  : a.maillot === "ext" ? `<rect x="0" y="95" width="120" height="26" fill="#f4f1ea"/><rect x="40" y="95" width="5" height="26" fill="#e0182d"/><rect x="45" y="95" width="3" height="26" fill="#0b0a0a"/><rect x="72" y="95" width="3" height="26" fill="#0b0a0a"/><rect x="75" y="95" width="5" height="26" fill="#e0182d"/>`
  : `<path d="M26 120 L64 92 L82 92 L44 120Z" fill="${shirt[1]}" opacity=".85"/>`}<rect x="0" y="96" width="120" height="24" fill="url(#${k}t)"/></g>
<path d="M20 120 C22 106 37 100 51 99 L69 99 C83 100 98 106 100 120Z" fill="none" stroke="#000" stroke-opacity=".35" stroke-width=".6"/>
<image href="${CREST_S}" x="68.5" y="104" width="7.8" height="10"/>
<path d="M52.5 76 L52.5 101 Q60 105 67.5 101 L67.5 76Z" fill="url(#${k}n)"/>
<path d="M48 98 L53.5 97 L60 106 L66.5 97 L72 98 L69 103 L60 108.5 L51 103Z" fill="${a.maillot === "ext" ? "#0b0a0a" : "#0b0a0a"}"/><path d="M48 98 L51 103 L60 108.5 L69 103 L72 98" stroke="#c9a85a" stroke-width=".8" fill="none"/>
<g><ellipse cx="27.5" cy="51" rx="6.5" ry="9.5" fill="${dark}"/><path d="M27 45 Q24 51 27.5 57" stroke="${deep}" stroke-width="1.3" fill="none" opacity=".7"/>
<ellipse cx="92.5" cy="51" rx="6.5" ry="9.5" fill="${dark}"/><path d="M93 45 Q96 51 92.5 57" stroke="${deep}" stroke-width="1.3" fill="none" opacity=".7"/></g>
<path d="M60 8 C83 8 93 25 93 45 C93 63 84 79 70 85 Q60 89 50 85 C36 79 27 63 27 45 C27 25 37 8 60 8Z" fill="url(#${k}f)" stroke="${deep}" stroke-width=".7" stroke-opacity=".6"/>
<ellipse cx="35" cy="64" rx="5" ry="9" fill="${deep}" opacity=".12"/><ellipse cx="85" cy="64" rx="5" ry="9" fill="${deep}" opacity=".12"/>
${beard}
<path d="${browL}" fill="${brow}"/><path d="${browR}" fill="${brow}"/>
${eye(46.5, 1)}${eye(73.5, -1)}
<path d="M58 51 Q57.2 59 55 63.5 Q60 67.5 65 63.5 Q62.8 59 62 51" fill="${deep}" opacity=".16"/>
<ellipse cx="60" cy="62" rx="2.6" ry="1.7" fill="${light}" opacity=".5"/>
<path d="M54.8 64.2 Q57 62.6 58.6 65 M65.2 64.2 Q63 62.6 61.4 65" stroke="${deep}" stroke-width=".9" fill="none" stroke-linecap="round"/>
${mouth}
${top}${shine}${acc}${num}
</svg>`;
}
function avatarNode(fid, nom, cls) {
  const el = h("div", { class: cls });
  const a = fid && S.avatars[fid];
  if (a) el.innerHTML = avatarSVG(a); else el.textContent = initials(nom);
  return el;
}
function avatarEditor(start, onChange) {
  let a = avClean(start); delete a.img;
  const prev = h("div", { class: "av-prev", role: "img", "aria-label": "Aperçu de l'avatar" });
  const opts = h("div", { class: "av-opts" });
  const draw = () => { prev.innerHTML = avatarSVG(a); onChange && onChange(a); paint(); };
  const groups = [];
  const swatch = (key, label, colors) => {
    const row = h("div", { class: "row", style: "gap:6px;align-items:center" });
    colors.forEach((c, i) => row.append(h("button", { type: "button", class: "sw", style: `background:${c}`, "aria-label": `${label} ${i + 1}`, "data-k": key, "data-v": String(i), onclick: () => { a = { ...a, [key]: i }; draw(); } })));
    opts.append(h("div", {}, h("div", { class: "lab" }, label), row)); groups.push(row);
  };
  const choice = (key, label, list) => {
    const row = h("div", { class: "row", style: "gap:6px" });
    list.forEach(([v, t]) => row.append(h("button", { type: "button", class: "opt", "data-k": key, "data-v": v, onclick: () => { a = { ...a, [key]: v }; draw(); } }, t)));
    opts.append(h("div", {}, h("div", { class: "lab" }, label), row)); groups.push(row);
  };
  const paint = () => groups.forEach(r => r.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(String(a[b.dataset.k]) === b.dataset.v))));
  swatch("peau", "Peau", AV.peau);
  choice("coupe", "Coupe", AV.coupe);
  swatch("cheveux", "Cheveux", AV.cheveux);
  choice("barbe", "Barbe", AV.barbe);
  choice("expr", "Expression", AV.expr);
  choice("maillot", "Maillot", AV.maillot);
  choice("acc", "Accessoire", AV.acc);
  const num = h("input", { type: "text", inputmode: "numeric", maxlength: "2", value: a.num, style: "width:70px", "aria-label": "Numéro" });
  num.addEventListener("input", () => { a = { ...a, num: num.value.replace(/\D/g, "").slice(0, 2) }; prev.innerHTML = avatarSVG(a); onChange && onChange(a); });
  opts.append(h("label", { class: "field" }, h("span", { class: "lab", style: "margin:0" }, "Numéro"), num));
  draw();
  return h("div", { class: "av-ed" }, prev, opts);
}
