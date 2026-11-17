# Suivi joueurs US Endoume : consignes pour Claude

Lis d'abord `docs/CARTE-DU-CODE.md`. Elle dit quel fichier de `src/js/` contient quoi, ce qui dépend de quoi, et le modèle de données. N'ouvre ensuite que les fichiers concernés, sans relire tout le code.

- On modifie `src/`, jamais `index.html` à la main. `python3 outils/build.py --tests` reconstruit le site, la carte, et teste chaque écran.
- Les règles à ne jamais casser sont dans la carte (carte joueur figée, notes protégées, 2/3 – 1/3, version parents U10).
- Parler à Nico en français, dire « match » et jamais « plateau ». En cas de doute, demander plutôt que prendre une initiative.
- Toujours montrer un aperçu avant de mettre en ligne.
