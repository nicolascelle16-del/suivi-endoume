#!/usr/bin/env python3
"""Carte du code (même idée que Graphify, sans dépendance) : docs/CARTE-DU-CODE.md.

Pour chaque fichier de src/js : ce qu'il définit, ce qu'il utilise des autres fichiers,
et qui l'utilise. Une session Claude lit cette carte au lieu de relire tout le code.
Régénérée à chaque build (outils/build.py) ; --verifier échoue si elle est en retard.
"""
import os, re

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = lambda *p: os.path.join(RACINE, *p)
DEF = re.compile(r"^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)|^(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=", re.M)
MOT = re.compile(r"[A-Za-z_$][\w$]*")
CHAINE = re.compile(r"`(?:\\.|[^`\\])*`|\"(?:\\.|[^\"\\])*\"|'(?:\\.|[^'\\])*'|/\*[\s\S]*?\*/|//[^\n]*")

DONNEES = """## Données (Firestore)

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
| `erreurs/{id}` | journal des plantages du site, sans donnée perso (message, écran, rôle, version, navigateur), effacé après 30 jours | tout compte connecté crée ; le coach lit et efface |
| `inscriptions`, `objectifs`, `bloques` | comptes en attente, objectifs individuels, adresses bloquées | |

Règles du serveur : `serveur/firestore.rules`. Mails : `serveur/mails-apps-script.gs` (Apps Script, déployé à part).
"""

REGLES = """## Règles à ne jamais casser

- La carte joueur (`fcard`, `.fcard`) ne change pas : son style est figé dans `src/style.css` (bloc « CARTE JOUEUR »).
- Notes protégées : tout ce que voit un joueur passe par `masquerNotes(fid, f)`. Pas d'auto-évaluation, pas de note.
- Note du staff : 2/3 Nico, 1/3 Seb (`noteAvg`, `notesAdj`).
- Version parents U10 : pas d'auto-évaluation sur la fiche, pas d'accueil premium.
- Tout le texte du site est en français ; on dit « match », jamais « plateau ».
- On ne publie rien sans aperçu validé par Nico ; `python3 outils/build.py --tests` doit passer.
"""


def main(ecrire=True):
    ordre = [l.strip() for l in open(S("src", "js", "ORDRE.txt"), encoding="utf-8") if l.strip()]
    src = {f: open(S("src", "js", f), encoding="utf-8").read() for f in ordre}
    defs, titre = {}, {}
    for f, t in src.items():
        defs[f] = [a or b for a, b in DEF.findall(t)]
        m = re.search(r"/\*\s*-+\s*(.+?)\s*-+", t); titre[f] = m.group(1).strip() if m else ""
    ou = {}
    for f, ds in defs.items():
        for d in ds: ou.setdefault(d, f)
    utilise = {f: {} for f in ordre}
    for f, t in src.items():
        mots = set(MOT.findall(CHAINE.sub(" ", t)))
        for m in mots:
            g = ou.get(m)
            if g and g != f: utilise[f].setdefault(g, []).append(m)
    par = {f: sorted(g for g in ordre if f in utilise[g]) for f in ordre}
    out = ["# Carte du code : suivi-endoume", "",
           "Générée par `outils/carte.py` à chaque build : ne pas modifier à la main.",
           "Le site est un seul fichier `index.html`, assemblé depuis `src/` (squelette `src/page.html`, style `src/style.css`, code `src/js/` dans l'ordre de `ORDRE.txt`).", "",
           "Pour trouver une fonction : cherche son nom dans l'index en bas, puis ouvre seulement ce fichier.", "", REGLES, DONNEES, "## Fichiers", ""]
    for f in ordre:
        n = len(src[f].splitlines())
        out.append(f"### `{f}` — {titre[f]} ({n} lignes)")
        out.append("Définit : " + (", ".join(f"`{d}`" for d in defs[f]) or "—"))
        u = utilise[f]
        if u: out.append("Utilise : " + " ; ".join(f"{g[:2]} ({', '.join(sorted(set(v))[:8])}{'…' if len(set(v)) > 8 else ''})" for g, v in sorted(u.items())))
        if par[f]: out.append("Utilisé par : " + ", ".join(g[:3].rstrip("-") for g in par[f]))
        out.append("")
    out += ["## Index : où est défini quoi", ""]
    out += [f"- `{d}` → {f}" for d, f in sorted(ou.items(), key=lambda x: x[0].lower())]
    texte = "\n".join(out) + "\n"
    if ecrire:
        os.makedirs(S("docs"), exist_ok=True)
        open(S("docs", "CARTE-DU-CODE.md"), "w", encoding="utf-8").write(texte)
    return texte


if __name__ == "__main__":
    t = main(); print(f"docs/CARTE-DU-CODE.md : {len(t)//1024} Ko")
