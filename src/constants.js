export const RARITIES = {
  common: { id: 'common', label: 'Commune', color: '#8b8678' },
  rare: { id: 'rare', label: 'Rare', color: '#22d3ee' },
  epic: { id: 'epic', label: 'Épique', color: '#a855f7' },
  legendary: { id: 'legendary', label: 'Légendaire', color: '#fbbf24' },
}

export const CARD_TYPES = {
  movie: { id: 'movie', label: 'Film', plural: 'Films', icon: '🎬' },
  person: { id: 'person', label: 'Star', plural: 'Stars', icon: '⭐' },
}

export const DEPARTMENTS = {
  Acting: 'Acteur',
  Directing: 'Réalisateur',
  Writing: 'Scénariste',
  Production: 'Producteur',
}

// ───────── Économie ─────────
export const CURRENCY = 'bobines'
// Valeur de recyclage : doit rester identique à scrap_value() dans market.sql
export const SCRAP_VALUES = { common: 1, rare: 10, epic: 100, legendary: 1000 }
export const AUCTION_FEE = 0.05 // commission sur les ventes
export const AUCTION_DURATIONS = [
  { hours: 6, label: '6 h' },
  { hours: 12, label: '12 h' },
  { hours: 24, label: '24 h' },
  { hours: 48, label: '48 h' },
]
export const fmtNum = (n) => new Intl.NumberFormat('fr-FR').format(Number(n) || 0)

// Clé de rareté sûre (retombe sur "common")
export const rarityOf = (card) => {
  const k = card?.rarity?.toLowerCase()
  return RARITIES[k] ? k : 'common'
}

// Type sûr : 'movie' | 'person'
export const typeOf = (card) => ((card?.type || card?.card_type) === 'person' ? 'person' : 'movie')

// URL d'image TMDB, quelle que soit la forme du champ (chemin relatif, URL complète…)
export const tmdbImage = (card, size = 'w500') => {
  const raw = card?.poster || card?.poster_path || card?.profile_path || card?.profile || card?.image || card?.image_url
  if (!raw || typeof raw !== 'string') return null
  if (/^(https?:)?\/\//.test(raw) || raw.startsWith('data:')) return raw
  return `https://image.tmdb.org/t/p/${size}${raw.startsWith('/') ? raw : `/${raw}`}`
}

// 'movie-872585' -> https://www.themoviedb.org/movie/872585
export const tmdbUrl = (card) => {
  const id = String(card?.id ?? card?.key ?? '').replace(/^(movie|person)-/, '')
  return `https://www.themoviedb.org/${typeOf(card)}/${id}`
}
