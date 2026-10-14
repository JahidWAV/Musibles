import { useState } from 'react'
import { RARITIES } from '../constants'

export const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n)
const initials = (n) => n.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()

export default function Card({ card, locked = false, onClick, count }) {
  const [broken, setBroken] = useState(false)
  if (locked) {
    return <div className={`card card-locked rar-${card.rarity}`} aria-label="Carte non débloquée"><span className="font-display text-2xl opacity-30">?</span></div>
  }
  return (
    <button type="button" className={`card rar-${card.rarity}`} onClick={onClick} aria-label={`${card.name}, ${RARITIES[card.rarity].label}`}>
      <div className="card-in">
        <div className="card-art">
          {card.image && !broken
            ? <img src={card.image} alt="" loading="lazy" onError={() => setBroken(true)} />
            : <div className="card-initials">{initials(card.name)}</div>}
          {count > 1 && <span className="badge-new" style={{ background: '#8fd6b8' }}>×{count}</span>}
        </div>
        <div className="card-foot">
          <p className="card-name">{card.name}</p>
          <p className="card-meta">{RARITIES[card.rarity].label}</p>
        </div>
      </div>
    </button>
  )
}
