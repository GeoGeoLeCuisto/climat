# CLIMAT — 4,54 milliards d'années en un geste

Application interactive pour comprendre le réchauffement climatique depuis la formation
de la Terre : d'où vient la situation actuelle, quelles en sont les conséquences,
et quels leviers existent réellement.

Globe 3D pilotable **à la main devant la webcam** — ou à la souris, au clavier, au doigt.

## 🌍 En ligne : **[leclimat.be](https://leclimat.be)**

Hébergé sur GitHub Pages, HTTPS via Let's Encrypt. Le fichier `CNAME` à la racine
déclare le domaine : ne pas le supprimer, le site retomberait sur l'ancienne adresse.

## Lancer en local

```bash
python "climat-terre/serve.py" 8791
```

Puis http://localhost:8791

Utile pour développer. Deux differences avec le site publié : GoatCounter refuse
volontairement de compter sur `localhost`, et le cache navigateur est désactivé.

Le serveur local est nécessaire : les navigateurs bloquent l'accès à la caméra sur `file://`.
Une connexion internet est requise au premier lancement (three.js, MediaPipe et le fond de
carte sont chargés depuis un CDN, puis mis en cache par le navigateur).

## Les quatre gestes

| Geste | Action |
|---|---|
| 🖐 Main ouverte | Saisir et faire tourner la Terre |
| 🤏 Pouce + index seuls | Zoomer — l'écartement **est** le niveau de zoom |
| ✌️ Index + majeur | Voyager dans le temps (position horizontale = position sur la frise) |
| ✊ Poing fermé | Figer la vue, caler sur le chapitre le plus proche |

Le zoom fonctionne en **correspondance absolue** : doigts joints = vue lointaine, doigts
grands ouverts = vue rapprochée. Aucun ancrage à perdre, donc aucune inversion possible.
Une jauge affiche la position sur l'échelle pendant le geste. Une hystérésis maintient le
geste quand les doigts se rejoignent complètement (sans quoi il basculerait en « poing »
pile en butée basse).

> Principe de conception, valable pour tout geste ajouté ensuite : **la grandeur qui
> identifie un geste ne doit jamais être celle qui le pilote.** La première version du zoom
> violait cette règle — la détection décrochait dès qu'on bougeait pour agir.

## Narration

Le bouton **🎙 Narration** lit le chapitre courant à voix haute dans un registre de voix off
documentaire, avec sous-titres au bas de l'écran. Voix, débit et gravité sont réglables ;
l'option « enchaîner » déroule les 17 chapitres d'affilée. Voyager dans le temps pendant la
lecture change le chapitre narré.

Synthèse vocale du navigateur (Web Speech API) — locale, gratuite, hors ligne, aucun texte
envoyé nulle part. Sur Windows, la voix *Microsoft Paul* est sélectionnée automatiquement.

Les textes de narration (`NARRATIONS` dans `data.js`) sont une réécriture des mêmes faits
pour l'oral : phrases courtes, présent de narration, nombres en toutes lettres pour que la
synthèse les prononce correctement. Aucun fait n'y est ajouté par rapport au texte écrit.

La détection tourne **entièrement dans le navigateur** (MediaPipe Hand Landmarker en
WebAssembly). Aucune image ne quitte la machine. Premier chargement du modèle : ~10 s,
puis instantané.

Tout est également pilotable sans caméra :
glisser sur le globe · molette pour zoomer · glisser sur la frise ·
`←` `→` chapitres · `Espace` lecture auto · `+` `−` zoom · `1`-`5` onglets ·
`G` gestes · `N` narration · `?` aide.

## Contenu

