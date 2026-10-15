import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CURRENCY, RARITIES, fmtNum, rarityOf } from '../constants'
import { cancelAuction, fetchAuctions, placeBid } from '../services/market'
import Card from './Card'

const VIEWS = [
  { id: 'all', label: 'Toutes' },
  { id: 'selling', label: 'Mes ventes' },
  { id: 'bidding', label: 'Mes offres' },
]

// Carte affichable à partir d'une enchère
const cardOf = (a) => ({ key: a.id, id: `${a.card_type}-${a.card_id}`, type: a.card_type, rarity: a.rarity, ...a.snapshot })

function timeLeft(ms) {
  if (ms <= 0) return 'Terminée'
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const pad = (n) => String(n).padStart(2, '0')
  if (d) return `${d} j ${h} h`
  if (h) return `${h} h ${pad(m)} min`
  return `${pad(m)}:${pad(s % 60)}`
}

export default function Auctions({ balance, onBalance, onChanged, notify }) {
  const [view, setView] = useState('all')
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [now, setNow] = useState(Date.now())

  const load = useCallback(async () => {
    try {
      const d = await fetchAuctions(view)
      setItems(d.auctions)
      setError('')
      if (d.balance != null) onBalance(d.balance)
      if (d.settled > 0) onChanged() // des ventes ont été réglées : l'album a pu changer
    } catch (e) {
      setError(e.message)
    }
  }, [view, onBalance, onChanged])

  useEffect(() => {
    setItems(null)
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [load])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const selected = items?.find((a) => a.id === selectedId) || null

  const doBid = async (a, amount) => {
    const r = await placeBid(a.id, amount)
    onBalance(r.balance)
    notify('Offre enregistrée.')
    await load()
  }
  const doCancel = async (a) => {
    await cancelAuction(a.id)
    notify('Vente annulée, la carte t’est rendue.')
    setSelectedId(null)
    await load()
    onChanged()
  }

  return (
    <div className="flex h-full flex-col">
      <header className="px-5 pb-3 md:px-10 md:pt-8">
        <div className="flex items-end justify-between gap-6">
          <h1 className="title text-4xl text-ivory md:text-5xl">Enchères</h1>
          <p className="pb-1.5 text-sm text-mist">
            <span className="font-display text-2xl text-gold-300">{fmtNum(balance)}</span> {CURRENCY}
          </p>
        </div>
        <div className="hairline mt-4" />
        <div className="no-scrollbar -mx-5 mt-2 flex gap-1 overflow-x-auto px-5 md:mx-0 md:px-0">
          {VIEWS.map((v) => {
            const active = view === v.id
            return (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                aria-pressed={active}
                className={`relative shrink-0 px-3.5 py-2 text-[.7rem] font-medium uppercase tracking-[.2em] transition-colors ${active ? 'text-gold-300' : 'text-mist hover:text-ivory'}`}
              >
                {active && <motion.span layoutId="auction-view" className="absolute inset-x-3.5 bottom-0 h-px bg-gold-500" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                {v.label}
              </button>
            )
          })}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-12 pt-4 md:px-10">
        {error && <p role="alert" className="mb-4 text-sm text-rose">{error}</p>}

        {items === null && !error ? (
          <p className="mt-20 text-center text-sm text-mist">Chargement des enchères…</p>
        ) : items?.length === 0 ? (
          <div className="mx-auto mt-20 max-w-xs text-center">
            <p className="title text-2xl text-gold-300">{view === 'all' ? 'Aucune enchère en cours' : 'Rien ici pour le moment'}</p>
            <p className="mt-2 text-sm text-mist">
              {view === 'all'
                ? 'Ouvre une carte de ton album pour la mettre aux enchères.'
                : view === 'selling'
                  ? 'Tes cartes mises en vente apparaîtront ici.'
                  : 'Les enchères sur lesquelles tu es en tête apparaîtront ici.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 xl:gap-x-5 2xl:grid-cols-8">
            {items?.map((a, i) => {
              const left = new Date(a.ends_at).getTime() - now
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: Math.min(i, 12) * 0.03 }}
                >
                  <Card card={cardOf(a)} onClick={() => setSelectedId(a.id)} />
                  <div className="mt-3 space-y-0.5 text-center">
                    <p className="font-display text-xl text-gold-300">
                      {fmtNum(a.current_bid ?? a.start_price)}
                      <span className="ml-1 text-xs text-mist">{a.current_bid == null ? 'mise' : CURRENCY}</span>
                    </p>
                    <p className={`text-xs tabular-nums ${left < 5 * 60 * 1000 ? 'text-rose' : 'text-mist'}`}>{timeLeft(left)}</p>
                    {a.winning && <p className="text-[.65rem] uppercase tracking-[.18em] text-mint">Tu es en tête</p>}
                    {a.mine && <p className="text-[.65rem] uppercase tracking-[.18em] text-gold-400">Ta vente</p>}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && (
          <AuctionSheet key={selected.id} auction={selected} now={now} balance={balance} onClose={() => setSelectedId(null)} onBid={doBid} onCancel={doCancel} />
        )}
      </AnimatePresence>
    </div>
  )
}

function AuctionSheet({ auction: a, now, balance, onClose, onBid, onCancel }) {
  const card = cardOf(a)
  const rk = rarityOf(card)
  const [amount, setAmount] = useState(a.min_bid)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const left = new Date(a.ends_at).getTime() - now
  const over = left <= 0

  async function run(fn) {
    setBusy(true); setErr('')
    try { await fn() } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 backdrop-blur-sm md:items-center md:p-10"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={card.title || card.name}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        data-rarity={rk}
        className="sheet relative max-h-[94%] w-full max-w-md overflow-y-auto p-6 md:max-h-full md:max-w-3xl md:p-10"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <div className="sheet-spot" />
        <button onClick={onClose} aria-label="Fermer" className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center text-xl font-light text-mist hover:text-ivory">✕</button>

        <div className="relative flex flex-col items-center gap-8 md:flex-row md:gap-12">
          <div className="w-44 shrink-0 md:w-60"><Card card={card} /></div>

          <div className="w-full text-center md:text-left">
            <p className="text-[.7rem] font-medium uppercase tracking-[.24em]" style={{ color: 'var(--c)' }}>{RARITIES[rk].label}</p>
            <h2 className="title mt-2 text-3xl leading-tight text-ivory md:text-4xl">{card.title || card.name}</h2>
            <div className="hairline my-5" />

            <dl className="grid grid-cols-2 gap-3 text-left">
              <div className="border border-[var(--hair)] px-4 py-3">
                <dt className="text-[.65rem] uppercase tracking-[.2em] text-mist">{a.current_bid == null ? 'Mise de départ' : 'Offre actuelle'}</dt>
                <dd className="title mt-1 text-2xl text-gold-300">{fmtNum(a.current_bid ?? a.start_price)}</dd>
              </div>
              <div className="border border-[var(--hair)] px-4 py-3">
                <dt className="text-[.65rem] uppercase tracking-[.2em] text-mist">Temps restant</dt>
                <dd className={`title mt-1 text-2xl tabular-nums ${left < 5 * 60 * 1000 ? 'text-rose' : 'text-gold-300'}`}>{timeLeft(left)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-mist">
              {a.bid_count} offre{a.bid_count > 1 ? 's' : ''} · Une offre dans les 2 dernières minutes prolonge l’enchère.
            </p>

            <div className="mt-6">
              {a.mine ? (
                <>
                  <p className="text-sm text-mist">
                    C’est ta vente : tu recevras le prix final en entier à la fin de l’enchère.
                  </p>
                  {a.bid_count === 0 && !over && (
                    <button disabled={busy} onClick={() => run(() => onCancel(a))} className="btn mt-4 w-full">Annuler la vente</button>
                  )}
                </>
              ) : a.winning ? (
                <p className="text-sm text-mint">Tu as la meilleure offre. Tes bobines sont bloquées jusqu’à la fin ou jusqu’à une surenchère.</p>
              ) : (
                <>
                  <label className="text-[.65rem] uppercase tracking-[.2em] text-mist" htmlFor="bid">
                    Ton offre · minimum {fmtNum(a.min_bid)} · solde {fmtNum(balance)}
                  </label>
                  <div className="mt-2 flex gap-3">
                    <input
                      id="bid"
                      type="number"
                      inputMode="numeric"
                      min={a.min_bid}
                      step="1"
                      className="field tabular-nums"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                    <button disabled={busy || over} onClick={() => run(() => onBid(a, Number(amount)))} className="btn btn-fill shrink-0">
                      {busy ? '…' : 'Enchérir'}
                    </button>
                  </div>
                </>
              )}
              {err && <p role="alert" className="mt-3 text-sm text-rose">{err}</p>}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
