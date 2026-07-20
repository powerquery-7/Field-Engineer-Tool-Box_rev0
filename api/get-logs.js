const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  try {
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`SELECT id, content FROM team_logs ORDER BY id DESC LIMIT 50`;
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};