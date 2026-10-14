import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { RARITIES, CARD_TYPES } from '../constants'
import Card from './Card'

const RARITY_FILTERS = [{ id: 'all', label: 'Toutes' }, ...Object.values(RARITIES).reverse()]
const TYPE_FILTERS = [
  { id: 'all', label: 'Tout' },
  ...Object.values(CARD_TYPES).map((t) => ({ id: t.id, label: t.plural })),
]

// Rangée de filtres : un filet doré fin glisse d'un choix à l'autre
function Chips({ group, options, value, onChange, extra }) {
  return (
    <div className="no-scrollbar -mx-5 flex items-center gap-1 overflow-x-auto px-5 md:mx-0 md:px-0">
      {options.map((o) => {
        const active = value === o.id
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            aria-pressed={active}
            className={`relative shrink-0 px-3.5 py-2 text-[.7rem] font-medium uppercase tracking-[.2em] transition-colors ${active ? 'text-gold-300' : 'text-mist hover:text-ivory'}`}
          >
            {active && (
              <motion.span
                layoutId={`chip-${group}`}
                className="absolute inset-x-3.5 bottom-0 h-px bg-gold-500"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
            {o.label}
          </button>
        )
      })}
      {extra}
    </div>
  )
}

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
  const total = Math.max(slots.length, owned)
  const pct = total ? Math.round((owned / total) * 100) : 0

  return (
    <div className="flex h-full flex-col">
      <header className="px-5 pb-3 md:px-10 md:pt-8">
        <div className="flex items-end justify-between gap-6">
          <h1 className="title text-4xl text-ivory md:text-5xl">Mon album</h1>
          <p className="pb-1.5 text-sm text-mist">
            <span className="font-display text-2xl text-gold-300">{owned}</span>
            <span className="mx-1.5 text-mist/60">/</span>{total}
            <span className="ml-2 hidden sm:inline">cartes découvertes</span>
          </p>
        </div>

        <div className="mt-4 h-px w-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progression de la collection">
          <motion.div className="h-px bg-gold-500" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
        </div>

        <div className="mt-3 flex flex-col gap-1 md:flex-row md:flex-wrap md:items-center md:gap-x-10">
          <Chips group="type" options={TYPE_FILTERS} value={type} onChange={setType} />
          <span className="hidden h-4 w-px bg-white/10 md:block" />
          <Chips
            group="rarity"
            options={RARITY_FILTERS}
            value={rarity}
            onChange={setRarity}
            extra={
              <button
                onClick={() => setOnlyOwned((v) => !v)}
                aria-pressed={onlyOwned}
                className={`ml-3 shrink-0 border px-3.5 py-1.5 text-[.7rem] font-medium uppercase tracking-[.2em] transition-colors ${onlyOwned ? 'border-gold-500 text-gold-300' : 'border-white/10 text-mist hover:text-ivory'}`}
              >
                Possédées
              </button>
            }
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-12 pt-4 md:px-10">
        {shown.length === 0 ? (
          <div className="mx-auto mt-20 max-w-xs text-center">
            <p className="title text-2xl text-gold-300">{owned ? 'Rien à cet endroit' : 'Album vide'}</p>
            <p className="mt-2 text-sm text-mist">
              {owned ? 'Aucune carte ne correspond à ces filtres. Essaie d’en retirer un.' : 'Ouvre ton premier booster pour remplir l’album.'}
            </p>
          </div>
        ) : (
          <div key={`${type}-${rarity}-${onlyOwned}`} className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 xl:gap-5 2xl:grid-cols-10">
            {shown.map((s, i) => (
              <motion.div
                key={s.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: Math.min(i, 16) * 0.025, ease: 'easeOut' }}
              >
                <Card
                  card={s}
                  locked={s.locked}
                  count={collection[s.key]?.count}
                  onClick={s.locked ? undefined : () => onOpenCard(collection[s.key])}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
