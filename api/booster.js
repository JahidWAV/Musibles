import { db, requireUser } from './_lib/db.js'
import { drawBooster } from './_lib/lastfm.js'
import { BOOSTER_SIZE } from './_lib/config.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Méthode non autorisée.' })
  const user = await requireUser(req, res)
  if (!user) return

  const cooldown = Number(process.env.BOOSTER_COOLDOWN_SECONDS) || 0
  const { data: allowed, error: slotError } = await db.rpc('claim_booster_slot', { p_user: user.id, p_cooldown: cooldown })
  if (slotError) { console.error(slotError); return res.status(500).json({ message: 'Erreur serveur, réessaie.' }) }
  if (!allowed) return res.status(429).json({ message: `Patiente ${cooldown} s entre deux boosters.` })

  try {
    const cards = await drawBooster(BOOSTER_SIZE)
    const { data: granted, error } = await db.rpc('grant_cards', { p_user: user.id, p_ids: cards.map((c) => c.id) })
    if (error) throw error
    const info = Object.fromEntries(granted.map((g) => [g.artist_id, g]))
    return res.json({ cards: cards.map((c) => ({ ...c, count: info[c.id].copies, isNew: info[c.id].is_new })) })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Impossible de tirer des cartes, réessaie.' })
  }
}
