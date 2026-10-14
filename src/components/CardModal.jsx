import { useEffect } from 'react'
import { RARITIES, CARD_TYPES, DEPARTMENTS, tmdbUrl } from '../constants'
import Card, { fmt } from './Card'

const RARITY_TEXT = {
  common: 'Une carte du catalogue, discrète mais précieuse.',
  rare: 'Un titre qui compte, reflet bleu.',
  epic: 'Une référence du cinéma mondial, reflet violet.',
  legendary: 'Un monument du grand écran : bordure irisée holographique.',
}

const Stat = ({ label, value }) => (
  <div className="rounded-2xl bg-night p-3"><dt className="text-xs text-mist">{label}</dt><dd className="font-display text-xl font-extrabold">{value}</dd></div>
)

export default function CardModal({ card, onClose }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = '' }
  }, [onClose])
  if (!card) return null
  const r = RARITIES[card.rarity]
  const type = CARD_TYPES[card.type]
  const isMovie = card.type === 'movie'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center" onClick={onClose} role="dialog" aria-modal="true" aria-label={card.name}>
      <div className={`sheet-in rar-${card.rarity} max-h-[92%] w-full max-w-md overflow-y-auto rounded-t-3xl bg-dusk p-6 sm:rounded-3xl`} onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto w-48"><Card card={card} onClick={() => {}} /></div>
        <h2 className="mt-5 text-center font-display text-3xl font-extrabold">{card.name}</h2>
        <p className="mt-1 text-center font-bold" style={{ color: 'var(--c)' }}>{type.icon} {type.label} · {r.label}</p>
        <p className="mt-1 text-center text-sm text-mist">{RARITY_TEXT[card.rarity]}</p>
        <dl className="mt-5 grid grid-cols-2 gap-3 text-center">
          {isMovie ? (
            <>
              <Stat label="Note" value={card.rating != null ? `${card.rating.toFixed(1)}/10` : '—'} />
              <Stat label="Votes" value={fmt(card.votes)} />
              <Stat label="Sortie" value={card.year || '—'} />
              <Stat label="Popularité" value={fmt(Math.round(card.popularity))} />
            </>
          ) : (
            <>
              <Stat label="Métier" value={DEPARTMENTS[card.department] || 'Personnalité'} />
              <Stat label="Popularité" value={fmt(Math.round(card.popularity))} />
            </>
          )}
        </dl>
        {isMovie && card.overview && (
          <p className="mt-4 text-sm leading-relaxed text-mist">{card.overview.slice(0, 260)}{card.overview.length > 260 ? '…' : ''}</p>
        )}
        <div className="mt-6 flex gap-3">
          <a href={tmdbUrl(card)} target="_blank" rel="noreferrer" className="flex-1 rounded-2xl bg-plum py-3 text-center font-semibold">Voir sur TMDB</a>
          <button onClick={onClose} className="flex-1 rounded-2xl bg-honey py-3 font-bold text-night">Fermer</button>
        </div>
      </div>
    </div>
  )
}
