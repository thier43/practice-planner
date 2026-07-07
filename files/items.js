// api/items.js
const crypto = require('crypto');
const { tursoBatch, rowsToObjects } = require('./_db');

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const results = await tursoBatch([
        { sql: 'SELECT * FROM work_items ORDER BY category, type, title' }
      ]);
      return res.status(200).json(rowsToObjects(results[0]));
    }

    if (req.method === 'POST') {
      const { title, category, type, description, status, resource_path } = req.body || {};
      if (!title || !category || !type) {
        return res.status(400).json({ error: 'title, category et type sont requis' });
      }
      const id = crypto.randomUUID();
      await tursoBatch([{
        sql: 'INSERT INTO work_items (id, title, category, type, description, status, resource_path) VALUES (?,?,?,?,?,?,?)',
        args: [id, title, category, type, description || null, status || 'a_travailler', resource_path || null]
      }]);
      return res.status(200).json({ id });
    }

    if (req.method === 'PUT') {
      const { id, title, category, type, description, status, resource_path } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id requis' });
      await tursoBatch([{
        sql: 'UPDATE work_items SET title=?, category=?, type=?, description=?, status=?, resource_path=? WHERE id=?',
        args: [title, category, type, description || null, status, resource_path || null, id]
      }]);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const id = (req.query && req.query.id) || (req.body && req.body.id);
      if (!id) return res.status(400).json({ error: 'id requis' });
      await tursoBatch([
        { sql: 'DELETE FROM session_items WHERE item_id=?', args: [id] },
        { sql: 'DELETE FROM work_items WHERE id=?', args: [id] }
      ]);
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};
