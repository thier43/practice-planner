# Salle de Travail — Planning de pratique

App autonome pour planifier tes séances de travail musical (morceaux, études, exercices) sur un calendrier jour / semaine / mois, en séparant Irlandais (Sky Road) et Jazz (AMAJAZZ).

Architecture : `index.html` (front, vanilla JS) + fonctions Vercel (`api/items.js`, `api/sessions.js`) qui parlent à **Turso** via l'API HTTP pipeline — même pattern que Sky Road. Le token Turso reste côté serveur (variables d'environnement Vercel), jamais exposé dans le HTML.

⚠️ **Sur Windows, la CLI Turso exige maintenant WSL** (comme tu l'avais déjà rencontré avec Sky Road). On passe donc entièrement par le dashboard web + un petit script Node pour créer les tables — pas de CLI, pas de WSL.

## 1. Créer la base sur le dashboard web

1. Va sur **https://app.turso.tech** et connecte-toi (GitHub ou email).
2. Crée une nouvelle base de données (bouton "Create Database" / "New Database"), donne-lui un nom, ex. `practice-planner`, choisis une région proche (Europe).
3. Une fois la base créée, ouvre sa page de détail :
   - Récupère l'**URL de connexion** (affichée sous un format `https://practice-planner-tonpseudo.turso.io` ou `libsql://...` — utilise la variante `https://`).
   - Cherche un bouton du type **"Create Token"** / **"Generate Token"** (souvent dans un onglet "Tokens" ou "Settings" de la base) et crée un token. Copie-le immédiatement, il ne sera réaffiché qu'une fois.

Si l'un de ces boutons a bougé de place dans l'interface (le dashboard évolue), cherche "token" ou "connect" dans la page de la base — l'info y est toujours, sous une forme ou une autre.

## 2. Créer les tables (sans CLI)

Dans le dossier du projet, ouvre un terminal PowerShell :

```powershell
cd D:\Developement\practice-planner
node run-schema.js https://practice-planner-tonpseudo.turso.io TON_TOKEN_ICI
```

Remplace l'URL et le token par les tiens (ceux notés à l'étape 1). Le script exécute `schema.sql` directement via l'API HTTP de Turso et affiche `✓` pour chaque table/index créé.

Nécessite Node.js installé (tu l'as déjà pour tes autres projets). Si `node` n'est pas reconnu, vérifie que Node.js est bien dans ton PATH.

## 3. Variables d'environnement Vercel

Dans les paramètres du projet Vercel (Settings > Environment Variables), ajoute :

- `TURSO_DATABASE_URL` = l'URL notée à l'étape 1
- `TURSO_AUTH_TOKEN` = le token noté à l'étape 1

Pas besoin d'éditer `index.html` : toute la config sensible vit côté serveur.

## 4. Déployer sur Vercel

```powershell
cd D:\Developement\practice-planner
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<toncompte>/practice-planner.git
git push -u origin main
```

Sur vercel.com : **Add New > Project**, choisis le repo. Avant de cliquer Deploy, renseigne les 2 variables d'environnement (étape 3). Vercel détecte automatiquement `index.html` (statique) et le dossier `api/` (fonctions Node.js) — aucune configuration supplémentaire nécessaire.

Si tu as déjà déployé sans les variables : Project > Settings > Environment Variables, ajoute-les, puis Deployments > (les trois points sur le dernier déploiement) > **Redeploy**.

## 5. Vérifier que ça marche

Ouvre l'URL Vercel (`practice-planner.vercel.app`), clique **Bibliothèque**, ajoute un morceau test. Si une bannière d'erreur apparaît en haut de la page, relis le message : il vient directement de l'API et te dira si une variable d'environnement manque ou si le token est invalide.

## Utilisation

- **Bibliothèque** : ajoute tes morceaux / études / exercices, classés Irlandais ou Jazz, avec un statut (à travailler / en cours / maîtrisé).
- **+ Séance** : place une séance sur le calendrier (date, heure, durée, catégorie), et coche les éléments de la bibliothèque que tu vas travailler pendant cette séance.
- Clique une case vide du calendrier (vue Semaine/Jour) pour créer une séance à cette heure-là. Clique un jour en vue Mois pour zoomer dessus.
- Clique une séance existante pour la modifier, la marquer comme faite, ou la supprimer.
- Les cartes en haut (Irlandais/Jazz, planifié/fait) donnent le temps total pour la période affichée.

## Idées d'évolution possibles

- Séances récurrentes (ex: "gammes tous les mardis")
- Historique / statistiques sur plusieurs mois
- Export du planning de la semaine en PDF

## Ouvrir directement tes dossiers locaux depuis l'app

Par défaut, les navigateurs bloquent l'ouverture de liens `file://` depuis une page web (mesure de sécurité). Pour pouvoir cliquer sur un chemin local (ex: `D:\Cours\Kesh Jig`) et l'ouvrir directement dans l'Explorateur Windows, l'app utilise un protocole personnalisé `ouvrir://`, comme le font Zoom ou Slack pour leurs liens.

**Installation (une seule fois, sur chaque PC où tu utilises l'app) :**

1. Récupère le dossier `local-protocol/` (contient `install-protocol.bat` et `open-folder.vbs`)
2. Double-clique sur `install-protocol.bat`
3. Une fenêtre noire confirme "Protocole ouvrir:// installé avec succès" — ferme-la

**Ensuite**, dans la Bibliothèque, renseigne simplement le chemin du dossier normalement (ex: `D:\Cours\Kesh Jig`), et le bouton **📂 Ouvrir** l'ouvrira directement dans l'Explorateur.

**La première fois** que tu cliques sur un lien `ouvrir://` dans ton navigateur, une popup demande de confirmer l'ouverture de l'application liée au protocole — coche "Toujours autoriser" pour ne plus avoir cette question ensuite.

⚠️ Cette installation est propre à **cet ordinateur** : si tu utilises l'app depuis un autre PC (ou ton téléphone), les chemins locaux n'y seront pas cliquables — utilise plutôt un lien cloud (pCloud, etc.) pour les supports que tu veux ouvrir depuis plusieurs appareils.
