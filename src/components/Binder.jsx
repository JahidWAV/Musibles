import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { RARITIES, CARD_TYPES } from '../constants'
import Card from './Card'

const RARITY_FILTERS = [{ id: 'all', label: 'Toutes' }, ...Object.values(RARITIES).reverse()]
const TYPE_FILTERS = [
  { id: 'all', label: 'Tout' },
  ...Object.values(CARD_TYPES).map((t) => ({ id: t.id, label: `${t.icon} ${t.plural}` })),
]

// Rangée de filtres : la pastille dorée glisse d'un choix à l'autre
function Chips({ group, options, value, onChange, extra }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1">
      {options.map((o) => {
        const active = value === o.id
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            aria-pressed={active}
            className="relative shrink-0 rounded-full bg-white/[0.03] px-4 py-1.5 text-[13px] font-semibold ring-1 ring-white/10"
          >
            {active && (
              <motion.span
                layoutId={`chip-${group}`}
                className="absolute inset-0 rounded-full bg-gradient-to-b from-gold-300 to-gold-600 shadow-gold-sm"
                transition={{ type: 'spring', stiffness: 500, damping: 36 }}
              />
            )}
            <span className={`relative ${active ? 'text-black' : 'text-mist'}`}>{o.label}</span>
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
      <header className="px-4 pb-2">
        <div className="flex items-end justify-between gap-4">
          <h1 className="font-display text-3xl font-bold text-ivory">Mon album</h1>
          <p className="pb-1 text-sm text-mist">
            <span className="font-display text-lg font-bold text-gold-400">{owned}</span> / {total} cartes
          </p>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progression de la collection">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-gold-700 via-gold-400 to-gold-300 shadow-gold-sm"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />
        </div>

        <div className="mt-3">
          <Chips group="type" options={TYPE_FILTERS} value={type} onChange={setType} />
          <Chips
            group="rarity"
            options={RARITY_FILTERS}
            value={rarity}
            onChange={setRarity}
            extra={
              <button
                onClick={() => setOnlyOwned((v) => !v)}
                aria-pressed={onlyOwned}
                className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] font-semibold ring-1 transition-colors ${onlyOwned ? 'bg-mint text-black ring-mint' : 'bg-white/[0.03] text-mist ring-white/10'}`}
              >
                Possédées
              </button>
            }
          />
        </div>
        <div className="gold-rule mt-2 opacity-60" />
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-3">
        {shown.length === 0 ? (
          <div className="mx-auto mt-16 max-w-xs text-center">
            <p className="font-display text-xl text-gold-300">{owned ? 'Rien à cet endroit' : 'Album vide'}</p>
            <p className="mt-2 text-sm text-mist">
              {owned ? 'Aucune carte ne correspond à ces filtres. Essaie d’en retirer un.' : 'Ouvre ton premier booster pour remplir l’album.'}
            </p>
          </div>
        ) : (
          <div key={`${type}-${rarity}-${onlyOwned}`} className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {shown.map((s, i) => (
              <motion.div
                key={s.key}
                initial={{ opacity: 0, y: 14, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.35, delay: Math.min(i, 14) * 0.03, ease: 'easeOut' }}
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
