import { useMemo, useState } from 'react'
import { RARITIES, CARD_TYPES } from '../constants'
import Card from './Card'

const RARITY_FILTERS = [{ id: 'all', label: 'Toutes' }, ...Object.values(RARITIES).reverse()]
const TYPE_FILTERS = [
  { id: 'all', label: 'Tout' },
  ...Object.values(CARD_TYPES).map((t) => ({ id: t.id, label: `${t.icon} ${t.plural}` })),
]

const chip = (active) =>
  `shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold ${active ? 'bg-honey text-night' : 'bg-dusk text-mist ring-1 ring-plum'}`

export default function Binder({ collection, known, onOpenCard }) {
  const [rarity, setRarity] = useState('all')
  const [type, setType] = useState('all')
  const [onlyOwned, setOnlyOwned] = useState(false)

  const slots = useMemo(() => {
    const map = new Map(known.map((a) => [a.key, { ...a, locked: true }]))
    Object.values(collection).forEach((c) => map.set(c.key, { ...c, locked: false }))
    return [...map.values()].sort((a, b) => b.popularity - a.popularity)
  }, [collection, known])

  const shown = slots.filter((s) =>
    (rarity === 'all' || s.rarity === rarity) &&
    (type === 'all' || s.type === type) &&
    (!onlyOwned || !s.locked))
  const owned = Object.keys(collection).length

  return (
    <div className="flex h-full flex-col">
      <header className="px-4 pb-2">
        <h1 className="font-display text-3xl font-extrabold">Mon album</h1>
        <p className="text-sm text-mist">{owned} carte{owned > 1 ? 's' : ''} sur {Math.max(slots.length, owned)} découvertes</p>
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {TYPE_FILTERS.map((f) => (
            <button key={f.id} onClick={() => setType(f.id)} aria-pressed={type === f.id} className={chip(type === f.id)}>{f.label}</button>
          ))}
        </div>
        <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
          {RARITY_FILTERS.map((f) => (
            <button key={f.id} onClick={() => setRarity(f.id)} aria-pressed={rarity === f.id} className={chip(rarity === f.id)}>{f.label}</button>
          ))}
          <button onClick={() => setOnlyOwned((v) => !v)} aria-pressed={onlyOwned}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold ${onlyOwned ? 'bg-mint text-night' : 'bg-dusk text-mist ring-1 ring-plum'}`}>
            Possédées
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {shown.length === 0 ? (
          <p className="mt-16 text-center text-mist">{owned ? 'Aucune carte ne correspond à ce filtre.' : 'Ton album est vide. Ouvre un booster pour commencer.'}</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {shown.map((s) => (
              <div key={s.key} className={s.locked ? 'opacity-50 grayscale' : ''}>
                <Card card={s} locked={s.locked} count={collection[s.key]?.count} onClick={() => onOpenCard(collection[s.key])} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
