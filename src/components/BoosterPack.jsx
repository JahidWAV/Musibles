import { useState } from 'react'
import { openBooster } from '../services/api'
import Card from './Card'

export default function BoosterPack({ onOpened, onOpenCard }) {
  const [phase, setPhase] = useState('idle')
  const [cards, setCards] = useState([])
  const [flipped, setFlipped] = useState([])
  const [error, setError] = useState('')

  async function open() {
    setPhase('loading'); setError('')
    try {
      const { cards: drawn } = await openBooster() // cartes déjà attribuées côté serveur
      setCards(drawn); setFlipped(drawn.map(() => false)); setPhase('open')
      onOpened()
    } catch (e) { setError(e.message); setPhase('idle') }
  }

  const flip = (i) => (flipped[i] ? onOpenCard(cards[i]) : setFlipped((f) => f.map((v, j) => (j === i ? true : v))))
  const done = flipped.length > 0 && flipped.every(Boolean)

  if (phase !== 'open') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-8 px-6 text-center">
        <div className={`pack ${phase === 'loading' ? 'shake' : ''}`}>Cineclub<br />🎬</div>
        <div className="space-y-3">
          <p className="text-mist">5 cartes (films et stars) tirées au hasard.</p>
          <button onClick={open} disabled={phase === 'loading'} className="rounded-full bg-honey px-8 py-3 text-lg font-bold text-night active:scale-95 disabled:opacity-60">
            {phase === 'loading' ? 'Ouverture…' : 'Ouvrir un booster'}
          </button>
          {error && <p role="alert" className="text-sm text-rose">{error}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col items-center gap-6 overflow-y-auto px-4 py-6">
      <p className="text-mist">{done ? 'Booster terminé !' : 'Touche une carte pour la retourner.'}</p>
      <div className="flex w-full max-w-md flex-wrap justify-center gap-3">
        {cards.map((c, i) => (
          <div key={c.key} className="w-[30%] min-w-[96px]">
            <div className={`flip ${flipped[i] ? 'on' : ''}`} onClick={() => flip(i)} role="button" tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && flip(i)} aria-label={flipped[i] ? c.name : 'Carte face cachée'}>
              <div className="flip-in">
                <div className="face"><div className="card-back">🎬</div></div>
                <div className="face front">
                  {c.isNew && <span className="badge-new">Nouvelle</span>}
                  <Card card={c} onClick={() => {}} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {done
        ? <button onClick={() => setPhase('idle')} className="rounded-full bg-honey px-8 py-3 font-bold text-night">Ouvrir un autre booster</button>
        : <button onClick={() => setFlipped(cards.map(() => true))} className="text-sm text-mist underline">Tout retourner</button>}
    </div>
  )
}
