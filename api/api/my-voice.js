import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;
const CHAIRMAN = 'tapbomba.ai@gmail.com';

export default async function handler(req, res) {
  const file = req.query.file;
  if (!file) return res.status(400).json({ error: 'No file', code: 'NO_FILE' });

  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No auth', code: 'NO_AUTH' });
  
  const token = auth.replace('Bearer ', '');
  const authClient = createClient(supabaseUrl, anonKey);
  const { data: { user } } = await authClient.auth.getUser(token);
  
  if (!user) return res.status(401).json({ error: 'Bad token', code: 'INVALID_TOKEN' });

  const serviceClient = createClient(supabaseUrl, serviceKey);
  const { data, error } = await serviceClient.storage.from('voices').createSignedUrl(file, 60);
  
  if (error) return res.status(404).json({ error: 'Not found', code: 'FILE_NOT_FOUND', file, details: error.message });
  
  return res.json({ success: true, signedUrl: data.signedUrl });
}