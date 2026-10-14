import { useMemo, useState } from 'react'
import { RARITIES } from '../constants'
import Card from './Card'

const FILTERS = [{ id: 'all', label: 'Toutes' }, ...Object.values(RARITIES).reverse()]

export default function Binder({ collection, known, onOpenCard }) {
  const [rarity, setRarity] = useState('all')
  const [onlyOwned, setOnlyOwned] = useState(false)

  const slots = useMemo(() => {
    const map = new Map(known.map((a) => [a.id, { ...a, locked: true }]))
    Object.values(collection).forEach((c) => map.set(c.id, { ...c, locked: false }))
    return [...map.values()].sort((a, b) => b.listeners - a.listeners)
  }, [collection, known])

  const shown = slots.filter((s) => (rarity === 'all' || s.rarity === rarity) && (!onlyOwned || !s.locked))
  const owned = Object.keys(collection).length

  return (
    <div className="flex h-full flex-col">
      <header className="px-4 pb-2">
        <h1 className="font-display text-3xl font-extrabold">Mon album</h1>
        <p className="text-sm text-mist">{owned} carte{owned > 1 ? 's' : ''} sur {Math.max(slots.length, owned)} découvertes</p>
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setRarity(f.id)} aria-pressed={rarity === f.id}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold ${rarity === f.id ? 'bg-honey text-night' : 'bg-dusk text-mist ring-1 ring-plum'}`}>
              {f.label}
            </button>
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
              <div key={s.id} className={s.locked ? 'opacity-50 grayscale' : ''}>
                <Card card={s} locked={s.locked} count={collection[s.id]?.count} onClick={() => onOpenCard(collection[s.id])} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
