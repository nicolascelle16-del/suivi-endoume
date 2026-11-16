/* ---------- graphique d'évolution ---------- */
/* ---------- objectifs individuels U19 (choisis par le joueur) ---------- */
const OBJ_POSTES = [
  ["dc", "Défenseur central", ["Gagner au moins 70 % de mes duels aériens", "Relancer proprement au sol vers un milieu dès que c'est possible", "Parler et organiser la ligne défensive pendant tout le match", "Bien orienter mon corps pour pousser l'attaquant vers l'extérieur", "Couvrir mon partenaire chaque fois qu'il sort au duel", "Zéro faute évitable aux abords de la surface", "Casser des lignes avec au moins 3 passes vers l'avant par match", "Anticiper les ballons dans la profondeur avant l'attaquant", "Rester concentré jusqu'à la dernière minute", "Être dangereux sur chaque coup de pied arrêté offensif"]],
  ["lat", "Latéral", ["Faire au moins 3 débordements ou centres par match", "Revenir à mon poste après chaque montée", "Ne pas me faire éliminer en un contre un dans mon couloir", "Fermer l'axe quand le ballon est de l'autre côté", "Proposer une solution à mon ailier sur chaque relance", "Lever la tête avant de centrer, plus de centre au hasard", "Jouer vers l'avant plutôt que de redonner en retrait", "Communiquer avec mon central et mon ailier sur les marquages", "Gagner mes duels à la retombée dans mon couloir", "Tenir le rythme des allers-retours pendant tout le match"]],
  ["md", "Milieu défensif", ["Récupérer au moins 6 ballons par match", "Me rendre disponible à chaque relance des défenseurs", "Jouer en 2 touches maximum dans ma zone", "Rester devant ma défense et protéger l'axe", "Renverser le jeu quand un côté est bouché", "Regarder autour de moi avant chaque réception", "Faire la faute intelligente plutôt que laisser partir un contre", "Réussir au moins 85 % de mes passes", "Couvrir les montées de mes latéraux", "Guider et replacer mes partenaires à la voix"]],
  ["mc", "Milieu central", ["Regarder autour de moi avant chaque réception", "Faire au moins 3 passes qui cassent une ligne par match", "Me projeter dans la surface sur nos attaques", "Être décisif : un but ou une passe décisive tous les 3 matchs", "Jouer vers l'avant dès que c'est possible", "Faire l'effort de repli à chaque perte de balle", "Utiliser mon pied faible au moins 5 fois par match", "Tenter la frappe de loin quand l'espace est là", "Gagner mes duels au milieu de terrain", "Être le joueur qui touche le plus de ballons"]],
  ["ail", "Ailier", ["Provoquer en un contre un au moins 5 fois par match", "Prendre la profondeur dans le dos du latéral adverse", "Attaquer la surface sur chaque centre du côté opposé", "Être décisif : un but ou une passe décisive par match", "Faire le repli sur le latéral adverse", "Frapper au but au moins 2 fois par match", "Varier : centrer, repiquer ou combiner selon la situation", "Ne pas perdre le ballon bêtement dans notre moitié", "Fixer avant de donner pour libérer un partenaire", "Garder la largeur pour étirer le bloc adverse"]],
  ["att", "Attaquant", ["Marquer un but tous les 2 matchs", "Cadrer au moins 60 % de mes frappes", "Faire au moins 5 appels en profondeur par match", "Être le premier défenseur : presser la relance adverse", "Garder le ballon dos au but pour faire remonter l'équipe", "Attaquer le premier poteau sur les centres", "Suivre chaque frappe pour être là sur les ballons repoussés", "Combiner en une ou deux touches avec les milieux", "Rester lucide et calme devant le but", "Décrocher pour aider l'équipe quand on est en difficulté"]],
  ["gb", "Gardien", ["Diriger ma défense à la voix pendant tout le match", "Sortir sur tous les centres que je peux capter", "Relancer vers un joueur libre plutôt que dégager au hasard", "Être bien placé sur chaque frappe en fermant l'angle", "Rester concentré même quand je n'ai rien à faire", "Bloquer le ballon au lieu de le repousser quand c'est possible", "Jouer au pied sous pression sans paniquer", "Me remobiliser tout de suite après une erreur", "Rester debout le plus longtemps possible en un contre un", "Organiser le mur et les placements sur coups de pied arrêtés"]]
];
const OBJ_ALL = new Set(OBJ_POSTES.flatMap(p => p[2]));
function posteKey(p) {
  const s = (p || "").toLowerCase();
  if (s.includes("gardien")) return "gb"; if (s.includes("latéral") || s.includes("lateral") || s.includes("piston")) return "lat";
  if (s.includes("ailier")) return "ail"; if (s.includes("attaqu") || s.includes("avant-centre") || s.includes("buteur")) return "att";
  if (s.includes("défensif") || s.includes("defensif") || s.includes("sentinelle")) return "md"; if (s.includes("milieu")) return "mc";
  if (s.includes("défenseur") || s.includes("defenseur") || s.includes("central")) return "dc"; return "";
}
function objectifCard(fid, f, asCoach) {
  const cur = S.objectifs[fid];
  const card = h("div", { class: "card" }, h("h3", {}, asCoach ? "Son objectif" : "Mon objectif"));
  if (cur && cur.obj) card.append(h("div", { class: "obj" }, cur.obj), h("p", { class: "note", style: "margin:6px 0 0" }, `Choisi${asCoach ? " par le joueur" : ""} le ${fmtLong((cur.at || "").slice(0, 10))}`));
  if (asCoach) { if (!cur || !cur.obj) card.append(h("p", { class: "note", style: "margin:0" }, isTemp(fid) ? "Le joueur pourra choisir son objectif une fois son compte relié." : "Le joueur n'a pas encore choisi son objectif.")); return card; }
  if (fid !== S.me) return card;
  const k = posteKey(f.poste), groups = [...OBJ_POSTES].sort((a, b) => (a[0] === k ? -1 : b[0] === k ? 1 : 0));
  const sel = h("select", { id: "obj-sel", "aria-label": "Choisir mon objectif" }, h("option", { value: "" }, cur && cur.obj ? "Changer d'objectif…" : "Choisis ton objectif…"),
    groups.map(([gk, lab, list]) => h("optgroup", { label: gk === k ? `Pour ton poste : ${lab}` : lab }, list.map(o => h("option", { value: o }, o)))));
  const m = h("span", { class: "note" });
  card.append(h("div", { class: "stack", style: "gap:8px;margin-top:10px" }, h("label", { class: "field" }, sel),
    h("div", { class: "row", style: "align-items:center" }, h("button", { class: "btn small", onclick: async () => {
      const v = sel.value; if (!OBJ_ALL.has(v)) { m.className = "err"; m.textContent = "Choisis un objectif dans la liste."; return; }
      try { const d = { obj: v, at: new Date().toISOString() }; await setDoc(fsDoc(fs, "objectifs/" + S.me), d); S.objectifs[S.me] = d; render(); } catch (e) { m.className = "err"; m.textContent = "Échec : réessaie."; }
    } }, "Enregistrer mon objectif"), m)));
  return card;
}

