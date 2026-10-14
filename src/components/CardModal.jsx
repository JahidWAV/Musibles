import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CARD_TYPES, DEPARTMENTS, RARITIES, rarityOf, tmdbUrl, typeOf } from '../constants'
import Card, { fmt } from './Card'

const RARITY_TEXT = {
  common: 'Une carte du catalogue, discrète mais précieuse.',
  rare: 'Un titre qui compte, serti d’un reflet cyan.',
  epic: 'Une référence du cinéma mondial, aux reflets violets.',
  legendary: 'Un monument du grand écran : cadre doré holographique.',
}

const Stat = ({ label, value }) => (
  <div className="rounded-2xl bg-white/[0.035] p-3 ring-1 ring-white/10">
    <dt className="text-xs text-mist">{label}</dt>
    <dd className="mt-0.5 font-display text-xl font-bold text-gold-300">{value}</dd>
  </div>
)

export default function CardModal({ card, onClose }) {
  useEffect(() => {
    if (!card) return
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', h)
      document.body.style.overflow = ''
    }
  }, [card, onClose])

  return (
    <AnimatePresence>
      {card && <Sheet key={card.key || card.id} card={card} onClose={onClose} />}
    </AnimatePresence>
  )
}

function Sheet({ card, onClose }) {
  const rarityKey = rarityOf(card)
  const isMovie = typeOf(card) === 'movie'
  const type = CARD_TYPES[isMovie ? 'movie' : 'person']
  const name = card.title || card.name || 'Inconnu'

  const rating = card.vote_average ?? card.rating
  const votes = card.vote_count ?? card.votes
  const year = card.year || (card.release_date ? new Date(card.release_date).getFullYear() : '—')

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={name}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        data-rarity={rarityKey}
        className="sheet relative max-h-[92%] w-full max-w-md overflow-y-auto rounded-t-3xl p-6 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 80, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      >
        <div className="sheet-spot" />
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/5 text-lg text-mist ring-1 ring-white/10 hover:text-white"
        >
          ✕
        </button>

        <div className="relative mx-auto w-52">
          <Card card={card} />
        </div>

        <h2 className="relative mt-6 text-center font-display text-2xl font-bold leading-tight text-ivory">{name}</h2>
        <p className="relative mt-1.5 text-center text-sm font-bold tracking-wide" style={{ color: 'var(--c)' }}>
          {type.icon} {type.label} · {RARITIES[rarityKey].label}
        </p>
        <p className="relative mt-1 text-center text-sm text-mist">{RARITY_TEXT[rarityKey]}</p>

        <dl className="relative mt-5 grid grid-cols-2 gap-3 text-center">
          {isMovie ? (
            <>
              <Stat label="Note" value={rating != null ? `${Number(rating).toFixed(1)}/10` : '—'} />
              <Stat label="Votes" value={fmt(votes)} />
              <Stat label="Sortie" value={year} />
              <Stat label="Popularité" value={fmt(Math.round(card.popularity || 0))} />
            </>
          ) : (
            <>
              <Stat label="Métier" value={DEPARTMENTS[card.department || card.known_for_department] || 'Personnalité'} />
              <Stat label="Popularité" value={fmt(Math.round(card.popularity || 0))} />
            </>
          )}
        </dl>

        {isMovie && card.overview && (
          <p className="relative mt-5 text-sm leading-relaxed text-mist">
            {card.overview.slice(0, 260)}
            {card.overview.length > 260 ? '…' : ''}
          </p>
        )}

        <div className="relative mt-6 flex gap-3">
          <a
            href={tmdbUrl(card)}
            target="_blank"
            rel="noreferrer"
            className="flex-1 rounded-2xl bg-white/5 py-3 text-center font-semibold ring-1 ring-gold-500/30 transition hover:bg-gold-500/10"
          >
            Voir sur TMDB
          </a>
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl bg-gradient-to-b from-gold-300 to-gold-600 py-3 font-bold text-black shadow-gold-sm transition active:scale-[.98]"
          >
            Fermer
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