**Porte d'entrée : « Comprendre en 10 minutes »** — 8 étapes guidées qui portent une seule
thèse (la **vitesse** : nous rendons en deux siècles un carbone enfoui en 60 millions
d'années, dix fois plus vite que le PETM) et qui finissent sur le pouvoir d'agir, pas sur la
catastrophe. Les 17 chapitres sont l'approfondissement, pas le passage obligé.

**17 chapitres**, de l'Hadéen à 2100 :
Hadéen · Archéen · Grande Oxydation · Terre boule de neige · Cambrien-Dévonien ·
Carbonifère-Permien · extinction Permien-Trias · Crétacé · K-Pg · PETM ·
refroidissement cénozoïque · cycles glaciaires · Holocène · 1750-1900 · 1900-1990 ·
1990-2025 · 2025-2100.

**Cinq onglets** : Histoire · Conséquences · Solutions (avec simulateur de leviers) ·
Idées reçues · Méthode & sources.

## Règle du projet : zéro donnée inventée

Chaque chiffre porte sa source. Chaque série porte un **statut visible** :

| Statut | Signification |
|---|---|
| Mesure directe | Instrument (thermomètre, spectromètre, satellite) |
| Carotte de glace | Air fossile piégé, mesure directe du passé |
| Proxy | Reconstruction indirecte (isotopes, paléosols, stomates) |
| Projection | Sortie de modèle |
| Schéma | Représentation explicitement simplifiée |

Quand la littérature donne une fourchette, l'application affiche la fourchette.

### Paléogéographie

La position des continents est une **vraie reconstruction publiée**, pas un décor.

- Modèle **MERDITH2021** (Merdith et al. 2021, *Earth-Science Reviews*), servi par le
  **GPlates Web Service** (EarthByte, Université de Sydney). Données ouvertes.
- 30 âges échantillonnés entre 0 et 900 Ma, simplifiés (Douglas-Peucker, 0,40°) et
  embarqués dans `paleo.js` — l'app reste autonome, aucun appel réseau à l'exécution.
- Régénérer : `python outils/recuperer_paleogeographie.py` (compter ~4 minutes).

Vérification indépendante des données récupérées : à 250 Ma l'étalement des terres en
longitude atteint son **minimum** de toute la série (54° contre 88° aujourd'hui) — c'est la
Pangée assemblée ; à 310 et 400 Ma la latitude moyenne des terres tombe à −30° puis −50°,
cohérent avec la glaciation gondwanienne au pôle sud. Les données n'ont pas été prises sur
parole.

**Deux limites, affichées à l'écran :**

- **Avant ~200 Ma, la longitude n'est pas contrainte par les données.** Le paléomagnétisme
  donne la latitude et l'orientation, mais le plancher océanique qui permettrait de retrouver
  la position est-ouest a été subducté. Forme et latitude fiables ; longitude = choix de
  modèle. Le globe le signale dès qu'on dépasse 200 Ma.
- **Rien au-delà de 900 Ma.** Hadéen, Archéen et Grande Oxydation restent en géographie
  actuelle, et le globe le dit explicitement.

Les repères posés sur le globe utilisent les **coordonnées actuelles** des sites, pas leur
paléoposition.

### Ce que l'application ne prétend pas faire

- **Le champ de couleur du globe est un modèle zonal simplifié** appliqué à l'anomalie
  globale de l'époque (amplification polaire, contraste terre-mer, retard de l'océan
  Austral). Il illustre la *structure* du réchauffement décrite par le GIEC AR6 ; ce n'est
  pas une carte de données régionales.
- **La limite des glaces** suit une règle simple et documentée dans l'app
  (`latitude = 70 + 4 × anomalie`), pas une reconstruction d'extension glaciaire.
- **Les courbes paléo sont basse résolution** : interpolées entre points publiés, elles
  reproduisent structure et amplitudes réelles, pas la résolution des données brutes.
  Les liens vers les jeux de données sources sont dans l'onglet Méthode.

### Simulateur de solutions

Seuls deux éléments viennent de la littérature : les **potentiels d'atténuation par levier**
(GIEC AR6 WG3, SPM fig. 7) et le **TCRE** (0,45 °C par 1000 GtCO₂, AR6 WG1 SPM D.1.1).
Tout le reste — trajectoire de référence, facteur de recouvrement 0,85, prolongation de
l'effort ×1,8 en 2050 et ×2,2 en 2100 — est une hypothèse de l'application, énoncée à
l'écran sous le simulateur.

Calibration : curseurs à zéro → +2,9 °C ; positions par défaut → +2,5 °C, soit l'ordre de
grandeur des estimations « politiques actuellement mises en œuvre » (+2,6 à +3,1 °C,
PNUE 2024) ; tous les leviers à 100 % → +1,4 °C avec net zéro vers 2058.

## Sources principales

GIEC AR6 (WG1 2021, WG2 et WG3 2022) · Global Carbon Budget 2024 (Friedlingstein et al.) ·
OMM State of the Global Climate 2024 · NOAA GML (Mauna Loa) · EPICA Dome C (Lüthi et al. 2008) ·
Foster, Royer & Lunt 2017 · Westerhold et al. 2020 (CENOGRID) · Zeebe et al. 2016 (PETM) ·
Armstrong McKay et al. 2022 (points de bascule) · PAGES 2k 2019 · Ruddiman,
*Earth's Climate: Past and Future* · Dessler, *Introduction to Modern Climate Change*.

Liste complète et liens : onglet **Méthode & sources** dans l'application.

## Droits

**© 2026 GeoGeoLeCuisto. Tous droits réservés.**

Le code, les textes, le parcours guidé et les narrations de cette application **ne sont pas
placés sous licence libre**. Aucune autorisation de réutilisation, de modification, de
redistribution ou d'exploitation n'est accordée.

Cette réserve porte uniquement sur mon travail. Elle ne s'étend pas aux éléments tiers, qui
restent régis par leurs licences propres et peuvent être réutilisés selon leurs conditions :
reconstructions paléogéographiques (CC-BY), traits de côte Natural Earth (domaine public),
three.js (MIT), MediaPipe (Apache 2.0). Voir [CREDITS.md](CREDITS.md).

Deux précisions honnêtes, parce qu'une mention de droits ne fait pas tout :

- Le dépôt est public sur GitHub, condition nécessaire pour héberger le site gratuitement.
  Les conditions d'utilisation de la plateforme autorisent ses membres à consulter et à
  « forker » un dépôt public, indépendamment de la présente mention.
- Comme pour toute page web, le code source est lisible par n'importe quel visiteur.

Autrement dit : cette mention interdit la réutilisation, elle ne l'empêche pas techniquement.
Rendre le dépôt privé tout en gardant le site en ligne suppose un compte GitHub payant.

## Publier une mise à jour

```bash
python outils/version.py && git add -A && git commit -m "..." && git push
```

`version.py` estampille une nouvelle version dans `index.html`, que `app.js` propage à
`data.js` et `paleo.js`. Sans cette étape, les visiteurs gardent l'ancienne version en
cache jusqu'à dix minutes. Le site se met à jour environ 30 secondes après le push.

## Services externes

Configurés dans `CONFIG`, au début de `data.js`. Vider une valeur désactive le service :
aucune requête n'est alors émise.

| Service | Rôle | Tableau de bord |
|---|---|---|
| GoatCounter | Audience, sans cookie ni consentement requis | [climat-georges.goatcounter.com](https://climat-georges.goatcounter.com) |
| Web3Forms | Formulaire d'avis, envoi vers la boîte de l'auteur | web3forms.com |

Les étapes du parcours et les onglets sont comptés séparément (`parcours-etape-1` à
`parcours-etape-9`) : l'écart entre la première et la dernière indique le taux d'abandon.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Structure de la page |
| `style.css` | Thème sombre, mise en page, responsive |
| `data.js` | Toutes les données scientifiques et leurs sources |
| `paleo.js` | Continents reconstitués, 30 âges (généré, 2,5 Mo) |
| `CNAME` | Domaine personnalisé — géré par GitHub, ne pas supprimer |
| `outils/recuperer_paleogeographie.py` | Régénère `paleo.js` depuis GPlates |
| `outils/version.py` | Estampille une version pour casser le cache |
| `app.js` | Globe 3D, frise, graphiques, simulateur, détection gestuelle |
| `serve.py` | Serveur statique local |

Aucune dépendance à installer. `window.__CLIMAT` est exposé dans la console pour inspection.
