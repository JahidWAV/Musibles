import { supabase } from './supabase'

// Même authentification que tes autres appels : jeton Supabase en « Bearer ».
// Si ton services/api.js a déjà un helper équivalent, tu peux le réutiliser à la place de call().
async function call(path, { method = 'GET', body } = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || 'Erreur réseau, réessaie.')
  return json
}

// Une carte de l'album → l'identité attendue par l'API
const ref = (card) => ({
  type: card.type || card.card_type || 'movie',
  id: card.id,
  rarity: card.rarity,
})

export const fetchWallet = () => call('/api/wallet')

export const scrapCards = (card, quantity = 1) =>
  call('/api/scrap', { method: 'POST', body: { ...ref(card), quantity } })

export const fetchAuctions = (view = 'all') => call(`/api/auctions?view=${encodeURIComponent(view)}`)

export const createAuction = (card, { price, hours }) =>
  call('/api/auctions', { method: 'POST', body: { action: 'create', ...ref(card), price, hours } })

export const placeBid = (auctionId, amount) =>
  call('/api/auctions', { method: 'POST', body: { action: 'bid', auctionId, amount } })

export const cancelAuction = (auctionId) =>
  call('/api/auctions', { method: 'POST', body: { action: 'cancel', auctionId } })
