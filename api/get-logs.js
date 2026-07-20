import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  try {
    // Vercel handles passing the DATABASE_URL secret automatically
    const sql = neon(process.env.DATABASE_URL);
    
    // Fetch rows from your table
    const result = await sql`SELECT content FROM team_logs ORDER BY id DESC LIMIT 50`;
    
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}