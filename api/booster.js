import { db, requireUser } from './_lib/db.js'
import { BOOSTER_SIZE } from './_lib/config.js'
import { toCard } from './_lib/cards.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Méthode non autorisée.' })
  const user = await requireUser(req, res)
  if (!user) return

  const cooldown = Number(process.env.BOOSTER_COOLDOWN_SECONDS) || 0
  const { data, error } = await db.rpc('open_booster_for', {
    p_user: user.id,
    p_cooldown: cooldown,
    p_size: BOOSTER_SIZE,
  })

  if (error) {
    if (error.message?.includes('cooldown')) {
      return res.status(429).json({ message: `Patiente ${cooldown} s entre deux boosters.` })
    }
    console.error(error)
    return res.status(500).json({ message: 'Impossible de tirer des cartes, réessaie.' })
  }

  return res.json({ cards: data.map(toCard) })
}
