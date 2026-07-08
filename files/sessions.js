// api/sessions.js
const crypto = require('crypto');
const { tursoBatch, rowsToObjects } = require('./_db');

module.exports = async (req, res) => {
  // CORS : permet d'appeler cette API depuis index.html ouvert en local (file://),
  // qui envoie un Origin "null". Nécessaire pour l'usage 100% local sur ce PC.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { return res.status(204).end(); }

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
      const { session_date, start_time, duration_minutes, category, notes, item_ids, recurrence } = req.body || {};
      if (!session_date || !start_time || !category) {
        return res.status(400).json({ error: 'session_date, start_time et category sont requis' });
      }

      if (recurrence && Array.isArray(recurrence.days) && recurrence.days.length && recurrence.until) {
        const dates = [];
        let cur = new Date(session_date + 'T00:00:00');
        const until = new Date(recurrence.until + 'T00:00:00');
        let guard = 0;
        while (cur <= until && guard < 366) {
          if (recurrence.days.includes(cur.getDay())) {
            dates.push(cur.toISOString().slice(0, 10));
          }
          cur.setDate(cur.getDate() + 1);
          guard++;
        }
        if (dates.length === 0) {
          return res.status(400).json({ error: "Aucune occurrence générée : vérifie les jours choisis et la date de fin." });
        }
        if (dates.length > 200) {
          return res.status(400).json({ error: `Trop d'occurrences (${dates.length}). Choisis une date de fin plus proche (200 max).` });
        }

        const seriesId = crypto.randomUUID();
        const stmts = [];
        const ids = [];
        dates.forEach(d => {
          const sid = crypto.randomUUID();
          ids.push(sid);
          stmts.push({
            sql: 'INSERT INTO planning_sessions (id, session_date, start_time, duration_minutes, category, notes, series_id) VALUES (?,?,?,?,?,?,?)',
            args: [sid, d, start_time, duration_minutes || 30, category, notes || null, seriesId]
          });
          (item_ids || []).forEach(itemId => {
            stmts.push({ sql: 'INSERT INTO session_items (session_id, item_id) VALUES (?,?)', args: [sid, itemId] });
          });
        });
        await tursoBatch(stmts);
        return res.status(200).json({ id: ids[0], series_id: seriesId, count: dates.length });
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
      const deleteSeries = req.query && req.query.series === 'true';
      if (!id) return res.status(400).json({ error: 'id requis' });

      if (deleteSeries) {
        const infoResults = await tursoBatch([{
          sql: 'SELECT series_id, session_date FROM planning_sessions WHERE id=?',
          args: [id]
        }]);
        const infoRows = rowsToObjects(infoResults[0]);
        if (infoRows.length && infoRows[0].series_id) {
          const { series_id, session_date } = infoRows[0];
          const seriesResults = await tursoBatch([{
            sql: 'SELECT id FROM planning_sessions WHERE series_id=? AND session_date>=?',
            args: [series_id, session_date]
          }]);
          const seriesIds = rowsToObjects(seriesResults[0]).map(r => r.id);
          const stmts = [];
          seriesIds.forEach(sid => {
            stmts.push({ sql: 'DELETE FROM session_items WHERE session_id=?', args: [sid] });
            stmts.push({ sql: 'DELETE FROM planning_sessions WHERE id=?', args: [sid] });
          });
          if (stmts.length) await tursoBatch(stmts);
          return res.status(200).json({ ok: true, deleted: seriesIds.length });
        }
        // Pas de série associée : on retombe sur la suppression simple ci-dessous
      }

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
