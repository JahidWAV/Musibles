import { useState } from 'react'
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { CARD_TYPES, DEPARTMENTS, RARITIES, rarityOf, tmdbImage, typeOf } from '../constants'

// Utilitaire de formatage des grands nombres (ex: 12500 -> 12,5k)
export const fmt = (n) => {
  if (n == null || isNaN(n)) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.', ',') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.', ',') + 'k'
  return String(Math.round(n))
}

const SPRING = { stiffness: 160, damping: 20, mass: 0.7 }

const initialsOf = (t) => t.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'

// Image avec repli propre : si TMDB échoue ou si le chemin est vide, on affiche les initiales.
function Art({ src, title }) {
  const [state, setState] = useState('loading') // loading | ready | error
  if (!src || state === 'error') {
    return <div className="tcg-placeholder"><span>{initialsOf(title)}</span></div>
  }
  return (
    <img
      src={src}
      alt={title}
      loading="lazy"
      decoding="async"
      draggable={false}
      referrerPolicy="no-referrer"
      onLoad={() => setState('ready')}
      onError={() => setState('error')}
      style={{ opacity: state === 'ready' ? 1 : 0 }}
    />
  )
}

export default function Card({ card, locked = false, count = 1, onClick, tilt = true, bare = false }) {
  const reduce = useReducedMotion()
  const mx = useMotionValue(0.5)
  const my = useMotionValue(0.5)
  const sx = useSpring(mx, SPRING)
  const sy = useSpring(my, SPRING)
  const rotateY = useTransform(sx, [0, 1], [-8, 8])
  const rotateX = useTransform(sy, [0, 1], [8, -8])
  const gx = useTransform(sx, (v) => `${v * 100}%`)
  const gy = useTransform(sy, (v) => `${v * 100}%`)
  const glare = useMotionTemplate`radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,.2), transparent 55%)`

  if (!card) return null

  const rarityKey = rarityOf(card)
  const rarity = RARITIES[rarityKey]
  const isMovie = typeOf(card) === 'movie'
  const title = card.title || card.name || 'Inconnu'
  const year = card.release_date ? new Date(card.release_date).getFullYear() : card.year
  const subtitle = isMovie
    ? `Film${year ? ` · ${year}` : ''}`
    : DEPARTMENTS[card.known_for_department || card.department] || 'Star'
  const rating = card.vote_average ?? card.rating

  const canTilt = tilt && !locked && !reduce
  const interactive = typeof onClick === 'function'

  const onMove = (e) => {
    if (!canTilt || e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width)
    my.set((e.clientY - r.top) / r.height)
  }
  const onLeave = () => { mx.set(0.5); my.set(0.5) }

  return (
    <div
      className="tcg"
      data-rarity={rarityKey}
      data-locked={locked ? '' : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={locked ? `Carte ${rarity.label} à découvrir` : `${title}, carte ${rarity.label}`}
      onClick={onClick}
      onKeyDown={interactive ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClick(e)) : undefined}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <motion.div
        className="tcg-tilt"
        style={canTilt ? { rotateX, rotateY, transformPerspective: 900 } : undefined}
        whileHover={canTilt ? { scale: 1.025 } : undefined}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      >
        <div className="tcg-frame">
          {locked ? (
            <div className="tcg-body">
              <span className="tcg-q" aria-hidden="true">?</span>
              <span className="tcg-lock-label">{rarity.label}</span>
            </div>
          ) : (
            <div className="tcg-body">
              <div className="tcg-art"><Art key={tmdbImage(card)} src={tmdbImage(card)} title={title} /></div>
              <div className="tcg-vignette" />
              {rarityKey !== 'common' && <div className="tcg-foil" />}
              {canTilt && <motion.div className="tcg-glare" style={{ background: glare }} />}
              <div className="tcg-rim" />

              <div className="tcg-head">
                <span className="tcg-rarity">{rarity.label}</span>
                {count > 1 && <span className="tcg-count">×{count}</span>}
              </div>

              <div className="tcg-foot">
                <span className="tcg-sub">{subtitle}</span>
                <h3 className="tcg-title">{title}</h3>
                <div className="tcg-stats">
                  {isMovie ? (
                    <span><b>{rating != null ? Number(rating).toFixed(1).replace('.', ',') : '—'}</b> / 10</span>
                  ) : (
                    <span>Popularité <b>{fmt(Math.round(card.popularity || 0))}</b></span>
                  )}
                  <span>{CARD_TYPES[isMovie ? 'movie' : 'person'].label}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
