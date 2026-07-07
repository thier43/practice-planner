// run-schema.js
// Exécute un fichier .sql sur ta base Turso via l'API HTTP, sans passer par la CLI
// (utile sur Windows, où la CLI Turso exige maintenant WSL).
//
// Usage :
//   node run-schema.js <TURSO_DATABASE_URL> <TURSO_AUTH_TOKEN> [fichier.sql]
//
// Si [fichier.sql] est omis, exécute schema.sql par défaut.
//
// Exemples :
//   node run-schema.js https://practice-planner-tonpseudo.turso.io eyJhbGciOi...
//   node run-schema.js https://practice-planner-tonpseudo.turso.io eyJhbGciOi... migration_001_resource_path.sql

const fs = require('fs');
const path = require('path');

async function main() {
  const [, , url, token, fileArg] = process.argv;
  if (!url || !token) {
    console.error('Usage: node run-schema.js <TURSO_DATABASE_URL> <TURSO_AUTH_TOKEN> [fichier.sql]');
    process.exit(1);
  }

  const sqlPath = path.join(__dirname, fileArg || 'schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Découpe naïve en statements : on retire les lignes de commentaire puis on
  // coupe sur les points-virgules. Suffisant pour ce schema.sql.
  const statements = sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map(s => s.trim())
    .filter(Boolean);

  console.log(`→ ${statements.length} instruction(s) à exécuter sur ${url}`);

  const body = {
    requests: [
      ...statements.map(s => ({ type: 'execute', stmt: { sql: s } })),
      { type: 'close' }
    ]
  };

  const resp = await fetch(`${url}/v2/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const data = await resp.json();

  if (!resp.ok) {
    console.error('Erreur HTTP:', resp.status, JSON.stringify(data, null, 2));
    process.exit(1);
  }

  let hadError = false;
  data.results.forEach((r, i) => {
    if (r.type === 'error') {
      hadError = true;
      console.error(`✗ Instruction ${i + 1} a échoué :`, r.error);
    } else {
      console.log(`✓ Instruction ${i + 1} OK`);
    }
  });

  if (hadError) process.exit(1);
  console.log('\nSchéma appliqué avec succès.');
}

main().catch(e => { console.error(e); process.exit(1); });
