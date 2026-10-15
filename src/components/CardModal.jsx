import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AUCTION_DURATIONS, AUCTION_FEE, CARD_TYPES, CURRENCY, DEPARTMENTS, RARITIES, SCRAP_VALUES,
  fmtNum, rarityOf, tmdbUrl, typeOf,
} from '../constants'
import Card, { fmt } from './Card'

const RARITY_TEXT = {
  common: 'Une carte du catalogue, discrète mais précieuse.',
  rare: 'Un titre qui compte, serti d’un reflet cyan.',
  epic: 'Une référence du cinéma mondial, aux reflets violets.',
  legendary: 'Un monument du grand écran : cadre doré holographique.',
}

const Stat = ({ label, value }) => (
  <div className="border border-[var(--hair)] px-4 py-3">
    <dt className="text-[.65rem] uppercase tracking-[.2em] text-mist">{label}</dt>
    <dd className="title mt-1 text-2xl text-gold-300">{value}</dd>
  </div>
)

export default function CardModal({ card, onClose, onScrap, onAuction }) {
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
      {card && <Sheet key={card.key || card.id} card={card} onClose={onClose} onScrap={onScrap} onAuction={onAuction} />}
    </AnimatePresence>
  )
}

// ───────── Panneau « Recycler » ─────────
function ScrapPanel({ card, max, onBack, onConfirm }) {
  const unit = SCRAP_VALUES[rarityOf(card)]
  const [qty, setQty] = useState(1)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function go() {
    setBusy(true); setErr('')
    try { await onConfirm(card, qty) } catch (e) { setErr(e.message); setBusy(false) }
  }

  return (
    <div className="mt-8 border border-[var(--hair)] p-5 text-left">
      <p className="title text-2xl text-ivory">Recycler</p>
      <p className="mt-1 text-sm text-mist">
        Chaque exemplaire rapporte <span className="text-gold-300">{fmtNum(unit)} {CURRENCY}</span>. L’opération est définitive.
      </p>

      {max > 1 && (
        <div className="mt-4 flex items-center gap-4">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Moins" className="btn !px-4 !py-2">−</button>
          <span className="title w-10 text-center text-2xl tabular-nums">{qty}</span>
          <button onClick={() => setQty((q) => Math.min(max, q + 1))} disabled={qty >= max} aria-label="Plus" className="btn !px-4 !py-2">+</button>
          <button onClick={() => setQty(max - 1 || 1)} className="ml-auto text-xs text-mist underline underline-offset-4 hover:text-gold-300">Garder 1 exemplaire</button>
        </div>
      )}

      {qty >= max && <p className="mt-3 text-sm text-rose">C’est ta dernière copie : elle disparaîtra de l’album.</p>}
      {err && <p role="alert" className="mt-3 text-sm text-rose">{err}</p>}

      <div className="mt-5 flex gap-3">
        <button onClick={onBack} disabled={busy} className="btn flex-1">Retour</button>
        <button onClick={go} disabled={busy} className="btn btn-fill flex-1">{busy ? '…' : `+ ${fmtNum(unit * qty)} ${CURRENCY}`}</button>
      </div>
    </div>
  )
}

