# Crédits et attributions

Cette page existe parce que certaines des données utilisées sont publiées sous licence
**CC-BY**, qui impose de citer la source. Ce n'est pas une politesse, c'est une obligation.

## Reconstructions paléogéographiques

Les positions passées des continents (`paleo.js`) proviennent de :

> **Merdith, A.S., Williams, S.E., Collins, A.S., Tetley, M.G., Mulder, J.A., Blades, M.L.,
> Young, A., Armistead, S.E., Cannon, J., Zahirovic, S., Müller, R.D. (2021).**
> *Extending full-plate tectonic models into deep time: Linking the Neoproterozoic and
> the Phanerozoic.* Earth-Science Reviews, 214, 103477.
> https://doi.org/10.1016/j.earscirev.2020.103477

Servies par le **GPlates Web Service**, développé par le groupe EarthByte de l'Université
de Sydney : https://gws.gplates.org — logiciel GPlates : https://www.gplates.org

Les données brutes ont été échantillonnées sur 30 âges, simplifiées (Douglas-Peucker,
tolérance 0,40°) et arrondies à deux décimales. Elles sont donc **dérivées** : toute
erreur d'approximation est imputable à ce traitement, pas au modèle d'origine.

## Traits de côte actuels

**Natural Earth** (échelle 1:110 m), domaine public, via le paquet `world-atlas` :
https://www.naturalearthdata.com — https://github.com/topojson/world-atlas

## Bibliothèques

- **three.js** — rendu 3D du globe. Licence MIT. https://threejs.org
- **MediaPipe Tasks Vision** (Google) — détection de la main pour le pilotage gestuel.
  Licence Apache 2.0. https://developers.google.com/mediapipe

## Données scientifiques

Chaque chiffre affiché dans l'application porte sa source à l'écran. Les principales :

- **GIEC / IPCC**, Sixième rapport d'évaluation (AR6), WG1 2021, WG2 et WG3 2022.
  https://www.ipcc.ch/assessment-report/ar6/
- **Global Carbon Budget 2024** — Friedlingstein et al., *Earth System Science Data*.
  https://globalcarbonbudget.org/
- **NOAA Global Monitoring Laboratory** — CO₂ de Mauna Loa. https://gml.noaa.gov/ccgg/trends/
- **OMM / WMO** — State of the Global Climate 2024.
- **EPICA Dome C** — Lüthi et al. 2008, *Nature* ; Bereiter et al. 2015, *GRL*.
- **Foster, Royer & Lunt 2017**, *Nature Communications* — CO₂ sur 420 Ma.
- **Zeebe, Ridgwell & Zachos 2016**, *Nature Geoscience* — taux d'injection du carbone.
- **Armstrong McKay et al. 2022**, *Science* — points de bascule.

La liste complète est dans l'onglet **Méthode & sources** de l'application.

## Ce qui n'est pas emprunté

Le code, les textes, le parcours guidé et les narrations sont originaux. Les simplifications
de modélisation (champ de couleur zonal, limite des glaces, mécanique du simulateur) sont
des choix de cette application et sont signalés comme tels à l'écran — ils n'engagent aucune
des sources citées ci-dessus.
