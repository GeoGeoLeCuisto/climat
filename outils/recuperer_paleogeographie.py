#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Recupere les reconstructions paleogeographiques et genere paleo.js.

Source : GPlates Web Service (EarthByte, Universite de Sydney)
         https://gws.gplates.org
Modele : MERDITH2021 (Merdith et al. 2021, Earth-Science Reviews),
         couverture 0 - 1000 Ma.

Les traits de cote bruts pesent 1 a 2 Mo par age. On les simplifie
(Douglas-Peucker) et on arrondit les coordonnees pour tenir dans un
fichier embarquable, sans dependance reseau a l'execution.

    python outils/recuperer_paleogeographie.py
"""
import json
import math
import os
import sys
import time
import urllib.request

MODELE = "MERDITH2021"
BASE = "https://gws.gplates.org/reconstruct/coastlines/?time={t}&model=" + MODELE

# Ages retenus (Ma). Resserres la ou l'app raconte quelque chose.
AGES = [0, 5, 20, 35, 56, 66, 90, 120, 150, 180, 200, 220, 250, 280,
        310, 340, 370, 400, 440, 470, 500, 540, 580, 620, 660, 700,
        720, 780, 850, 900]

TOLERANCE = 0.40      # degres ; ~2 px sur une texture 2048 de large
AIRE_MIN = 1.2        # degres carres ; sous ce seuil on jette le polygone
DECIMALES = 2

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SORTIE = os.path.join(RACINE, "paleo.js")


# --------------------------------------------------------------------
def telecharger(age, essais=3):
    url = BASE.format(t=age)
    for n in range(essais):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "climat-terre/1.0"})
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:
            if n == essais - 1:
                raise
            print("      nouvel essai (%s)" % e)
            time.sleep(4)


def anneaux_de(geojson):
    """Extrait les anneaux exterieurs de tous les polygones."""
    out = []
    for f in geojson.get("features", []):
        g = f.get("geometry") or {}
        t, c = g.get("type"), g.get("coordinates")
        if t == "Polygon":
            out.append(c[0])
        elif t == "MultiPolygon":
            for poly in c:
                out.append(poly[0])
    return out


def dist_segment(p, a, b):
    (px, py), (ax, ay), (bx, by) = p, a, b
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def douglas_peucker(pts, tol):
    if len(pts) < 3:
        return pts
    dmax, idx = 0.0, 0
    for i in range(1, len(pts) - 1):
        d = dist_segment(pts[i], pts[0], pts[-1])
        if d > dmax:
            dmax, idx = d, i
    if dmax > tol:
        g = douglas_peucker(pts[:idx + 1], tol)
        d = douglas_peucker(pts[idx:], tol)
        return g[:-1] + d
    return [pts[0], pts[-1]]


def aire(pts):
    """Aire signee en degres carres (formule du lacet)."""
    s = 0.0
    for i in range(len(pts)):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % len(pts)]
        s += x1 * y2 - x2 * y1
    return abs(s) / 2.0


def traverse_antimeridien(pts):
    return any(abs(pts[i][0] - pts[i - 1][0]) > 180 for i in range(1, len(pts)))


def normaliser(pts):
    """Ramene les longitudes dans [-180, 180] et deroule les sauts."""
    out = []
    for lon, lat in pts:
        while lon > 180:
            lon -= 360
        while lon < -180:
            lon += 360
        out.append((lon, max(-90.0, min(90.0, lat))))
    return out


def traiter(geojson):
    anneaux, jetes = [], 0
    for ring in anneaux_de(geojson):
        pts = normaliser([(float(p[0]), float(p[1])) for p in ring])
        if len(pts) < 4:
            jetes += 1
            continue
        simple = douglas_peucker(pts, TOLERANCE)
        if len(simple) < 4 or aire(simple) < AIRE_MIN:
            jetes += 1
            continue
        # un anneau qui saute l'antimeridien serait dessine en travers du globe :
        # on le coupe en deux morceaux, de part et d'autre
        if traverse_antimeridien(simple):
            g = [(lon, lat) for lon, lat in simple if lon < 0]
            d = [(lon, lat) for lon, lat in simple if lon >= 0]
            for morceau in (g, d):
                if len(morceau) >= 4:
                    anneaux.append(morceau)
            continue
        anneaux.append(simple)
    return anneaux, jetes


def compacter(anneaux):
    f = "%%.%df" % DECIMALES
    return [[[float(f % lon), float(f % lat)] for lon, lat in a] for a in anneaux]


# --------------------------------------------------------------------
def main():
    donnees, total_pts = {}, 0
    for age in AGES:
        print("  %4d Ma ..." % age, end=" ", flush=True)
        try:
            gj = telecharger(age)
        except Exception as e:
            print("ECHEC : %s" % e)
            continue
        anneaux, jetes = traiter(gj)
        n = sum(len(a) for a in anneaux)
        total_pts += n
        donnees[age] = compacter(anneaux)
        print("%4d anneaux, %6d points (%d jetes)" % (len(anneaux), n, jetes))

    if not donnees:
        print("Aucune donnee recuperee.")
        sys.exit(1)

    corps = ",\n".join(
        '  %d: %s' % (age, json.dumps(donnees[age], separators=(",", ":")))
        for age in sorted(donnees)
    )

    entete = '''/* =====================================================================
   paleo.js — position reconstituee des continents dans le passe
   GENERE AUTOMATIQUEMENT — ne pas editer a la main.
   Regenerer avec : python outils/recuperer_paleogeographie.py

   Source  : GPlates Web Service (EarthByte, Universite de Sydney)
   Modele  : %s — Merdith et al. 2021, Earth-Science Reviews
             « Extending full-plate tectonic models into deep time »
   Licence : donnees ouvertes, CC-BY

   Traitement applique : simplification Douglas-Peucker (tolerance %.2f deg),
   suppression des polygones de moins de %.1f deg carres, coordonnees
   arrondies a %d decimales. La forme des continents est donc approximee
   a environ 2 pixels pres sur le globe.

   LIMITE IMPORTANTE, a afficher a l'utilisateur :
   avant environ 200 Ma, la LONGITUDE des blocs continentaux n'est pas
   contrainte par les donnees. Le paleomagnetisme donne la latitude et
   l'orientation, pas la position est-ouest ; le plancher oceanique qui
   permettrait de la retrouver a ete subducte. Les longitudes anciennes
   sont donc des choix de modele. La latitude et la forme sont fiables.
   ===================================================================== */

export const PALEO_SOURCE = {
  modele: "%s",
  reference: "Merdith et al. 2021, Earth-Science Reviews — via GPlates Web Service (EarthByte)",
  url: "https://gws.gplates.org",
  avertissement: "Avant ~200 Ma, la longitude des continents n'est pas contrainte par les donnees : " +
    "elle depend du modele. La latitude et la forme des blocs, elles, sont fiables.",
  tolerance: %.2f,
};

/** Ages disponibles, en millions d'annees. */
export const PALEO_AGES = %s;

/** { age (Ma) : [ anneau [ [lon, lat], ... ], ... ] } */
export const PALEO = {
''' % (MODELE, TOLERANCE, AIRE_MIN, DECIMALES, MODELE, TOLERANCE,
       json.dumps(sorted(donnees.keys())))

    with open(SORTIE, "w", encoding="utf-8") as f:
        f.write(entete + corps + "\n};\n")

    ko = os.path.getsize(SORTIE) / 1024
    print("\n  -> %s" % SORTIE)
    print("     %d ages, %d points au total, %.0f Ko" % (len(donnees), total_pts, ko))


if __name__ == "__main__":
    main()
