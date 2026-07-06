// api/_db.js
// Petit wrapper autour de l'API HTTP pipeline de Turso (libSQL).
// Doc : https://docs.turso.tech/sdk/http/reference

const TURSO_URL = process.env.TURSO_DATABASE_URL; // ex: https://xxxx.turso.io
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

function toArg(v) {
  if (v === null || v === undefined) return { type: 'null' };
  if (typeof v === 'boolean') return { type: 'integer', value: v ? '1' : '0' };
  if (typeof v === 'number') {
    return Number.isInteger(v) ? { type: 'integer', value: String(v) } : { type: 'float', value: v };
  }
  return { type: 'text', value: String(v) };
}

// statements: [{ sql: '...', args: [...] }, ...]
// Renvoie un tableau de résultats "rows" bruts (format Hrana), un par statement.
async function tursoBatch(statements) {
  if (!TURSO_URL || !TURSO_TOKEN) {
    throw new Error('TURSO_DATABASE_URL / TURSO_AUTH_TOKEN manquants (variables d\'environnement Vercel)');
  }
  const body = {
    requests: [
      ...statements.map(s => ({
        type: 'execute',
        stmt: { sql: s.sql, args: (s.args || []).map(toArg) }
      })),
      { type: 'close' }
    ]
  };
  const resp = await fetch(`${TURSO_URL}/v2/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TURSO_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error('Turso error: ' + JSON.stringify(data));
  }
  const results = [];
  for (const r of data.results) {
    if (r.type === 'error') throw new Error('Turso SQL error: ' + JSON.stringify(r.error));
    if (r.type === 'ok' && r.response && r.response.result) results.push(r.response.result);
  }
  return results;
}

// Convertit un résultat Hrana { cols, rows } en tableau d'objets JS classiques.
function rowsToObjects(result) {
  if (!result || !result.rows) return [];
  const cols = result.cols.map(c => c.name);
  return result.rows.map(row => {
    const obj = {};
    row.forEach((cell, i) => {
      if (!cell || cell.type === 'null') obj[cols[i]] = null;
      else if (cell.type === 'integer') obj[cols[i]] = parseInt(cell.value, 10);
      else if (cell.type === 'float') obj[cols[i]] = parseFloat(cell.value);
      else obj[cols[i]] = cell.value;
    });
    return obj;
  });
}

module.exports = { tursoBatch, rowsToObjects };
