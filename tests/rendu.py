#!/usr/bin/env python3
"""Test de rendu : ouvre chaque écran du site avec des données d'exemple (sans Firebase)
et échoue si une erreur JavaScript apparaît ou si un écran reste vide.

Utilise Playwright + Chrome. Lancé par : python3 outils/build.py --tests
"""
import asyncio, os, re, shutil, sys, tempfile

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ECRANS = ["login", "dash", "dash10", "list", "fiche", "saisie", "saisiem", "saisie10", "smatch", "pres",
          "eq", "jacc", "jgb", "jeq", "jradar", "jauto", "p10", "acces", "adj", "adjdash", "adjfiche", "bmfs", "bmfm", "bmfnew", "conf"]


def harnais(source=None):
    html = open(source or os.path.join(RACINE, "index.html"), encoding="utf-8").read()
    lignes = html.split("\n")
    a = next(i for i, l in enumerate(lignes) if l.startswith("import { initializeApp }"))
    b = next(i for i, l in enumerate(lignes) if l.startswith("const FIREBASE_CONFIG = "))
    stubs = open(os.path.join(RACINE, "tests", "stubs.js"), encoding="utf-8").read().rstrip("\n").split("\n")
    lignes = lignes[:a] + stubs + lignes[b + 1:]
    fin = max(i for i, l in enumerate(lignes) if l.strip() == "</script>")
    modes = open(os.path.join(RACINE, "tests", "modes.js"), encoding="utf-8").read().rstrip("\n").split("\n")
    lignes = lignes[:fin] + modes + lignes[fin:]
    d = tempfile.mkdtemp()
    p = os.path.join(d, "harnais.html")
    open(p, "w", encoding="utf-8").write("\n".join(lignes))
    return p


async def tester(chemin):
    from playwright.async_api import async_playwright
    chrome = os.environ.get("CHROME") or shutil.which("google-chrome") or shutil.which("chromium")
    problemes = []
    async with async_playwright() as p:
        nav = await p.chromium.launch(**({"executable_path": chrome} if chrome else {}))
        for e in ECRANS:
            for largeur in (390, 1200):
                page = await nav.new_page(viewport={"width": largeur, "height": 900})
                errs = []
                page.on("pageerror", lambda x: errs.append(str(x)))
                await page.goto("file://" + chemin + "#" + e)
                await page.wait_for_timeout(700)
                n = await page.evaluate("document.querySelectorAll('main *, #app *').length")
                if errs: problemes.append(f"{e} ({largeur}px) : {errs[0][:200]}")
                elif n < 5: problemes.append(f"{e} ({largeur}px) : écran vide")
                await page.close()
        await nav.close()
    return problemes


def main():
    probs = asyncio.run(tester(harnais(sys.argv[1] if len(sys.argv) > 1 else None)))
    if probs:
        print("Test de rendu : ÉCHEC\n- " + "\n- ".join(probs)); sys.exit(1)
    print(f"Test de rendu : OK ({len(ECRANS)} écrans × 2 largeurs, aucune erreur)")


if __name__ == "__main__":
    main()
