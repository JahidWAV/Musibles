import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { openBooster } from '../services/api'
import { rarityOf } from '../constants'
import { usePacks } from '../usePacks'
import Card from './Card'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export default function BoosterPack({ onOpened, onOpenCard }) {
  const [phase, setPhase] = useState('idle') // idle | tearing | open
  const [cards, setCards] = useState([])
  const [flipped, setFlipped] = useState([])
  const [flash, setFlash] = useState(false)
  const [error, setError] = useState('')
  const { info, setInfo, countdown } = usePacks()

  const max = info?.max ?? 10
  const empty = !!info && info.packs <= 0

  async function open() {
    setPhase('tearing'); setError('')
    try {
      // cartes déjà attribuées côté serveur ; on garantit 1,5 s de suspense minimum
      const [res] = await Promise.all([openBooster(), sleep(1500)])
      const { cards: drawn, ...stock } = res
      setInfo((prev) => ({ ...prev, ...stock })) // packs restants + prochain pack
      setFlash(true)
      await sleep(300)
      setCards(drawn); setFlipped(drawn.map(() => false)); setPhase('open')
      onOpened()
      await sleep(500)
      setFlash(false)
    } catch (e) {
      // 429 : plus de packs, le serveur renvoie le stock à jour
      if (e.status === 429 && e.data?.packs !== undefined) {
        const { message, ...stock } = e.data
        setInfo((prev) => ({ ...prev, ...stock }))
      }
      setError(e.message)
      setPhase('idle')
    }
  }

  const flip = (i) => (flipped[i] ? onOpenCard(cards[i]) : setFlipped((f) => f.map((v, j) => (j === i ? true : v))))
  const done = flipped.length > 0 && flipped.every(Boolean)
  const tearing = phase === 'tearing'

  // Un voile de lumière chaude, bref : le « changement de bobine »
  const flashLayer = (
    <AnimatePresence>
      {flash && (
        <motion.div
          key="flash"
          className="pointer-events-none fixed inset-0 z-[80] bg-[#ece6d8]"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.55, 0.4] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        />
      )}
    </AnimatePresence>
  )

  if (phase !== 'open') {
    return (
      <div className="relative flex h-full flex-col items-center justify-center gap-10 overflow-hidden px-6 text-center">
        <div className="beam" />
        <motion.div
          className="relative"
          animate={{ scale: tearing ? 1.08 : 1 }}
          transition={{ duration: 1.5, ease: 'easeIn' }}
        >
          <div className={`pack ${tearing ? 'shake' : ''}`}>
            <div className="pack-sheen" />
            <div className="pack-emblem" aria-hidden="true">◆</div>
            <div className="pack-name">CINECLUB</div>
            <div className="pack-sub">Booster · 5 cartes</div>
          </div>
        </motion.div>

        <div className="relative space-y-5">
          <div>
            <p className="title text-2xl text-ivory">
              {info ? info.packs : '…'} <span className="text-mist">/ {max} packs</span>
            </p>
            <p className="mt-1 text-sm text-mist" aria-live="polite">
              {!info
                ? 'Chargement…'
                : info.packs >= max
                  ? 'Stock plein'
                  : countdown
                    ? `Prochain pack dans ${countdown}`
                    : 'Un pack arrive…'}
            </p>
          </div>
          <p className="text-sm text-mist">Cinq cartes, films et stars, tirées au hasard.</p>
          <button onClick={open} disabled={tearing || !info || empty} className="btn btn-fill">
            {tearing ? 'Ouverture…' : empty ? 'Aucun pack disponible' : 'Ouvrir un booster'}
          </button>
          {error && <p role="alert" className="text-sm text-rose">{error}</p>}
        </div>
        {flashLayer}
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-10 overflow-y-auto px-5 py-8 md:px-10">
      <div className="beam" />
      <p className="title relative text-2xl text-gold-300 md:text-3xl">{done ? 'Booster terminé' : 'Touche une carte pour la retourner'}</p>

      <div className="relative flex w-full max-w-6xl flex-wrap justify-center gap-x-4 gap-y-8 md:flex-nowrap md:gap-x-7">
        {cards.map((c, i) => {
          const rk = rarityOf(c)
          return (
            <motion.div
              key={c.key}
              className="relative w-[30%] min-w-[96px] md:w-1/5 md:min-w-0 md:max-w-[260px]"
              initial={{ y: 70, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1], delay: 0.1 + i * 0.14 }}
            >
              {flipped[i] && rk !== 'common' && (
                <motion.span
                  data-rarity={rk}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-0 rounded-md border"
                  style={{ borderColor: 'var(--c)' }}
                  initial={{ scale: 1, opacity: 0.9 }}
                  animate={{ scale: rk === 'legendary' ? 1.5 : 1.25, opacity: 0 }}
                  transition={{ duration: rk === 'legendary' ? 1.4 : 0.9, ease: 'easeOut' }}
                />
              )}
              {flipped[i] && c.isNew && <span className="badge-new">Nouvelle</span>}
              <div
                className="flip z-10"
                onClick={() => flip(i)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), flip(i))}
                aria-label={flipped[i] ? c.title || c.name : 'Carte face cachée'}
              >
                <motion.div
                  className="flip-in"
                  animate={{ rotateY: flipped[i] ? 180 : 0 }}
                  transition={{ duration: 0.9, ease: [0.3, 0.9, 0.3, 1] }}
                >
                  <div className="face"><div className="card-back" data-rarity={rk}><i>C</i></div></div>
                  <div className="face front"><Card card={c} tilt={false} /></div>
                </motion.div>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="relative space-y-3 text-center">
        {done ? (
          <>
            <button onClick={() => setPhase('idle')} className="btn btn-fill">
              {empty ? 'Retour' : 'Ouvrir un autre booster'}
            </button>
            {info && (
              <p className="text-sm text-mist">
                {info.packs} / {max} packs{countdown && info.packs < max ? ` · prochain dans ${countdown}` : ''}
              </p>
            )}
          </>
        ) : (
          <button onClick={() => setFlipped(cards.map(() => true))} className="btn">Tout retourner</button>
        )}
      </div>
      {flashLayer}
    </div>
  )
}
