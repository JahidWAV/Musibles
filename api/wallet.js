import { requireUser } from './_lib/db.js'
import { getBalance, settle } from './_lib/market.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Méthode non autorisée.' })
  const user = await requireUser(req, res)
  if (!user) return

  try {
    const settled = await settle() // une vente terminée a pu créditer le solde
    return res.json({ balance: await getBalance(user.id), settled })
  } catch (e) {
    console.error('[wallet]', e)
    return res.status(500).json({ message: 'Impossible de lire ton solde.' })
  }
}
