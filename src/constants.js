export const RARITIES = {
  common: { id: 'common', label: 'Commune' },
  rare: { id: 'rare', label: 'Rare' },
  epic: { id: 'epic', label: 'Épique' },
  legendary: { id: 'legendary', label: 'Légendaire' },
}

export const CARD_TYPES = {
  movie: { id: 'movie', label: 'Film', plural: 'Films', icon: '🎬' },
  person: { id: 'person', label: 'Star', plural: 'Stars', icon: '⭐' },
}

export const DEPARTMENTS = { Acting: 'Acteur', Directing: 'Réalisateur' }

// 'movie-872585' -> https://www.themoviedb.org/movie/872585
export const tmdbUrl = (card) =>
  `https://www.themoviedb.org/${card.type}/${card.id.replace(/^(movie|person)-/, '')}`
