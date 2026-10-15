import { db, requireUser } from './_lib/db.js'
import { AUCTION_HOURS, CARD_TYPE_KEYS, RARITY_KEYS, fail, getBalance, minBid, settle } from './_lib/market.js'

const COLUMNS =
  'id, seller_id, card_type, card_id, rarity, snapshot, start_price, current_bid, high_bidder_id, bid_count, ends_at'

// L'identité des enchérisseurs n'est jamais exposée : seulement « mine » / « winning »
const toAuction = (a, userId) => ({
  id: a.id,
  card_type: a.card_type,
  card_id: a.card_id,
  rarity: a.rarity,
  snapshot: a.snapshot,
  start_price: Number(a.start_price),
  current_bid: a.current_bid == null ? null : Number(a.current_bid),
  bid_count: a.bid_count,
  ends_at: a.ends_at,
  min_bid: minBid(a),
  mine: a.seller_id === userId,
  winning: a.high_bidder_id === userId,
})

export default async function handler(req, res) {
  const user = await requireUser(req, res)
  if (!user) return

  // ───────── GET /api/auctions?view=all|selling|bidding ─────────
  if (req.method === 'GET') {
    const settled = await settle()
    const view = req.query?.view

    let q = db.from('auctions').select(COLUMNS).eq('status', 'active').order('ends_at', { ascending: true }).limit(120)
    if (view === 'selling') q = q.eq('seller_id', user.id)
    if (view === 'bidding') q = q.eq('high_bidder_id', user.id)

    const { data, error } = await q
    if (error) return fail(res, error)

    return res.json({
      auctions: (data || []).map((a) => toAuction(a, user.id)),
      balance: await getBalance(user.id),
      settled,
    })
  }

  if (req.method !== 'POST') return res.status(405).json({ message: 'Méthode non autorisée.' })

  const { action } = req.body || {}

  // ───────── create : { type, id, rarity, price, hours } ─────────
  if (action === 'create') {
    const { type, id, rarity, price, hours } = req.body
    const p = Math.floor(Number(price))
    const h = Number(hours)
    if (!CARD_TYPE_KEYS.has(type) || !id || !RARITY_KEYS.has(rarity) || !(p >= 1 && p <= 1_000_000_000) || !AUCTION_HOURS.includes(h)) {
      return res.status(400).json({ message: 'Requête invalide.' })
    }
    const { data, error } = await db.rpc('create_auction', {
      p_user: user.id,
      p_card_type: type,
      p_card_id: String(id),
      p_rarity: rarity,
      p_start_price: p,
      p_hours: h,
    })
    if (error) return fail(res, error)
    return res.json({ id: data })
  }

  // ───────── bid : { auctionId, amount } ─────────
  if (action === 'bid') {
    const { auctionId, amount } = req.body
    const amt = Math.floor(Number(amount))
    if (!auctionId || !(amt >= 1)) return res.status(400).json({ message: 'Offre invalide.' })

    await settle() // une enchère déjà terminée doit être refusée proprement
    const { data, error } = await db.rpc('place_bid', { p_user: user.id, p_auction: auctionId, p_amount: amt })
    if (error) return fail(res, error)

    const row = Array.isArray(data) ? data[0] : data
    return res.json({
      current_bid: Number(row.out_current),
      ends_at: row.out_ends_at,
      balance: Number(row.out_balance),
    })
  }

  // ───────── cancel : { auctionId } ─────────
  if (action === 'cancel') {
    const { auctionId } = req.body
    if (!auctionId) return res.status(400).json({ message: 'Requête invalide.' })
    const { error } = await db.rpc('cancel_auction', { p_user: user.id, p_auction: auctionId })
    if (error) return fail(res, error)
    return res.json({ ok: true })
  }

  return res.status(400).json({ message: 'Action inconnue.' })
}
