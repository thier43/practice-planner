// api/sessions.js
const crypto = require('crypto');
const { tursoBatch, rowsToObjects } = require('./_db');

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const { from, to } = req.query || {};
      if (!from || !to) return res.status(400).json({ error: 'from et to (dates) requis' });

      const results = await tursoBatch([{
        sql: 'SELECT * FROM planning_sessions WHERE session_date BETWEEN ? AND ? ORDER BY session_date, start_time',
        args: [from, to]
      }]);
      const sessions = rowsToObjects(results[0]);
      sessions.forEach(s => { s.done = !!s.done; });

      if (sessions.length === 0) return res.status(200).json([]);

      const ids = sessions.map(s => s.id);
      const placeholders = ids.map(() => '?').join(',');
      const results2 = await tursoBatch([{
        sql: `SELECT si.session_id AS session_id, wi.* FROM session_items si
              JOIN work_items wi ON wi.id = si.item_id
              WHERE si.session_id IN (${placeholders})`,
        args: ids
      }]);
      const itemRows = rowsToObjects(results2[0]);
      const bySession = {};
      itemRows.forEach(r => {
        const { session_id, ...item } = r;
        (bySession[session_id] = bySession[session_id] || []).push(item);
      });
      sessions.forEach(s => { s.items = bySession[s.id] || []; });
      return res.status(200).json(sessions);
    }

    if (req.method === 'POST') {
      const { session_date, start_time, duration_minutes, category, notes, item_ids } = req.body || {};
      if (!session_date || !start_time || !category) {
        return res.status(400).json({ error: 'session_date, start_time et category sont requis' });
      }
      const id = crypto.randomUUID();
      const stmts = [{
        sql: 'INSERT INTO planning_sessions (id, session_date, start_time, duration_minutes, category, notes) VALUES (?,?,?,?,?,?)',
        args: [id, session_date, start_time, duration_minutes || 30, category, notes || null]
      }];
      (item_ids || []).forEach(itemId => {
        stmts.push({ sql: 'INSERT INTO session_items (session_id, item_id) VALUES (?,?)', args: [id, itemId] });
      });
      await tursoBatch(stmts);
      return res.status(200).json({ id });
    }

    if (req.method === 'PUT') {
      const { id, session_date, start_time, duration_minutes, category, notes, item_ids, done } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id requis' });

      if (done !== undefined && session_date === undefined) {
        // Bascule rapide "fait / non fait" uniquement
        await tursoBatch([{
          sql: 'UPDATE planning_sessions SET done=?, done_at=? WHERE id=?',
          args: [done ? 1 : 0, done ? new Date().toISOString() : null, id]
        }]);
        return res.status(200).json({ ok: true });
      }

      const stmts = [{
        sql: 'UPDATE planning_sessions SET session_date=?, start_time=?, duration_minutes=?, category=?, notes=? WHERE id=?',
        args: [session_date, start_time, duration_minutes || 30, category, notes || null, id]
      }, {
        sql: 'DELETE FROM session_items WHERE session_id=?', args: [id]
      }];
      (item_ids || []).forEach(itemId => {
        stmts.push({ sql: 'INSERT INTO session_items (session_id, item_id) VALUES (?,?)', args: [id, itemId] });
      });
      await tursoBatch(stmts);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const id = (req.query && req.query.id) || (req.body && req.body.id);
      if (!id) return res.status(400).json({ error: 'id requis' });
      await tursoBatch([
        { sql: 'DELETE FROM session_items WHERE session_id=?', args: [id] },
        { sql: 'DELETE FROM planning_sessions WHERE id=?', args: [id] }
      ]);
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};
