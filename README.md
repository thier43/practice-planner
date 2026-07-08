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

## Usage 100% local (un seul PC, liens vers dossiers cliquables)

Pour que les liens vers tes dossiers de supports (`D:\Cours\...`) soient directement cliquables — sans rien installer, sans souci d'antivirus — l'app est conçue pour être ouverte **directement depuis ton disque**, plutôt que via l'URL Vercel.

**Pourquoi ça marche comme ça :** les navigateurs bloquent les liens `file://` uniquement quand la page qui les affiche vient d'un site web (`https://...`). Si la page elle-même est ouverte en local (double-clic sur `index.html`), cette restriction ne s'applique plus.

### Mise en place

1. Vérifie que `API_BASE` en haut du `<script>` dans `index.html` pointe bien vers ton URL Vercel :
   ```js
   const API_BASE = 'https://thier43-practice-planner.vercel.app';
   ```
   ⚠️ à confirmer/corriger si ton URL Vercel réelle est différente (vérifie sur ton dashboard Vercel).
2. Déploie normalement une dernière fois (`git push`) pour que l'API en ligne ait bien les en-têtes CORS nécessaires.
3. Ensuite, **au quotidien, n'ouvre plus l'URL Vercel** : ouvre directement le fichier `index.html` sur ton PC (double-clic, ou crée un raccourci sur le Bureau).

L'app continue de lire/écrire tes données via Turso (donc il te faut une connexion internet), mais l'interface tourne en local — et les liens vers tes dossiers s'ouvrent nativement.

### Ce que ça change

- ✅ Plus besoin d'installer de protocole personnalisé, plus de souci d'antivirus
- ✅ Liens locaux cliquables, ouverture directe dans le navigateur (vue dossier)
- ❌ L'app ne sera plus utilisable depuis ton téléphone ou un autre PC via l'URL Vercel — sauf si tu recommences à l'ouvrir via cette URL ponctuellement (rien ne l'en empêche techniquement, seuls les liens locaux ne fonctionneront pas dans ce cas)
- Le dossier `local-protocol/` (protocole `ouvrir://`) n'est plus nécessaire, tu peux l'ignorer ou le supprimer

## Séances récurrentes

À la création d'une séance (pas en modification), coche **🔁 Séance récurrente** : choisis les jours de la semaine concernés (coche-en un seul pour "tous les lundis", tous les 7 pour "tous les jours", etc.) et une date de fin. L'app crée une séance indépendante pour chaque occurrence — modifier ou marquer "fait" une occurrence n'affecte pas les autres.

À la suppression d'une séance qui fait partie d'une série, le choix est proposé : supprimer uniquement celle-ci, ou celle-ci et toutes les occurrences suivantes.

Limite : 200 occurrences max par série (largement suffisant, ça évite une création accidentelle sur plusieurs années).

**Migration requise avant utilisation :**
```powershell
node run-schema.js https://practice-planner-thier43.turso.io TON_TOKEN migration_002_recurring_sessions.sql
```
