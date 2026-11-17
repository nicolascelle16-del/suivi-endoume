/* Tests des règles de calcul : injectés dans le module du site (comme modes.js), lancés par tests/logique.py.
   Chaque test vérifie une règle qu'on ne doit jamais casser. Les dates sont relatives à aujourd'hui. */
window.__logique = () => {
  const R = { onSnapshot: () => () => {}, get: async () => ({ exists: false, docs: [] }), doc: () => R, set: async () => {}, update: async () => {} };
  S.db = { doc: () => R, collection: () => R }; S.toutesSaisons = true; S.demo = false; S.admin = false;
  const res = [], ok = (nom, cond, detail) => res.push({ nom, ok: !!cond, detail: cond ? "" : String(detail === undefined ? "" : detail) });
  const egal = (nom, a, b) => ok(nom, Math.abs(a - b) < 1e-9, `obtenu ${a}, attendu ${b}`);
  const J = n => plusJours(today(), n), E = (a, b, c, d, e) => ({ int: a, app: b, qtec: c, info: d, att: e });
  const M = v => ({ role: v, tac: v, imp: v, ment: v, vol: v });
  let seq = 0;
  const fiche = (groupe, notes, extra) => { const fid = "test" + (++seq); S.autos[fid] = []; S.prive[fid] = {}; S.subs["a-" + fid] = () => {}; return [fid, { nom: "Test " + seq, groupe, notes, notesAdj: [], presences: [], ...(extra || {}) }]; };
  const note = (date, type, crit) => ({ id: "n" + date + type, date, type, crit, com: "" });

  // 1. pondération : Nico compte double, Seb simple (2/3 – 1/3)
  egal("Pondération 2/3 – 1/3", combineNotes({ crit: { int: 4 } }, [{ crit: { int: 1 } }]).crit.int, 3);
  egal("Note de Nico seule", combineNotes({ crit: { int: 4 } }, []).crit.int, 4);
  egal("Note de Seb seule", combineNotes(null, [{ crit: { int: 2 } }]).crit.int, 2);
  {
    const d = J(-30), f = { groupe: "U19", notes: [note(d, "Entraînement", E(5, 5, 5, 5, 5))], notesAdj: [{ date: d, type: "Entraînement", crit: E(2, 2, 2, 2, 2) }] };
    const ns = sortedNotesTout(f);
    ok("Les notes de Nico et Seb du même jour fusionnent", ns.length === 1, `${ns.length} notes au lieu d'une`);
    egal("Fusion 2/3 – 1/3 sur une séance", ns[0].crit.int, 4);
  }
  // 2. moyenne d'une note : seules les valeurs de 1 à 5 comptent
  egal("Moyenne d'une note", noteAvg(note(J(-3), "Entraînement", E(4, 4, 4, 4, 4)), "U19"), 4);
  egal("Valeur hors 1–5 ignorée", noteAvg(note(J(-3), "Entraînement", E(4, 4, 4, 4, 9)), "U19"), 4);

  // 3. notes protégées : pas d'auto-évaluation, pas de note (U19)
  {
    const dm = J(-5), de = plusJours(lundiDe(J(-14)), 1);
    const [fid, f] = fiche("U19", [note(dm, "Match", M(4)), note(de, "Entraînement", E(4, 4, 4, 4, 4)), note("2026-10-01", "Entraînement", E(3, 3, 3, 3, 3))]);
    const vis = masquerNotes(fid, f), dates = vis.notes.map(n => n.date);
    if (dm >= MASQUE_DEBUT) ok("Match caché sans auto-évaluation", !dates.includes(dm), "le match est visible");
    if (de >= MASQUE_DEBUT) ok("Entraînement caché sans auto-évaluation de la semaine", !dates.includes(de), "l'entraînement est visible");
    ok("Les notes d'avant la règle restent visibles", dates.includes("2026-10-01"), "note d'octobre cachée");
    ok("La fiche complète reste disponible pour le coach", vis === f || vis._plein === f, "pas de _plein");
    S.autos[fid] = [{ id: "M" + dm, type: "Match", date: dm, crit: {} }, { id: "S" + plusJours(lundiDe(de), 4), type: "Semaine", date: plusJours(lundiDe(de), 4), crit: {} }];
    const vis2 = masquerNotes(fid, f).notes.map(n => n.date);
    ok("Match visible après l'auto-évaluation", vis2.includes(dm), "toujours caché");
    ok("Entraînement visible après l'auto-évaluation de la semaine", vis2.includes(de), "toujours caché");
    const [fid2, f2] = fiche("U19", [], { prives: ["M" + J(-2)] });
    ok("Période protégée pas encore lisible : comptée comme cachée", (masquerNotes(fid2, f2)._masque || 0) >= 1, "aucune note signalée cachée");
    const [fid3, f3] = fiche("U10", [note(J(-5), "Match", { ose: 4 })]);
    ok("U10 (parents) : jamais de masquage", masquerNotes(fid3, f3) === f3, "la fiche U10 a été modifiée");
    ok("Le joueur doit faire l'auto-évaluation du match", autoAFaire(f, []).todo.some(t => t.key === "M" + dm) || dm < ilYa(21), "pas dans la liste à faire");
  }

  // 4. Indice Endoume = note de la carte (moyenne des 5 dernières évaluations, sur 100)
  {
    const vals = [2, 3, 3, 4, 4, 5];
    const [, f] = fiche("U19", vals.map((v, i) => note(J(-60 + i * 7), "Entraînement", E(v, v, v, v, v))));
    egal("Indice = moyenne des 5 dernières × 20", indiceA(f, today()), Math.round((3 + 3 + 4 + 4 + 5) / 5 * 20));
    ok("L'indice est le chiffre de la carte", String(indiceA(f, today())) === fcardData(f).note, `indice ${indiceA(f, today())}, carte ${fcardData(f).note}`);
    egal("Indice à une date passée : notes suivantes ignorées", indiceA(f, J(-60 + 2 * 7)), Math.round((2 + 3 + 3) / 3 * 20));
  }

  // 5. objectif de la semaine (automatique)
  {
    const l = lundiDe(today()), avant = k => plusJours(l, -k);
    const [fid, f] = fiche("U19", [note(avant(13), "Entraînement", E(4, 4, 4, 3, 4)), note(avant(6), "Entraînement", E(4, 4, 4, 4, 4))]);
    const o = objectifSemaine(fid, f);
    ok("Critère choisi = le plus faible des 2 dernières semaines", o.k === "info", `critère ${o.k}`);
    egal("Moyenne du critère", o.v, 3.5);
    egal("Cible : un cran au-dessus", o.cible, 4);
    ok("Titre « Monte d'un cran »", o.mode === "monte" || o.mode === "confirme", `mode ${o.mode}`);
    const [fid2, f2] = fiche("U19", [note(avant(13), "Entraînement", E(4, 4, 4, 4, 5)), note(avant(6), "Entraînement", E(5, 4, 4, 4, 4))]);
    ok("Déjà à 4 partout : « Garde ce niveau »", objectifSemaine(fid2, f2).mode === "garde", objectifSemaine(fid2, f2).mode);
    const [fid3, f3] = fiche("U19", [note(avant(20), "Entraînement", E(4, 4, 4, 4, 3)), note(avant(13), "Entraînement", E(3, 4, 3, 3, 3)), note(avant(6), "Entraînement", E(3, 3, 2, 3, 3))]);
    ok("En baisse 2 semaines de suite : « Retrouve ton niveau »", objectifSemaine(fid3, f3).mode === "baisse", objectifSemaine(fid3, f3).mode);
    const [fid4, f4] = fiche("U19", [note(avant(13), "Entraînement", E(4, 4, 4, 3, 4))], { objSem: { txt: "Ma phrase", sem: l } });
    ok("La phrase du coach remplace la phrase automatique", objectifSemaine(fid4, f4).perso === "Ma phrase", "phrase non reprise");
    const [fid5, f5] = fiche("U19", [note(avant(13), "Entraînement", E(4, 4, 4, 3, 4))], { objSem: { txt: "Vieille phrase", sem: plusJours(l, -7) } });
    ok("La phrase du coach expire à la fin de la semaine", !objectifSemaine(fid5, f5).perso, "phrase de la semaine dernière encore affichée");
    const [fid6, f6] = fiche("U19", [note(avant(13), "Entraînement", E(4, 4, 4, 3, 4))], { presences: [{ date: l, type: "Entraînement", p: true }] });
    S.autos[fid6] = [{ id: "S" + plusJours(l, 4), type: "Semaine", date: plusJours(l, 4), crit: {} }];
    const c = objectifSemaine(fid6, f6).conds;
    ok("Condition cochée : présent à toutes les séances", c[0][0], "non cochée");
    ok("Condition cochée : auto-évaluation faite", c[1][0], "non cochée");
    ok("Condition non cochée tant que le critère n'est pas atteint", !c[2][0], "cochée à tort");
    const [fid7, f7] = fiche("U19", []);
    ok("Pas de notes : pas d'objectif inventé", objectifSemaine(fid7, f7).vide, "objectif créé sans notes");
  }
  return res;
};
