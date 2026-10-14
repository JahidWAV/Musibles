import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// null si les variables d'environnement sont absentes (l'app affiche alors un message)
export const supabase = url && key ? createClient(url, key) : null
