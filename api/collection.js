import { db, requireUser } from './_lib/db.js'

// Fonction utilitaire pour transformer l'artiste de Supabase au format carte du TCG
function toCard(artist) {
  return {
    id: artist.id,
    name: artist.name,
    listeners: artist.listeners,
    rarity: artist.rarity,
    // Tu peux ajouter ici les propriétés additionnelles de tes cartes si besoin
  }
}

// PostgREST plafonne à 1000 lignes par requête : on pagine pour récupérer les artistes
async function allKnown() {
  const out = []
  for (let from = 0; from < 10000; from += 1000) {
    const { data, error } = await db.from('artists').select('id,name,listeners,rarity').order('listeners', { ascending: false }).range(from, from + 999)
    if (error) throw error
    out.push(...data)
    if (data.length < 1000) break
  }
  return out
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Méthode non autorisée.' })
  const user = await requireUser(req, res)
  if (!user) return
  try {
    const { data, error } = await db.from('collection').select('copies, artists(*)').eq('user_id', user.id)
    if (error) throw error
    const collection = Object.fromEntries(data.map((r) => [r.artists.id, { ...toCard(r.artists), count: r.copies }]))
    res.setHeader('Cache-Control', 'no-store')
    return res.json({ collection, known: await allKnown() })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Impossible de charger ton album.' })
  }
}
