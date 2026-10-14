import { createClient } from '@supabase/supabase-js'

// Client "service role" : contourne le RLS, ne doit JAMAIS être exposé au navigateur.
export const db = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

/** Vérifie le JWT Supabase de la requête. Répond 401 et renvoie null si invalide. */
export async function requireUser(req, res) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '')
  const { data, error } = token ? await db.auth.getUser(token) : { error: true }
  if (error || !data?.user) {
    res.status(401).json({ message: 'Connecte-toi pour continuer.' })
    return null
  }
  return data.user
}
