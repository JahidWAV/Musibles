import { db, requireUser } from './_lib/db.js'
import { toCard } from './_lib/cards.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Méthode non autorisée.' })
  const user = await requireUser(req, res)
  if (!user) return

  try {
    // 1. On récupère uniquement l'inventaire de l'utilisateur (rapide)
    const { data: inventory, error: invError } = await db
      .from('user_inventory')
      .select('card_type, card_id, acquired_at')
      .eq('user_id', user.id)
      .order('acquired_at', { ascending: true })

    if (invError) throw invError

    // 2. Pour éviter de télécharger tout le catalogue à chaque fois, 
    // on récupère uniquement les entrées du catalogue qui correspondent aux cartes possédées par l'utilisateur
    // (ou une liste limitée/paginée si tu veux afficher le catalogue complet)
    const uniqueCards = [...new Map(inventory.map(item => [`${item.card_type}:${item.card_id}`, item])).values()]

    let catalogMap = new Map()

    if (uniqueCards.length > 0) {
      // On va chercher uniquement les métadonnées des cartes que l'utilisateur possède déjà
      // (Pour un affichage complet du catalogue, il vaudra mieux le charger une seule fois côté client)
      const orQuery = uniqueCards.map(c => `and(card_type.eq.${c.card_type},card_id.eq.${c.card_id})`).join(',')
      
      const { data: catalogSubset, error: catError } = await db
        .from('cards_catalog')
        .select('*')
        .or(orQuery)

      if (!catError && catalogSubset) {
        catalogMap = new Map(catalogSubset.map(c => [`${c.card_type}:${c.card_id}`, c]))
      }
    }

    // 3. Construction de l'inventaire enrichi
    const collection = {}
    for (const row of inventory) {
      const key = `${row.card_type}:${row.card_id}`
      const catalogData = catalogMap.get(key) || {}

      if (collection[key]) {
        collection[key].count += 1
      } else {
        collection[key] = toCard({
          ...row,
          ...catalogData,
          copies: 1,
          is_new: false,
        })
      }
    }

    // Pour le catalogue global (known), on renvoie une liste allégée ou vide pour l'instant pour éviter le timeout
    const known = []

    return res.json({ collection, known })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Impossible de charger la collection.' })
  }
}
