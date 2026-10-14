import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { openBooster } from '../services/api'
import { rarityOf } from '../constants'
import Card from './Card'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export default function BoosterPack({ onOpened, onOpenCard }) {
  const [phase, setPhase] = useState('idle') // idle | tearing | open
  const [cards, setCards] = useState([])
  const [flipped, setFlipped] = useState([])
  const [flash, setFlash] = useState(false)
  const [error, setError] = useState('')

  async function open() {
    setPhase('tearing'); setError('')
    try {
      // cartes déjà attribuées côté serveur ; on garantit 1,5 s de suspense minimum
      const [{ cards: drawn }] = await Promise.all([openBooster(), sleep(1500)])
      setFlash(true)
      await sleep(320)
      setCards(drawn); setFlipped(drawn.map(() => false)); setPhase('open')
      onOpened()
      await sleep(500)
      setFlash(false)
    } catch (e) { setError(e.message); setPhase('idle') }
  }

  const flip = (i) => (flipped[i] ? onOpenCard(cards[i]) : setFlipped((f) => f.map((v, j) => (j === i ? true : v))))
  const done = flipped.length > 0 && flipped.every(Boolean)
  const tearing = phase === 'tearing'

  const flashLayer = (
    <AnimatePresence>
      {flash && (
        <motion.div
          key="flash"
          className="pointer-events-none fixed inset-0 z-[80]"
          style={{ background: 'radial-gradient(circle at 50% 45%, #fffbe6 0%, #fbbf24 35%, rgba(245,158,11,.4) 70%, transparent 100%)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.9] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
        />
      )}
    </AnimatePresence>
  )

  if (phase !== 'open') {
    return (
      <div className="relative flex h-full flex-col items-center justify-center gap-10 overflow-hidden px-6 text-center">
        <div className="rays" />
        <motion.div
          className="relative"
          animate={{ scale: tearing ? 1.14 : 1 }}
          transition={{ duration: 1.4, ease: 'easeIn' }}
        >
          <div className="pack-glow absolute -inset-10 -z-10 rounded-full" style={{ background: 'radial-gradient(circle, rgba(251,191,36,.35), transparent 65%)' }} />
          <div className={`pack ${tearing ? 'shake' : ''}`}>
            <div className="pack-sheen" />
            <div className="pack-emblem" aria-hidden="true">🎬</div>
            <div className="pack-name gold-text">CINECLUB</div>
            <div className="pack-sub">Booster · 5 cartes</div>
          </div>
        </motion.div>

        <div className="relative space-y-3">
          <p className="text-mist">5 cartes de films et de stars, tirées au hasard.</p>
          <button
            onClick={open}
            disabled={tearing}
            className="rounded-full bg-gradient-to-b from-gold-300 to-gold-600 px-9 py-3.5 text-lg font-bold text-black shadow-gold transition active:scale-95 disabled:opacity-60"
          >
            {tearing ? 'Ouverture…' : 'Ouvrir un booster'}
          </button>
          {error && <p role="alert" className="text-sm text-rose">{error}</p>}
        </div>
        {flashLayer}
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col items-center gap-6 overflow-y-auto px-4 py-6">
      <div className="rays opacity-60" />
      <p className="relative font-display text-lg text-gold-300">{done ? 'Booster terminé' : 'Touche une carte pour la retourner'}</p>

      <div className="relative flex w-full max-w-lg flex-wrap justify-center gap-x-3 gap-y-5">
        {cards.map((c, i) => {
          const rk = rarityOf(c)
          return (
            <motion.div
              key={c.key}
              className="relative w-[30%] min-w-[96px]"
              initial={{ y: 120, opacity: 0, scale: 0.7, rotate: (i - 2) * 6 }}
              animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 160, damping: 17, delay: 0.1 + i * 0.12 }}
            >
              {flipped[i] && rk !== 'common' && (
                <motion.span
                  data-rarity={rk}
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-8 z-0 rounded-full"
                  style={{ background: 'radial-gradient(circle, var(--glow), transparent 65%)' }}
                  initial={{ scale: 0.3, opacity: 1 }}
                  animate={{ scale: rk === 'legendary' ? 2.8 : 2, opacity: 0 }}
                  transition={{ duration: rk === 'legendary' ? 1.3 : 0.9, ease: 'easeOut' }}
                />
              )}
              {flipped[i] && c.isNew && <span className="badge-new">Nouvelle carte</span>}
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
                  transition={{ type: 'spring', stiffness: 110, damping: 15 }}
                >
                  <div className="face"><div className="card-back" data-rarity={rk}><i>C</i></div></div>
                  <div className="face front"><Card card={c} tilt={false} /></div>
                </motion.div>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="relative">
        {done ? (
          <button
            onClick={() => setPhase('idle')}
            className="rounded-full bg-gradient-to-b from-gold-300 to-gold-600 px-8 py-3 font-bold text-black shadow-gold transition active:scale-95"
          >
            Ouvrir un autre booster
          </button>
        ) : (
          <button onClick={() => setFlipped(cards.map(() => true))} className="text-sm text-mist underline underline-offset-4 hover:text-gold-300">
            Tout retourner
          </button>
        )}
      </div>
      {flashLayer}
    </div>
  )
}
