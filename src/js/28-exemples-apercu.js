/* ---------- exemples pour l'aperçu ---------- */
function demoData() {
  let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const mk = (nom, groupe, extra) => {
    const G = GROUPS[groupe], notes = [];
    const base = 2.4 + rnd() * 1.2;
    for (let i = 0; i < 9; i++) {
      const d = new Date(2026, 8, 8 + i * 7 + (i % 2 ? 3 : 0)).toISOString().slice(0, 10);
      const ty = i % 3 === 2 ? "Match" : "Entraînement", crit = {}; for (const [k] of critsOf(groupe, ty)) crit[k] = Math.max(1, Math.min(5, Math.round(base + i * 0.12 + (rnd() - 0.5) * 1.6)));
      notes.push({ id: "ex" + i + nom, date: d, type: ty, crit, ...(groupe === "U19" && ty === "Match" ? { stats: { min: 60 + i * 3, buts: i % 2, pd: (i + 1) % 2 } } : {}), com: i === 8 ? (groupe === "U10" ? "Très appliqué aujourd'hui, il a osé demander le ballon." : "Bonne séance, continue à parler avec tes partenaires.") : "" });
    }
    const presences = notes.filter(n => n.type === "Entraînement").map(n => ({ date: n.date, type: n.type, p: true }));
    for (let i = 0; i < 6; i++) presences.push({ date: new Date(2026, 9, 1 + i * 3).toISOString().slice(0, 10), type: "Entraînement", p: rnd() > 0.15 });
    return { nom, groupe, notes, presences, defis: groupe === "U19" ? [{ titre: "30 jongles pied faible", date: "2026-10-21" }] : [], mot: groupe === "U10" ? "Bravo pour ton courage cette semaine !" : "Continue à guider tes partenaires, ça se voit.", objectif: groupe === "U10" ? "Lever la tête avant de passer." : "Être disponible plus tôt pour le porteur.", exemple: true, ...extra };
  };
  return {
    ex1: mk("Joueur exemple A", "U19", { poste: "Milieu axial" }), ex2: mk("Joueur exemple B", "U19", { poste: "Défenseur central" }), ex3: mk("Joueur exemple C", "U19", { poste: "Ailier" }),
    ex4: mk("Enfant exemple A", "U10"), ex5: mk("Enfant exemple B", "U10"),
    ex6: mk("Gardien exemple A", "GB", { sousCat: "U16" }), ex7: mk("Gardien exemple B", "GB", { sousCat: "U14" })
  };
}

function demoEquipes() {
  return {
    U19: { objectif: "6 séquences de plus de 4 passes par match", defi: { titre: "30 jongles pied faible", detail: "Sans que le ballon touche le sol, devant le coach." },
      hommes: [{ date: "2026-10-18", fid: "ex2", nom: "Joueur exemple B" }, { date: "2026-11-01", fid: "ex1", nom: "Joueur exemple A" }], mois: { fid: "ex3", nom: "Joueur exemple C", label: "octobre 2026" },
      stats: [{ date: "2026-10-18", adv: "Exemple FC", passes: 4, recup: 31, bm: 2, be: 1 }, { date: "2026-11-01", adv: "Exemple AS", passes: 7, recup: 36, bm: 3, be: 0 }] },
    U10: { objectif: "Écarter le jeu pour créer des espaces", defi: { titre: "Conduite slalom", detail: "Passer les 6 plots sans en toucher un." }, hommes: [{ date: "2026-10-17", fid: "ex4", nom: "Enfant exemple A" }], stats: [] },
    GB: { objectif: "Relancer à la main vers un joueur libre", hommes: [], stats: [] }
  };
}

