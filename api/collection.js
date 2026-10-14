import { db, requireUser } from './_lib/db.js'
import { toCard } from './_lib/cards.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Méthode non autorisée.' })
  const user = await requireUser(req, res)
  if (!user) return

  try {
    // 1. On récupère tout l'inventaire avec le snapshot et la rareté directement stockés
    const { data: inventory, error: invError } = await db
      .from('user_inventory')
      .select('card_type, card_id, rarity, snapshot, acquired_at')
      .eq('user_id', user.id)
      .order('acquired_at', { ascending: true })

    if (invError) throw invError

    // 2. Construction de l'inventaire enrichi
    const collection = {}
    for (const row of inventory) {
      const key = `${row.card_type}:${row.card_id}`

      if (collection[key]) {
        collection[key].count += 1
      } else {
        collection[key] = toCard({
          ...row,
          copies: 1,
          is_new: false,
        })
      }
    }

    const known = []

    return res.json({ collection, known })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Impossible de charger la collection.' })
  }
}
