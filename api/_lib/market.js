import { db } from './db.js'

export const RARITY_KEYS = new Set(['common', 'rare', 'epic', 'legendary'])
export const CARD_TYPE_KEYS = new Set(['movie', 'person'])
export const AUCTION_HOURS = [1, 6, 12, 24, 48]

// Offre minimale : mise de départ, puis +5 % (au moins +1) — même règle que place_bid en SQL
export const minBid = (a) =>
  a.current_bid == null ? Number(a.start_price) : Math.max(Number(a.current_bid) + 1, Math.ceil(Number(a.current_bid) * 1.05))

// Règle les enchères terminées ; renvoie le nombre d'enchères réglées (0 si erreur, on ne bloque jamais l'API)
export async function settle() {
  const { data, error } = await db.rpc('settle_due_auctions')
  if (error) {
    console.error('[market] settle', error)
    return 0
  }
  return Number(data) || 0
}

export async function getBalance(userId) {
  const { data, error } = await db.from('wallets').select('balance').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return Number(data?.balance) || 0
}

const MESSAGES = {
  not_owned: [404, 'Tu ne possèdes plus cette carte, ou elle est déjà aux enchères.'],
  invalid_request: [400, 'Requête invalide.'],
  insufficient_funds: [400, 'Pas assez de bobines.'],
  auction_closed: [409, 'Cette enchère est terminée.'],
  own_auction: [400, 'Tu ne peux pas enchérir sur ta propre vente.'],
  already_highest: [400, 'Tu as déjà la meilleure offre.'],
  not_found: [404, 'Enchère introuvable.'],
  too_many_auctions: [400, 'Maximum 20 enchères en même temps.'],
  cannot_cancel: [400, 'Impossible d’annuler : une offre a déjà été faite.'],
}

// Traduit les exceptions SQL en réponses HTTP lisibles
export function fail(res, error) {
  const m = error?.message || ''
  const low = m.match(/bid_too_low:(\d+)/)
  if (low) return res.status(400).json({ message: `Offre trop basse : minimum ${low[1]} bobines.`, min_bid: Number(low[1]) })
  for (const [code, [status, message]] of Object.entries(MESSAGES)) {
    if (m.includes(code)) return res.status(status).json({ message })
  }
  console.error('[market]', error)
  return res.status(500).json({ message: 'Une erreur est survenue, réessaie.' })
}
