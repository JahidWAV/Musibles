import { db, requireUser } from './_lib/db.js'
import { toCard } from './_lib/cards.js'

// PostgREST plafonne à 1000 lignes par requête : on pagine.
async function fetchAll(build) {
  const out = []
  const size = 1000
  for (let from = 0; ; from += size) {
    const { data, error } = await build().range(from, from + size - 1)
    if (error) throw error
    out.push(...data)
    if (data.length < size) break
  }
  return out
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Méthode non autorisée.' })
  const user = await requireUser(req, res)
  if (!user) return

  try {
    const [inventory, catalog] = await Promise.all([
      // 1. On récupère l'inventaire brut de l'utilisateur
      fetchAll(() =>
        db.from('user_inventory')
          .select('card_type, card_id, acquired_at')
          .eq('user_id', user.id)
          .order('acquired_at', { ascending: true })),
      
      // 2. On récupère le catalogue global pour avoir les détails des cartes
      fetchAll(() =>
        db.from('cards_catalog')
          .select('*')
          .order('card_type', { ascending: true })
          .order('card_id', { ascending: true })),
    ])

    // Création d'une Map pour associer rapidement les données du catalogue à l'inventaire
    const catalogMap = new Map(catalog.map((c) => [`${c.card_type}:${c.card_id}`, c]))

    // Construction de l'inventaire enrichi (une entrée par carte unique, avec le nombre de copies)
    const collection = {}
    for (const row of inventory) {
      const key = `${row.card_type}:${row.card_id}`
      const catalogData = catalogMap.get(key) || {}

      if (collection[key]) {
        collection[key].count += 1
      } else {
        collection[key] = toCard({
          ...row,
          ...catalogData, // On injecte les infos visuelles et textuelles du catalogue
          copies: 1,
          is_new: false,
        })
      }
    }

    const known = catalog.map((c) => ({
      key: `${c.card_type}:${c.card_id}`,
      type: c.card_type,
      id: c.card_id,
      rarity: c.rarity,
      popularity: Number(c.popularity) || 0,
      title: c.title || c.name, // Support des deux formats (films/acteurs)
      poster: c.poster || c.profile_path,
    }))

    return res.json({ collection, known })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Impossible de charger la collection.' })
  }
}
