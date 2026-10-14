import React from 'react'

// Utilitaire de formatage pour l'affichage des grands nombres (ex: 12500 -> 12,5k)
export const fmt = (n) => {
  if (n == null || isNaN(n)) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k'
  return String(Math.round(n))
}

const RARITY_STYLES = {
  legendary: {
    border: 'border-2 border-amber-400',
    glow: 'shadow-[0_0_25px_rgba(245,158,11,0.4)]',
    badge: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-black font-black',
    label: 'LÉGENDAIRE',
  },
  epic: {
    border: 'border-2 border-purple-500',
    glow: 'shadow-[0_0_20px_rgba(168,85,247,0.35)]',
    badge: 'bg-purple-600 text-white font-bold',
    label: 'ÉPIQUE',
  },
  rare: {
    border: 'border-2 border-cyan-500',
    glow: 'shadow-[0_0_15px_rgba(6,182,212,0.25)]',
    badge: 'bg-cyan-600 text-white font-bold',
    label: 'RARE',
  },
  common: {
    border: 'border border-slate-700',
    glow: 'shadow-lg',
    badge: 'bg-slate-800 text-slate-300 font-medium',
    label: 'COMMUNE',
  },
}

export default function Card({ card, locked = false, count = 1, onClick }) {
  if (!card) return null

  const isMovie = card.type === 'movie' || card.card_type === 'movie'
  const rarityKey = card.rarity?.toLowerCase() || 'common'
  const style = RARITY_STYLES[rarityKey] || RARITY_STYLES.common

  // Titre & visuel selon le type (film vs personne)
  const title = card.title || card.name || 'Inconnu'
  const image = card.poster || card.profile_path || card.poster_path
  const imageSrc = image ? (image.startsWith('http') ? image : `https://image.tmdb.org/t/p/w500${image}`) : '/placeholder-card.png'
  const subtitle = isMovie ? (card.release_date ? new Date(card.release_date).getFullYear() : 'Film') : (card.known_for_department || 'Acteur')

  return (
    <div
      onClick={onClick}
      className={`group relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-slate-900 transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.02] cursor-pointer ${style.border} ${style.glow} ${locked ? 'grayscale opacity-40 hover:opacity-60' : ''}`}
    >
      {/* Arrière-plan Image */}
      <img
        src={imageSrc}
        alt={title}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />

      {/* Dégradé sombre pour la lisibilité */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent opacity-90" />

      {/* En-tête : Badge Rareté & Type */}
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 z-10">
        <span className={`rounded-md px-2 py-0.5 text-[10px] tracking-wider uppercase ${style.badge}`}>
          {style.label}
        </span>
        <span className="rounded-md bg-black/60 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-semibold text-slate-200 border border-white/10">
          {isMovie ? '🎬 Film' : '👤 Star'}
        </span>
      </div>

      {/* Badge Exemplaires multiples (ex: x3) */}
      {!locked && count > 1 && (
        <div className="absolute top-10 right-2 z-10 rounded-full bg-amber-500 text-black font-extrabold text-xs px-2 py-0.5 shadow-md">
          x{count}
        </div>
      )}

      {/* Contenu bas de carte */}
      <div className="absolute bottom-0 inset-x-0 p-3 z-10 flex flex-col gap-1">
        <span className="text-[11px] font-medium text-amber-400 tracking-wide uppercase">
          {subtitle}
        </span>
        <h3 className="font-display font-bold text-sm text-white leading-tight line-clamp-2 group-hover:text-amber-300 transition-colors">
          {title}
        </h3>

        {/* Stats (Note ou Popularité) */}
        <div className="mt-1 flex items-center justify-between border-t border-white/10 pt-1.5 text-[11px] text-slate-300">
          {isMovie ? (
            <span className="flex items-center gap-1 font-semibold text-yellow-400">
              ★ {card.vote_average ?? card.rating ? Number(card.vote_average ?? card.rating).toFixed(1) : 'N/A'}
            </span>
          ) : (
            <span className="flex items-center gap-1 font-semibold text-cyan-400">
              🔥 {Math.round(card.popularity || 0)} pts
            </span>
          )}
          <span className="text-[10px] text-slate-400 uppercase">Cineclub</span>
        </div>
      </div>
    </div>
  )
}
