const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { text, idToOverwrite } = req.body || {};
    if (!text) {
      return res.status(400).json({ error: 'Text content is required' });
    }

    const sql = neon(process.env.DATABASE_URL);
    
    if (idToOverwrite) {
      // Overwrite an existing database log entry
      await sql`UPDATE team_logs SET content = ${text} WHERE id = ${idToOverwrite}`;
    } else {
      // Execute parameterized SQL injection-safe query to insert a new row
      await sql`INSERT INTO team_logs (content) VALUES (${text})`;
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};