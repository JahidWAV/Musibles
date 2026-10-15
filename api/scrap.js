import { db, requireUser } from './_lib/db.js'
import { CARD_TYPE_KEYS, RARITY_KEYS, fail } from './_lib/market.js'

// POST { type: 'movie'|'person', id: 'movie-872585' | '872585', rarity, quantity }
// → { gained, scrapped, balance }
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Méthode non autorisée.' })
  const user = await requireUser(req, res)
  if (!user) return

  const { type, id, rarity, quantity = 1 } = req.body || {}
  const qty = Math.floor(Number(quantity))
  if (!CARD_TYPE_KEYS.has(type) || !id || !RARITY_KEYS.has(rarity) || !(qty >= 1 && qty <= 500)) {
    return res.status(400).json({ message: 'Requête invalide.' })
  }

  const { data, error } = await db.rpc('scrap_cards', {
    p_user: user.id,
    p_card_type: type,
    p_card_id: String(id),
    p_rarity: rarity,
    p_qty: qty,
  })
  if (error) return fail(res, error)

  const row = Array.isArray(data) ? data[0] : data
  return res.json({
    gained: Number(row.out_gained),
    scrapped: Number(row.out_scrapped),
    balance: Number(row.out_balance),
  })
}