// ───────── Panneau « Mettre aux enchères » ─────────
function AuctionPanel({ card, onBack, onConfirm }) {
  const unit = SCRAP_VALUES[rarityOf(card)]
  const [price, setPrice] = useState(unit * 2)
  const [hours, setHours] = useState(24)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function go() {
    setBusy(true); setErr('')
    try { await onConfirm(card, { price: Number(price), hours }) } catch (e) { setErr(e.message); setBusy(false) }
  }

  return (
    <div className="mt-8 border border-[var(--hair)] p-5 text-left">
      <p className="title text-2xl text-ivory">Mettre aux enchères</p>
      <p className="mt-1 text-sm text-mist">
        Un exemplaire est proposé. Commission de {Math.round(AUCTION_FEE * 100)} % sur le prix final ; sans offre, la carte te revient.
      </p>

      <label htmlFor="start-price" className="mt-4 block text-[.65rem] uppercase tracking-[.2em] text-mist">Mise de départ ({CURRENCY})</label>
      <input id="start-price" type="number" inputMode="numeric" min="1" step="1" className="field tabular-nums" value={price} onChange={(e) => setPrice(e.target.value)} />

      <p className="mt-4 text-[.65rem] uppercase tracking-[.2em] text-mist">Durée</p>
      <div className="mt-2 flex gap-2">
        {AUCTION_DURATIONS.map((d) => (
          <button
            key={d.hours}
            onClick={() => setHours(d.hours)}
            aria-pressed={hours === d.hours}
            className={`flex-1 border py-2 text-sm transition-colors ${hours === d.hours ? 'border-gold-500 text-gold-300' : 'border-white/10 text-mist hover:text-ivory'}`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {err && <p role="alert" className="mt-3 text-sm text-rose">{err}</p>}

      <div className="mt-5 flex gap-3">
        <button onClick={onBack} disabled={busy} className="btn flex-1">Retour</button>
        <button onClick={go} disabled={busy || !(Number(price) >= 1)} className="btn btn-fill flex-1">{busy ? '…' : 'Lancer l’enchère'}</button>
      </div>
    </div>
  )
}

function Sheet({ card, onClose, onScrap, onAuction }) {
  const [panel, setPanel] = useState(null) // null | 'scrap' | 'auction'
  const rarityKey = rarityOf(card)
  const isMovie = typeOf(card) === 'movie'
  const type = CARD_TYPES[isMovie ? 'movie' : 'person']
  const name = card.title || card.name || 'Inconnu'
  const owned = card.count ?? 1
  const canAct = typeof onScrap === 'function'

  const rating = card.vote_average ?? card.rating
  const votes = card.vote_count ?? card.votes
  const year = card.year || (card.release_date ? new Date(card.release_date).getFullYear() : '—')

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 backdrop-blur-sm md:items-center md:p-10"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={name}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        data-rarity={rarityKey}
        className="sheet relative max-h-[94%] w-full max-w-md overflow-y-auto p-6 md:max-h-full md:max-w-4xl md:p-12"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <div className="sheet-spot" />
        <button onClick={onClose} aria-label="Fermer" className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center text-xl font-light text-mist transition-colors hover:text-ivory">✕</button>

        <div className="relative flex flex-col items-center gap-8 md:flex-row md:items-start md:gap-14">
          <div className="w-52 shrink-0 md:w-72">
            <Card card={card} />
            {owned > 1 && <p className="mt-3 text-center text-xs text-mist">{owned} exemplaires</p>}
          </div>

          <div className="w-full text-center md:text-left">
            <p className="text-[.7rem] font-medium uppercase tracking-[.24em]" style={{ color: 'var(--c)' }}>
              {type.label} · {RARITIES[rarityKey].label}
            </p>
            <h2 className="title mt-2 text-4xl leading-[1.05] text-ivory md:text-5xl">{name}</h2>
            <p className="mt-3 text-sm text-mist">{RARITY_TEXT[rarityKey]}</p>
            <div className="hairline my-6" />

            <dl className="grid grid-cols-2 gap-3 text-left">
              {isMovie ? (
                <>
                  <Stat label="Note" value={rating != null ? `${Number(rating).toFixed(1).replace('.', ',')} / 10` : '—'} />
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

            {isMovie && card.overview && !panel && (
              <p className="mt-6 max-w-prose text-left text-sm leading-relaxed text-mist">
                {card.overview.slice(0, 260)}
                {card.overview.length > 260 ? '…' : ''}
              </p>
            )}

            {panel === 'scrap' && <ScrapPanel card={card} max={owned} onBack={() => setPanel(null)} onConfirm={onScrap} />}
            {panel === 'auction' && <AuctionPanel card={card} onBack={() => setPanel(null)} onConfirm={onAuction} />}

            {!panel && (
              <div className="mt-8 space-y-3">
                {canAct && (
                  <div className="flex gap-3">
                    <button onClick={() => setPanel('scrap')} className="btn flex-1">Recycler · +{fmtNum(SCRAP_VALUES[rarityKey])}</button>
                    <button onClick={() => setPanel('auction')} className="btn flex-1">Enchères</button>
                  </div>
                )}
                <div className="flex gap-3">
                  <a href={tmdbUrl(card)} target="_blank" rel="noreferrer" className="btn flex-1">Voir sur TMDB</a>
                  <button onClick={onClose} className="btn btn-fill flex-1">Fermer</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
