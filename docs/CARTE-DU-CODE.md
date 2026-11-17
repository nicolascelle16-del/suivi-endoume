# Carte du code : suivi-endoume

Générée par `outils/carte.py` à chaque build : ne pas modifier à la main.
Le site est un seul fichier `index.html`, assemblé depuis `src/` (squelette `src/page.html`, style `src/style.css`, code `src/js/` dans l'ordre de `ORDRE.txt`).

Pour trouver une fonction : cherche son nom dans l'index en bas, puis ouvre seulement ce fichier.

## Règles à ne jamais casser

- La carte joueur (`fcard`, `.fcard`) ne change pas : son style est figé dans `src/style.css` (bloc « CARTE JOUEUR »).
- Notes protégées : tout ce que voit un joueur passe par `masquerNotes(fid, f)`. Pas d'auto-évaluation, pas de note.
- Note du staff : 2/3 Nico, 1/3 Seb (`noteAvg`, `notesAdj`).
- Version parents U10 : pas d'auto-évaluation sur la fiche, pas d'accueil premium.
- Tout le texte du site est en français ; on dit « match », jamais « plateau ».
- On ne publie rien sans aperçu validé par Nico ; `python3 outils/build.py --tests` doit passer.

## Données (Firestore)

| Chemin | Contenu | Qui lit / écrit |
|---|---|---|
| `fiches/{fid}` | joueur : nom, groupe (U19, U10, GB), poste, notes[] (sans les notes protégées), notesAdj[] (Seb), presences[], prives[] (clés des notes protégées), mailsNon, objSem, consigne | coach tout ; adjoint U19 : notesAdj, presences, prives ; le joueur lit sa fiche et n'écrit que mailsNon |
| `fiches/{fid}/prive/{cle}` | notes protégées d'une période (cle = "S" + vendredi ou "M" + date du match) : notes, notesAdj, libre | lisible par le joueur seulement après son auto-évaluation de la période (ou après la date libre) |
| `fiches/{fid}/auto/{cle}` | auto-évaluations du joueur (même clé que la période) | le joueur écrit, le staff lit |
| `avatars/{uid}` | avatar dessiné par le joueur (valeurs en liste fermée, nettoyées par avClean) | le joueur et le coach |
| `equipe/{groupe}` | compos, objectif du match, indices (moyennes anonymes du groupe, publiées par le coach) | staff écrit, joueurs du groupe lisent |
| `seances/{id}` | séances : groupe, date, type, heure, dit (réponses au sondage WhatsApp) | staff seulement |
| `votes/{id}` + `urne`, `votants` | homme du match, vote anonyme | |
| `championnat/u19` | calendrier et classement U19 D2 | coach écrit |
| `coachs/{uid}` | rôle : coach (tous les groupes) ou adjoint (groupes listés) | coach |
| `carnet/{id}` | carnet BMF : fiches de séance et de match | coach |
| `inscriptions`, `objectifs`, `bloques` | comptes en attente, objectifs individuels, adresses bloquées | |

Règles du serveur : `serveur/firestore.rules`. Mails : `serveur/mails-apps-script.gs` (Apps Script, déployé à part).

## Fichiers

### `00-debut.js` —  (78 lignes)
Définit : `FIREBASE_CONFIG`, `fbApp`, `wrapDoc`, `docRef`, `colRef`, `whereRef`, `DB`, `GROUPS`, `GRILLES`, `GK_M`, `GKK`, `isGK`, `mGrid`, `critsJ`, `DESC`, `critsOf`, `isOldNote`, `critsForNote`, `critLabel`, `LEVELS`, `SEG`, `isTemp`, `S`
Utilise : 01 (groupOf, h) ; 20 (sel)
Utilisé par : 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 23b, 24, 25, 26, 27, 28, 29

### `01-petits-outils.js` — petits outils (72 lignes)
Définit : `h`, `esc`, `today`, `fmtDate`, `fmtLong`, `nid`, `groupOf`, `byDate`, `rawNotes`, `adjNotes`, `POIDS`, `combineNotes`, `debutSaison`, `libSaison`, `dansSaison`, `sortedNotes`, `sortedNotesTout`, `noteAvg`, `critAvg`, `overall`, `n1`, `initials`, `ABBR`, `stars`
Utilisé par : 00, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 23b, 24, 25, 26, 29

### `02-avatar.js` — avatar (143 lignes)
Définit : `AV`, `AV_DEF`, `avClean`, `hx`, `toHex`, `mixC`, `CREST_S`, `avSeq`, `avatarSVG`, `avatarNode`, `avatarEditor`
Utilise : 00 (S) ; 01 (h, initials)
Utilisé par : 03, 04, 10, 11, 12, 15, 18, 19, 22, 23

### `03-avatar-studio-3d.js` — Endoume Avatar Studio (3D, chargé à la demande) (89 lignes)
Définit : `STUDIO_OPTS`, `ST_COLORS`, `studioMod`, `loadStudio`, `closeStudio`, `openStudio`, `saveAvatar`
Utilise : 00 (S) ; 01 (h) ; 02 (AV, AV_DEF, avClean, avatarEditor) ; 15 (shortNom) ; 27 (render)
Utilisé par : 19, 23, 29

### `04-carte-joueur.js` — carte joueur (88 lignes)
Définit : `FC_BG`, `posteAbr`, `fcardData`, `fcardDraw`, `fcard`, `stable`, `avVus`, `watchAvatar`
Utilise : 00 (GRILLES, GROUPS, LEVELS, S, isOldNote) ; 01 (ABBR, critAvg, groupOf, h, noteAvg, overall, sortedNotes, stars) ; 02 (avatarNode) ; 10 (ABR_P) ; 12 (softRender) ; 16 (mean)
Utilisé par : 13, 19, 23b

### `05-badges-et-records.js` — badges et records (128 lignes)
Définit : `badges`, `records`, `badgesBox`, `LOGOS`
Utilise : 00 (S, critsForNote, isGK) ; 01 (esc, groupOf, h, noteAvg, sortedNotes, today) ; 09 (coachRef) ; 16 (compteAssid, mean, monthKey)
Utilisé par : 06, 19, 23

### `06-championnat-u19.js` — championnat U19 (35 lignes)
Définit : `champView`
Utilise : 00 (S) ; 01 (fmtDate, h) ; 05 (LOGOS)
Utilisé par : 13

### `07-analyses-de-match.js` — analyses de match (50 lignes)
Définit : `analysesCard`
Utilise : 00 (S) ; 01 (fmtLong, h, nid, today) ; 13 (writeEquipe) ; 20 (sel) ; 27 (render)
Utilisé par : 13

### `08-votes.js` — votes (108 lignes)
Définit : `voteLabel`, `watchBulletins`, `votesCard`
Utilise : 00 (S, isTemp) ; 01 (groupOf, h, nid, today) ; 12 (softRender) ; 13 (writeEquipe) ; 20 (sel) ; 27 (render)
Utilisé par : 13, 23

### `09-auto-evaluations.js` — auto (216 lignes)
Définit : `watchAutos`, `autoMissing`, `lundiDe`, `plusJours`, `autoAFaire`, `clePeriode`, `estPrive`, `avecPrive`, `watchPrive`, `poserFiches`, `migrerPrive`, `chargerPrive`, `ecrireFiche`, `MASQUE_DEBUT`, `masquerNotes`, `coachRef`, `autoCard`, `autoCompare`
Utilise : 00 (GROUPS, LEVELS, S, critLabel, critsJ, isTemp) ; 01 (adjNotes, groupOf, h, nid, rawNotes, sortedNotes) ; 12 (softRender) ; 16 (mean) ; 17 (ilYa) ; 27 (render)
Utilisé par : 05, 19, 21, 22, 23, 23b, 25, 29

### `10-acces-coachs.js` — accès (coachs et comptes en attente) (131 lignes)
Définit : `normName`, `guessFiche`, `linkAccount`, `exporterTout`, `derniereSauvegarde`, `accesView`, `POSTES_433`, `ABR_P`, `postePicker`
Utilise : 00 (GROUPS, S, isTemp) ; 01 (groupOf, h, today) ; 02 (avatarNode) ; 17 (ditOf) ; 20 (sel) ; 27 (render)
Utilisé par : 04, 12, 19, 21, 22

### `11-compte-relie.js` — compte relié : gestion coach (58 lignes)
Définit : `slugify`, `unlinkAccount`, `compteCard`, `monCompteCard`
Utilise : 00 (S) ; 01 (h) ; 02 (avClean) ; 12 (AUTH_ERR) ; 19 (writeFiche) ; 20 (sel) ; 27 (render)
Utilisé par : 19, 23

### `12-connexion.js` — connexion (63 lignes)
Définit : `AUTH_ERR`, `loginView`, `renderTimer`, `softRender`
Utilise : 00 (S) ; 01 (h) ; 02 (AV_DEF, avatarEditor) ; 10 (postePicker) ; 26 (showConf) ; 27 (render)
Utilisé par : 04, 08, 09, 11, 19, 23, 26, 29

### `13-page-equipe.js` — page équipe (113 lignes)
Définit : `writeEquipe`, `equipeView`
Utilise : 00 (GROUPS, S) ; 01 (fmtDate, groupOf, h, today) ; 04 (fcardData, fcardDraw, stable, watchAvatar) ; 06 (champView) ; 07 (analysesCard) ; 08 (voteLabel, votesCard) ; 15 (composCard) ; 20 (sel) ; 23 (votesOuverts) ; 27 (render)
Utilisé par : 07, 08, 15, 22, 23, 23b

### `14-objectifs-individuels.js` — graphique d'évolution (37 lignes)
Définit : `OBJ_POSTES`, `OBJ_ALL`, `posteKey`, `objectifCard`
Utilise : 00 (S, isTemp) ; 01 (h) ; 20 (sel) ; 27 (render)
Utilisé par : 19

### `15-compositions-de-match.js` — compositions de match (93 lignes)
Définit : `DEF4`, `SYSTEMES`, `shortNom`, `pitchView`, `composCard`
Utilise : 00 (S) ; 01 (groupOf, h, nid, today) ; 02 (avatarNode) ; 13 (writeEquipe) ; 20 (sel) ; 27 (render)
Utilisé par : 03, 13

### `16-ma-saison.js` — ma saison : courbe par mois + données (122 lignes)
Définit : `SER`, `MOIS`, `monthKey`, `monthLab`, `mean`, `compteAssid`, `matchStats`, `presStats`, `tipBox`, `showTip`, `saisonCard`
Utilise : 00 (DESC, GRILLES, GROUPS, S, isGK, mGrid) ; 01 (ABBR, dansSaison, fmtDate, groupOf, h, n1, noteAvg, sortedNotes) ; 27 (render)
Utilisé par : 04, 05, 09, 18, 19, 21, 22, 23b, 24, 25

### `17-sondage-whatsapp.js` — réponses au sondage WhatsApp (saisies par le coach) (51 lignes)
Définit : `jourLong`, `seanceTitre`, `ilYa`, `seancesOf`, `ditOf`, `seancesCoachCard`
Utilise : 00 (S) ; 01 (groupOf, h, nid, today) ; 27 (render)
Utilisé par : 09, 10, 18, 21, 22, 23, 23b

### `18-presences-coach.js` — présences (coach) (94 lignes)
Définit : `presencesView`, `chart`
Utilise : 00 (S) ; 01 (fmtDate, groupOf, h, n1, noteAvg, sortedNotes, today) ; 02 (avatarNode) ; 16 (compteAssid, showTip, tipBox) ; 17 (seancesCoachCard) ; 20 (sel) ; 27 (render)
Utilisé par : 19, 22

### `19-fiche-detaillee.js` — fiche détaillée (joueur, parent ou coach) (171 lignes)
Définit : `ficheView`, `MAIL_URL`, `envoyerMails`, `lireQuota`, `writeFiche`
Utilise : 00 (GRILLES, GROUPS, LEVELS, S, critLabel, critsForNote, isOldNote, isTemp…) ; 01 (adjNotes, critAvg, fmtDate, fmtLong, groupOf, h, n1, noteAvg…) ; 02 (avatarEditor) ; 03 (saveAvatar) ; 04 (fcard) ; 05 (badgesBox, records) ; 09 (autoCard, ecrireFiche, watchAutos) ; 10 (linkAccount) ; 11 (compteCard) ; 12 (softRender) ; 14 (objectifCard) ; 16 (mean, saisonCard) ; 18 (chart) ; 20 (sel) ; 23 (objectifCoachCard) ; 24 (profilCard) ; 27 (render)
Utilisé par : 11, 21, 22, 23, 23b, 25

### `20-carnet-bmf.js` — vue coach (268 lignes)
Définit : `PHASES`, `PROC_TYPES`, `PROC_CHAMPS`, `REFLEX`, `BMF_OBJ`, `phaseOf`, `principeLab`, `reflexFaite`, `carnetList`, `bmfStatut`, `bmfCompteur`, `nextNum`, `newSeance`, `newMatch`, `saveCarnet`, `openCarnet`, `fld`, `sel`, `reflexBlock`, `presentsLe`, `resumeSeance`, `resumeMatch`, `seanceForm`, `matchForm`, `carnetEdit`, `carnetView`, `printCarnet`
Utilise : 00 (GROUPS, S) ; 01 (esc, fmtDate, h, n1, nid, noteAvg, sortedNotes, today) ; 21 (dFiches) ; 27 (render)
Utilisé par : 00, 07, 08, 10, 11, 13, 14, 15, 18, 19, 21, 22, 23b, 29

### `21-tableau-de-bord-coach.js` — tableau de bord coach (93 lignes)
Définit : `GCOL`, `visG`, `dFiches`, `moisDe`, `avgNotes`, `groupMonth`, `presRange`, `fiabilite`, `ouiAbsents`, `dashAlertes`, `dashLineChart`
Utilise : 00 (GROUPS, S, isTemp) ; 01 (groupOf, h, noteAvg, sortedNotes, today) ; 09 (autoMissing, watchAutos) ; 10 (derniereSauvegarde, exporterTout) ; 16 (compteAssid, mean, monthKey) ; 17 (ditOf, ilYa) ; 19 (MAIL_URL, envoyerMails) ; 20 (carnetList, openCarnet, reflexFaite, sel) ; 22 (invitationTexte, joursDepuisNote) ; 27 (render)
Utilisé par : 20, 22, 23b, 25

### `22-tableau-de-bord-visuel.js` — tableau de bord visuel (478 lignes)
Définit : `quotaCard`, `accordStaff`, `accordCard`, `ringSVG`, `sparkSVG`, `donutSondage`, `CAT_AL`, `catOf`, `dashView`, `dashZoom`, `coachView`, `carnetDu`, `joursDepuisNote`, `invitationTexte`, `startSaisie`, `saisieView`, `writeFicheQuiet`, `ajoutView`
Utilise : 00 (GRILLES, GROUPS, LEVELS, S, SEG, critLabel, critsForNote, critsJ…) ; 01 (adjNotes, critAvg, fmtDate, groupOf, h, n1, nid, overall…) ; 02 (avatarNode) ; 09 (autoMissing, ecrireFiche, watchAutos) ; 10 (accesView) ; 13 (equipeView) ; 16 (mean, monthKey) ; 17 (ditOf, ilYa, jourLong, seanceTitre, seancesOf) ; 18 (presencesView) ; 19 (envoyerMails, ficheView, lireQuota) ; 20 (PHASES, bmfCompteur, carnetList, carnetView, newMatch, newSeance, openCarnet, reflexFaite…) ; 21 (GCOL, avgNotes, dFiches, dashAlertes, dashLineChart, fiabilite, groupMonth, moisDe…) ; 23 (accueilCoach) ; 25 (recapCard) ; 27 (render)
Utilisé par : 21, 23b, 27

### `23-vue-joueur-parent.js` — vue joueur / parent (109 lignes)
Définit : `joueurView`, `vuLe`, `installEvt`, `enAppli`, `badgesVus`, `semaineCard`, `marquerVu`, `votesOuverts`, `nouveautes`, `notifier`, `psubtabs`
Utilise : 00 (GROUPS, S) ; 01 (groupOf, h, sortedNotes, today) ; 02 (avatarEditor) ; 03 (saveAvatar) ; 05 (badges) ; 08 (watchBulletins) ; 09 (MASQUE_DEBUT, autoAFaire, masquerNotes, watchAutos) ; 11 (monCompteCard) ; 12 (softRender) ; 13 (equipeView) ; 17 (seancesOf) ; 19 (ficheView) ; 23 (accueilJoueur) ; 27 (render)
Utilisé par : 13, 23b, 27, 29

### `23b-accueil-premium.js` — accueil premium : joueur (U19, gardiens) et coach (270 lignes)
Définit : `finSem`, `numSemaine`, `libSemaine`, `nomCourt`, `critsEnt`, `notesEnt`, `indiceA`, `serieIndice`, `calculStatsGroupe`, `statsGroupe`, `publierStatsGroupes`, `objectifSemaine`, `secT`, `coche`, `courbeIndice`, `radarAcc`, `prochainMatch`, `signature`, `accueilJoueur`, `objectifCoachCard`, `accueilCoach`
Utilise : 00 (DESC, GRILLES, GROUPS, S, isOldNote, isTemp, mGrid) ; 01 (critAvg, groupOf, h, n1, noteAvg, sortedNotes, today) ; 04 (fcard, stable) ; 09 (autoAFaire, lundiDe, masquerNotes, plusJours, watchAutos) ; 13 (writeEquipe) ; 16 (compteAssid, mean) ; 17 (ditOf, jourLong) ; 19 (MAIL_URL, envoyerMails, writeFiche) ; 20 (sel) ; 21 (dFiches, presRange, visG) ; 22 (startSaisie) ; 23 (semaineCard) ; 24 (RLAB, moyCrit) ; 27 (render)
Utilisé par : 19, 22, 23

### `24-profil-araignee.js` — profil en araignée : coach et auto (50 lignes)
Définit : `RLAB`, `radarSVG`, `moyCrit`, `profilCard`
Utilise : 00 (GRILLES, GROUPS, S, isOldNote, mGrid) ; 01 (esc, groupOf, h, sortedNotes) ; 16 (mean) ; 27 (render)
Utilisé par : 19, 23b

### `25-recap-mensuel-par-mail.js` — récap mensuel par mail (65 lignes)
Définit : `recapJoueur`, `recapCard`
Utilise : 00 (GRILLES, GROUPS, LEVELS, S, isOldNote, isTemp, mGrid) ; 01 (critAvg, groupOf, h, n1, sortedNotes, today) ; 09 (watchAutos) ; 16 (compteAssid, monthKey, monthLab) ; 19 (MAIL_URL, envoyerMails) ; 21 (avgNotes, dFiches, moisDe, visG) ; 27 (render)
Utilisé par : 22

### `26-confidentialite.js` — confidentialité (45 lignes)
Définit : `CONSERVATION`, `confView`, `showConf`
Utilise : 00 (S) ; 01 (h) ; 12 (loginView) ; 27 (render)
Utilisé par : 12, 27

### `27-rendu.js` — rendu (11 lignes)
Définit : `render`
Utilise : 00 (S) ; 22 (coachView) ; 23 (joueurView) ; 26 (showConf)
Utilisé par : 03, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 23b, 24, 25, 26, 29

### `28-exemples-apercu.js` — exemples pour l'aperçu (32 lignes)
Définit : `demoData`, `demoEquipes`
Utilise : 00 (GROUPS, critsOf)

### `29-demarrage.js` — démarrage (86 lignes)
Définit : `started`
Utilise : 00 (DB, GROUPS, S) ; 01 (groupOf, h, sortedNotes) ; 03 (saveAvatar) ; 09 (avecPrive, chargerPrive, poserFiches) ; 12 (loginView, softRender) ; 20 (sel) ; 23 (notifier) ; 27 (render)

## Index : où est défini quoi

- `ABBR` → 01-petits-outils.js
- `ABR_P` → 10-acces-coachs.js
- `accesView` → 10-acces-coachs.js
- `accordCard` → 22-tableau-de-bord-visuel.js
- `accordStaff` → 22-tableau-de-bord-visuel.js
- `accueilCoach` → 23b-accueil-premium.js
- `accueilJoueur` → 23b-accueil-premium.js
- `adjNotes` → 01-petits-outils.js
- `ajoutView` → 22-tableau-de-bord-visuel.js
- `analysesCard` → 07-analyses-de-match.js
- `AUTH_ERR` → 12-connexion.js
- `autoAFaire` → 09-auto-evaluations.js
- `autoCard` → 09-auto-evaluations.js
- `autoCompare` → 09-auto-evaluations.js
- `autoMissing` → 09-auto-evaluations.js
- `AV` → 02-avatar.js
- `AV_DEF` → 02-avatar.js
- `avatarEditor` → 02-avatar.js
- `avatarNode` → 02-avatar.js
- `avatarSVG` → 02-avatar.js
- `avClean` → 02-avatar.js
- `avecPrive` → 09-auto-evaluations.js
- `avgNotes` → 21-tableau-de-bord-coach.js
- `avSeq` → 02-avatar.js
- `avVus` → 04-carte-joueur.js
- `badges` → 05-badges-et-records.js
- `badgesBox` → 05-badges-et-records.js
- `badgesVus` → 23-vue-joueur-parent.js
- `BMF_OBJ` → 20-carnet-bmf.js
- `bmfCompteur` → 20-carnet-bmf.js
- `bmfStatut` → 20-carnet-bmf.js
- `byDate` → 01-petits-outils.js
- `calculStatsGroupe` → 23b-accueil-premium.js
- `carnetDu` → 22-tableau-de-bord-visuel.js
- `carnetEdit` → 20-carnet-bmf.js
- `carnetList` → 20-carnet-bmf.js
- `carnetView` → 20-carnet-bmf.js
- `CAT_AL` → 22-tableau-de-bord-visuel.js
- `catOf` → 22-tableau-de-bord-visuel.js
- `champView` → 06-championnat-u19.js
- `chargerPrive` → 09-auto-evaluations.js
- `chart` → 18-presences-coach.js
- `clePeriode` → 09-auto-evaluations.js
- `closeStudio` → 03-avatar-studio-3d.js
- `coachRef` → 09-auto-evaluations.js
- `coachView` → 22-tableau-de-bord-visuel.js
- `coche` → 23b-accueil-premium.js
- `colRef` → 00-debut.js
- `combineNotes` → 01-petits-outils.js
- `composCard` → 15-compositions-de-match.js
- `compteAssid` → 16-ma-saison.js
- `compteCard` → 11-compte-relie.js
- `confView` → 26-confidentialite.js
- `CONSERVATION` → 26-confidentialite.js
- `courbeIndice` → 23b-accueil-premium.js
- `CREST_S` → 02-avatar.js
- `critAvg` → 01-petits-outils.js
- `critLabel` → 00-debut.js
- `critsEnt` → 23b-accueil-premium.js
- `critsForNote` → 00-debut.js
- `critsJ` → 00-debut.js
- `critsOf` → 00-debut.js
- `dansSaison` → 01-petits-outils.js
- `dashAlertes` → 21-tableau-de-bord-coach.js
- `dashLineChart` → 21-tableau-de-bord-coach.js
- `dashView` → 22-tableau-de-bord-visuel.js
- `dashZoom` → 22-tableau-de-bord-visuel.js
- `DB` → 00-debut.js
- `debutSaison` → 01-petits-outils.js
- `DEF4` → 15-compositions-de-match.js
- `demoData` → 28-exemples-apercu.js
- `demoEquipes` → 28-exemples-apercu.js
- `derniereSauvegarde` → 10-acces-coachs.js
- `DESC` → 00-debut.js
- `dFiches` → 21-tableau-de-bord-coach.js
- `ditOf` → 17-sondage-whatsapp.js
- `docRef` → 00-debut.js
- `donutSondage` → 22-tableau-de-bord-visuel.js
- `ecrireFiche` → 09-auto-evaluations.js
- `enAppli` → 23-vue-joueur-parent.js
- `envoyerMails` → 19-fiche-detaillee.js
- `equipeView` → 13-page-equipe.js
- `esc` → 01-petits-outils.js
- `estPrive` → 09-auto-evaluations.js
- `exporterTout` → 10-acces-coachs.js
- `fbApp` → 00-debut.js
- `FC_BG` → 04-carte-joueur.js
- `fcard` → 04-carte-joueur.js
- `fcardData` → 04-carte-joueur.js
- `fcardDraw` → 04-carte-joueur.js
- `fiabilite` → 21-tableau-de-bord-coach.js
- `ficheView` → 19-fiche-detaillee.js
- `finSem` → 23b-accueil-premium.js
- `FIREBASE_CONFIG` → 00-debut.js
- `fld` → 20-carnet-bmf.js
- `fmtDate` → 01-petits-outils.js
- `fmtLong` → 01-petits-outils.js
- `GCOL` → 21-tableau-de-bord-coach.js
- `GK_M` → 00-debut.js
- `GKK` → 00-debut.js
- `GRILLES` → 00-debut.js
- `groupMonth` → 21-tableau-de-bord-coach.js
- `groupOf` → 01-petits-outils.js
- `GROUPS` → 00-debut.js
- `guessFiche` → 10-acces-coachs.js
- `h` → 01-petits-outils.js
- `hx` → 02-avatar.js
- `ilYa` → 17-sondage-whatsapp.js
- `indiceA` → 23b-accueil-premium.js
- `initials` → 01-petits-outils.js
- `installEvt` → 23-vue-joueur-parent.js
- `invitationTexte` → 22-tableau-de-bord-visuel.js
- `isGK` → 00-debut.js
- `isOldNote` → 00-debut.js
- `isTemp` → 00-debut.js
- `joueurView` → 23-vue-joueur-parent.js
- `jourLong` → 17-sondage-whatsapp.js
- `joursDepuisNote` → 22-tableau-de-bord-visuel.js
- `LEVELS` → 00-debut.js
- `libSaison` → 01-petits-outils.js
- `libSemaine` → 23b-accueil-premium.js
- `linkAccount` → 10-acces-coachs.js
- `lireQuota` → 19-fiche-detaillee.js
- `loadStudio` → 03-avatar-studio-3d.js
- `loginView` → 12-connexion.js
- `LOGOS` → 05-badges-et-records.js
- `lundiDe` → 09-auto-evaluations.js
- `MAIL_URL` → 19-fiche-detaillee.js
- `marquerVu` → 23-vue-joueur-parent.js
- `MASQUE_DEBUT` → 09-auto-evaluations.js
- `masquerNotes` → 09-auto-evaluations.js
- `matchForm` → 20-carnet-bmf.js
- `matchStats` → 16-ma-saison.js
- `mean` → 16-ma-saison.js
- `mGrid` → 00-debut.js
- `migrerPrive` → 09-auto-evaluations.js
- `mixC` → 02-avatar.js
- `MOIS` → 16-ma-saison.js
- `moisDe` → 21-tableau-de-bord-coach.js
- `monCompteCard` → 11-compte-relie.js
- `monthKey` → 16-ma-saison.js
- `monthLab` → 16-ma-saison.js
- `moyCrit` → 24-profil-araignee.js
- `n1` → 01-petits-outils.js
- `newMatch` → 20-carnet-bmf.js
- `newSeance` → 20-carnet-bmf.js
- `nextNum` → 20-carnet-bmf.js
- `nid` → 01-petits-outils.js
- `nomCourt` → 23b-accueil-premium.js
- `normName` → 10-acces-coachs.js
- `noteAvg` → 01-petits-outils.js
- `notesEnt` → 23b-accueil-premium.js
- `notifier` → 23-vue-joueur-parent.js
- `nouveautes` → 23-vue-joueur-parent.js
- `numSemaine` → 23b-accueil-premium.js
- `OBJ_ALL` → 14-objectifs-individuels.js
- `OBJ_POSTES` → 14-objectifs-individuels.js
- `objectifCard` → 14-objectifs-individuels.js
- `objectifCoachCard` → 23b-accueil-premium.js
- `objectifSemaine` → 23b-accueil-premium.js
- `openCarnet` → 20-carnet-bmf.js
- `openStudio` → 03-avatar-studio-3d.js
- `ouiAbsents` → 21-tableau-de-bord-coach.js
- `overall` → 01-petits-outils.js
- `phaseOf` → 20-carnet-bmf.js
- `PHASES` → 20-carnet-bmf.js
- `pitchView` → 15-compositions-de-match.js
- `plusJours` → 09-auto-evaluations.js
- `POIDS` → 01-petits-outils.js
- `poserFiches` → 09-auto-evaluations.js
- `posteAbr` → 04-carte-joueur.js
- `posteKey` → 14-objectifs-individuels.js
- `postePicker` → 10-acces-coachs.js
- `POSTES_433` → 10-acces-coachs.js
- `presencesView` → 18-presences-coach.js
- `presentsLe` → 20-carnet-bmf.js
- `presRange` → 21-tableau-de-bord-coach.js
- `presStats` → 16-ma-saison.js
- `principeLab` → 20-carnet-bmf.js
- `printCarnet` → 20-carnet-bmf.js
- `PROC_CHAMPS` → 20-carnet-bmf.js
- `PROC_TYPES` → 20-carnet-bmf.js
- `prochainMatch` → 23b-accueil-premium.js
- `profilCard` → 24-profil-araignee.js
- `psubtabs` → 23-vue-joueur-parent.js
- `publierStatsGroupes` → 23b-accueil-premium.js
- `quotaCard` → 22-tableau-de-bord-visuel.js
- `radarAcc` → 23b-accueil-premium.js
- `radarSVG` → 24-profil-araignee.js
- `rawNotes` → 01-petits-outils.js
- `recapCard` → 25-recap-mensuel-par-mail.js
- `recapJoueur` → 25-recap-mensuel-par-mail.js
- `records` → 05-badges-et-records.js
- `REFLEX` → 20-carnet-bmf.js
- `reflexBlock` → 20-carnet-bmf.js
- `reflexFaite` → 20-carnet-bmf.js
- `render` → 27-rendu.js
- `renderTimer` → 12-connexion.js
- `resumeMatch` → 20-carnet-bmf.js
- `resumeSeance` → 20-carnet-bmf.js
- `ringSVG` → 22-tableau-de-bord-visuel.js
- `RLAB` → 24-profil-araignee.js
- `S` → 00-debut.js
- `saisieView` → 22-tableau-de-bord-visuel.js
- `saisonCard` → 16-ma-saison.js
- `saveAvatar` → 03-avatar-studio-3d.js
- `saveCarnet` → 20-carnet-bmf.js
- `seanceForm` → 20-carnet-bmf.js
- `seancesCoachCard` → 17-sondage-whatsapp.js
- `seancesOf` → 17-sondage-whatsapp.js
- `seanceTitre` → 17-sondage-whatsapp.js
- `secT` → 23b-accueil-premium.js
- `SEG` → 00-debut.js
- `sel` → 20-carnet-bmf.js
- `semaineCard` → 23-vue-joueur-parent.js
- `SER` → 16-ma-saison.js
- `serieIndice` → 23b-accueil-premium.js
- `shortNom` → 15-compositions-de-match.js
- `showConf` → 26-confidentialite.js
- `showTip` → 16-ma-saison.js
- `signature` → 23b-accueil-premium.js
- `slugify` → 11-compte-relie.js
- `softRender` → 12-connexion.js
- `sortedNotes` → 01-petits-outils.js
- `sortedNotesTout` → 01-petits-outils.js
- `sparkSVG` → 22-tableau-de-bord-visuel.js
- `ST_COLORS` → 03-avatar-studio-3d.js
- `stable` → 04-carte-joueur.js
- `stars` → 01-petits-outils.js
- `started` → 29-demarrage.js
- `startSaisie` → 22-tableau-de-bord-visuel.js
- `statsGroupe` → 23b-accueil-premium.js
- `STUDIO_OPTS` → 03-avatar-studio-3d.js
- `studioMod` → 03-avatar-studio-3d.js
- `SYSTEMES` → 15-compositions-de-match.js
- `tipBox` → 16-ma-saison.js
- `today` → 01-petits-outils.js
- `toHex` → 02-avatar.js
- `unlinkAccount` → 11-compte-relie.js
- `visG` → 21-tableau-de-bord-coach.js
- `voteLabel` → 08-votes.js
- `votesCard` → 08-votes.js
- `votesOuverts` → 23-vue-joueur-parent.js
- `vuLe` → 23-vue-joueur-parent.js
- `watchAutos` → 09-auto-evaluations.js
- `watchAvatar` → 04-carte-joueur.js
- `watchBulletins` → 08-votes.js
- `watchPrive` → 09-auto-evaluations.js
- `whereRef` → 00-debut.js
- `wrapDoc` → 00-debut.js
- `writeEquipe` → 13-page-equipe.js
- `writeFiche` → 19-fiche-detaillee.js
- `writeFicheQuiet` → 22-tableau-de-bord-visuel.js
