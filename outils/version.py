#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Estampille une nouvelle version dans index.html, pour casser le cache.

GitHub Pages sert les fichiers avec Cache-Control: max-age=600. Sans ce
suffixe, un visiteur qui a deja ouvert le site continue de voir l'ancienne
version pendant dix minutes — et un navigateur peut garder un module ES
bien plus longtemps.

app.js lit son propre « ?v= » et le propage a data.js et paleo.js :
il n'y a donc qu'une seule valeur a changer, ici.

    python outils/version.py            -> version horodatee automatique
    python outils/version.py 20260728b  -> version imposee

A lancer avant chaque commit de publication.
"""
import datetime
import os
import re
import sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(RACINE, "index.html")

MOTIF = re.compile(r'(href|src)="(style\.css|app\.js)\?v=([^"]*)"')


def main():
    if len(sys.argv) > 1:
        version = sys.argv[1]
    else:
        version = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d%H%M")

    with open(INDEX, encoding="utf-8") as f:
        html = f.read()

    trouves = MOTIF.findall(html)
    if not trouves:
        print("ERREUR : aucun suffixe ?v= trouve dans index.html.")
        print("         Verifiez que style.css et app.js sont bien references avec ?v=...")
        sys.exit(1)

    ancienne = trouves[0][2]
    html = MOTIF.sub(lambda m: '%s="%s?v=%s"' % (m.group(1), m.group(2), version), html)

    with open(INDEX, "w", encoding="utf-8", newline="\n") as f:
        f.write(html)

    print("version : %s  ->  %s" % (ancienne, version))
    print("%d reference(s) mise(s) a jour dans index.html" % len(trouves))
    print("\napp.js propagera cette version a data.js et paleo.js.")
    print("Pensez a committer index.html avec le reste.")


if __name__ == "__main__":
    main()
