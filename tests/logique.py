#!/usr/bin/env python3
"""Tests des règles de calcul (pondération 2/3 – 1/3, notes protégées, indice, objectif automatique).

Ouvre le site sans Firebase, exécute tests/logique.js dans le code du site et échoue si une règle est cassée.
Lancé par : python3 outils/build.py --tests
"""
import asyncio, os, shutil, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rendu import harnais, RACINE


async def tester(chemin):
    from playwright.async_api import async_playwright
    t = open(chemin, encoding="utf-8").read(); i = t.rindex("</script>")
    t = t[:i] + open(os.path.join(RACINE, "tests", "logique.js"), encoding="utf-8").read() + "\n" + t[i:]
    open(chemin, "w", encoding="utf-8").write(t)
    chrome = os.environ.get("CHROME") or shutil.which("google-chrome") or shutil.which("chromium")
    async with async_playwright() as p:
        nav = await p.chromium.launch(**({"executable_path": chrome} if chrome else {}))
        page = await nav.new_page(); errs = []
        page.on("pageerror", lambda x: errs.append(str(x)))
        await page.goto("file://" + chemin + "#login"); await page.wait_for_timeout(500)
        try: res = await page.evaluate("window.__logique()")
        except Exception as e: res = [{"nom": "exécution des tests", "ok": False, "detail": str(e)[:300]}]
        await nav.close()
    return res, errs


def main():
    res, errs = asyncio.run(tester(harnais(sys.argv[1] if len(sys.argv) > 1 else None)))
    ko = [r for r in res if not r["ok"]] + [{"nom": "erreur JavaScript", "detail": e[:200]} for e in errs]
    if ko:
        print("Tests des calculs : ÉCHEC\n- " + "\n- ".join(f"{r['nom']} : {r.get('detail', '')}" for r in ko)); sys.exit(1)
    print(f"Tests des calculs : OK ({len(res)} règles vérifiées)")


if __name__ == "__main__":
    main()
