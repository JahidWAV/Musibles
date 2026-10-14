import { useEffect } from 'react'
import { RARITIES } from '../constants'
import Card, { fmt } from './Card'

const RARITY_TEXT = {
  common: 'Un artiste à découvrir, discret mais précieux.',
  rare: 'Un nom qui compte, reflet bleu.',
  epic: 'Une pointure internationale, reflet violet.',
  legendary: 'Une légende mondiale : bordure irisée holographique.',
}

export default function CardModal({ card, onClose }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = '' }
  }, [onClose])
  if (!card) return null
  const r = RARITIES[card.rarity]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center" onClick={onClose} role="dialog" aria-modal="true" aria-label={card.name}>
      <div className={`sheet-in rar-${card.rarity} max-h-[92%] w-full max-w-md overflow-y-auto rounded-t-3xl bg-dusk p-6 sm:rounded-3xl`} onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto w-48"><Card card={card} onClick={() => {}} /></div>
        <h2 className="mt-5 text-center font-display text-3xl font-extrabold">{card.name}</h2>
        <p className="mt-1 text-center font-bold" style={{ color: 'var(--c)' }}>{r.label}</p>
        <p className="mt-1 text-center text-sm text-mist">{RARITY_TEXT[card.rarity]}</p>
        <dl className="mt-5 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-2xl bg-night p-3"><dt className="text-xs text-mist">Auditeurs</dt><dd className="font-display text-xl font-extrabold">{fmt(card.listeners)}</dd></div>
          <div className="rounded-2xl bg-night p-3"><dt className="text-xs text-mist">Écoutes</dt><dd className="font-display text-xl font-extrabold">{fmt(card.playcount)}</dd></div>
        </dl>
        {card.tags?.length > 0 && (
          <p className="mt-4 flex flex-wrap justify-center gap-2">
            {card.tags.map((t) => <span key={t} className="rounded-full bg-plum px-3 py-1 text-xs">{t}</span>)}
          </p>
        )}
        {card.bio && <p className="mt-4 text-sm leading-relaxed text-mist">{card.bio.slice(0, 260)}{card.bio.length > 260 ? '…' : ''}</p>}
        <div className="mt-6 flex gap-3">
          {card.url && <a href={card.url} target="_blank" rel="noreferrer" className="flex-1 rounded-2xl bg-plum py-3 text-center font-semibold">Voir sur Last.fm</a>}
          <button onClick={onClose} className="flex-1 rounded-2xl bg-honey py-3 font-bold text-night">Fermer</button>
        </div>
      </div>
    </div>
  )
}
