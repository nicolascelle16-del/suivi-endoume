# Suivi joueurs US Endoume

Site de suivi des joueurs de l'US Endoume Marseille Catalans (U19, U10, gardiens) : notes, auto-évaluations,
présences, équipe, carnet BMF. Publié par GitHub Pages : https://nicolascelle16-del.github.io/suivi-endoume/

## Où est le code

Ne pas modifier `index.html` à la main : il est **reconstruit** à partir de `src/`.

| Dossier | Contenu |
|---|---|
| `src/page.html` | squelette de la page |
| `src/style.css` | toute la feuille de style |
| `src/js/` | le code, rangé par thème (`ORDRE.txt` donne l'ordre d'assemblage) |
| `src/firebase-config.js` | configuration publique Firebase |
| `serveur/firestore.rules` | règles de sécurité de la base (à publier dans la console Firebase) |
| `serveur/mails-apps-script.gs` | script Google Apps Script qui envoie les mails |
| `outils/build.py` | assemble et vérifie `index.html` |
| `tests/` | test de rendu de tous les écrans avec des données d'exemple |

## Mettre à jour le site

```
python3 outils/build.py --tests   # assemble index.html, vérifie la syntaxe et teste le rendu
git commit -am "…" && git push     # GitHub Pages publie en quelques minutes
```

Si un contrôle échoue, `index.html` n'est pas modifié. À chaque envoi sur GitHub, la même vérification
est relancée automatiquement (onglet *Actions*).
