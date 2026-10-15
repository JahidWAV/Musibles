import { db, requireUser } from './_lib/db.js'
import { BOOSTER_SIZE } from './_lib/config.js'
import { toCard } from './_lib/cards.js'

const MIN_YEAR = Number(process.env.BOOSTER_MIN_YEAR) || 1950 // plus petite année tirable
const COUNT_TTL_MS = 60 * 60 * 1000 //                         nb de films par année, gardé 1 h
const MOVIE_COLUMNS = 'id, title, release_date, overview, poster, backdrop, popularity, vote_average, vote_count'

// ───────── Aléatoire (100 % Node) ─────────

const randInt = (n) => Math.floor(Math.random() * n)

// Fisher-Yates partiel : k éléments sans remise, sans modifier le tableau d'origine
// (k = arr.length → mélange complet).
function sample(arr, k) {
  const a = arr.slice()
  const n = Math.min(k, a.length)
  for (let i = 0; i < n; i++) {
    const j = i + randInt(a.length - i)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, n)
}

// Marque l'étape en cause pour que les logs Vercel disent QUI timeout
async function step(label, fn) {
  try {
    return await fn()
  } catch (e) {
    e.step = label
    throw e
  }
}

// ───────── Requêtes légères sur l'index (release_date, id) ─────────

const yearRange = (q, y) => q.gte('release_date', `${y}-01-01`).lte('release_date', `${y}-12-31`)

const countCache = new Map() // année -> { n, at }

async function yearCount(y) {
  const hit = countCache.get(y)
  if (hit && Date.now() - hit.at < COUNT_TTL_MS) return hit.n
  const { count, error } = await yearRange(db.from('movies').select('id', { count: 'exact', head: true }), y)
  if (error) throw error
  countCache.set(y, { n: count || 0, at: Date.now() })
  return count || 0
}

// Un film au hasard dans l'année : offset aléatoire tiré ICI, lu dans l'ordre de l'index (aucun tri SQL).
async function pickInYear(y) {
  const n = await yearCount(y)
  if (!n) return null
  const off = randInt(n)
  const { data, error } = await yearRange(db.from('movies').select('id'), y)
    .order('release_date', { ascending: true })
    .order('id', { ascending: true })
    .range(off, off)
  if (error) throw error
  return data?.[0]?.id ?? null
}

// Années toutes différentes (années mélangées en Fisher-Yates), 0 doublon d'id.
async function pickIds(count) {
  const thisYear = new Date().getFullYear()
  const allYears = Array.from({ length: thisYear - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i)
  const ids = []
  const usedYears = new Set()

  // Tours 0-3 : une année neuve par carte. Une année vide est simplement abandonnée et remplacée.
  // Tours 4-5 (quasi jamais) : si on manque encore de cartes, on autorise une année déjà vue, avec un id différent.
  for (let round = 0; round < 6 && ids.length < count; round++) {
    const pool = round < 4 ? allYears.filter((y) => !usedYears.has(y)) : allYears
    const years = sample(pool, count - ids.length)
    const found = await Promise.all(years.map((y) => step(`pickInYear:${y}`, () => pickInYear(y))))
    years.forEach((y, i) => {
      usedYears.add(y)
      const id = found[i]
      if (id && !ids.includes(id)) ids.push(id)
    })
  }
  return ids
}

// SELECT ciblé : seulement les ids retenus
async function fetchMovies(ids) {
  const { data, error } = await db.from('movies').select(MOVIE_COLUMNS).in('id', ids)
  if (error) throw error
  return data || []
}

async function drawMovies(count) {
  const ids = await step('pickIds', () => pickIds(count))
  if (ids.length === 0) return []
  const movies = await step('fetchMovies', () => fetchMovies(ids))
  // .in() renvoie dans l'ordre de la table : on remélange l'ordre de révélation
  return sample(movies, movies.length)
}

// ───────── Rareté ─────────

function rollRarity() {
  const roll = Math.random() * 100
  if (roll <= 1) return 'legendary' // 1 %
  if (roll <= 6) return 'epic' //      5 %
  if (roll <= 20) return 'rare' //     14 %
  return 'common' //                   80 %
}

// Si le tirage échoue après le cooldown, on rend son booster à l'utilisateur.
async function releaseClaim(userId, previous) {
  const q = previous
    ? db.from('booster_claims').update({ last_opened_at: previous }).eq('user_id', userId)
    : db.from('booster_claims').delete().eq('user_id', userId)
  const { error } = await q
  if (error) console.error('[booster] releaseClaim', error)
}

// ───────── Handler ─────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Méthode non autorisée.' })
  const user = await requireUser(req, res)
  if (!user) return

  const cooldown = Number(process.env.BOOSTER_COOLDOWN_SECONDS) || 0

  // 1) SQL : uniquement le cooldown (atomique, O(1))
  const { data: previous, error: claimError } = await db.rpc('claim_booster', {
    p_user: user.id,
    p_cooldown: cooldown,
  })
  if (claimError) {
    if (claimError.message?.includes('cooldown')) {
      return res.status(429).json({ message: `Patiente ${cooldown} s entre deux boosters.` })
    }
    console.error('[booster] étape claim_booster', claimError)
    return res.status(500).json({ message: 'Impossible de tirer des cartes, réessaie.' })
  }

  try {
    // 2) Node : choix des années et des films, 3) SELECT ciblé sur les ids retenus
    const movies = await drawMovies(BOOSTER_SIZE)
    if (movies.length === 0) throw Object.assign(new Error('Aucun film disponible.'), { step: 'drawMovies' })

    // 4) Un seul INSERT pour toutes les cartes
    const rows = movies.map((movie) => ({
      user_id: user.id,
      card_type: 'movie',
      card_id: movie.id,
      rarity: rollRarity(),
      snapshot: {
        title: movie.title,
        poster: movie.poster,
        backdrop: movie.backdrop,
        release_date: movie.release_date,
        vote_average: movie.vote_average,
        vote_count: movie.vote_count,
        overview: movie.overview,
        popularity: movie.popularity,
      },
    }))

    const { data: inserted, error: insertError } = await db.from('user_inventory').insert(rows).select()
    if (insertError) throw Object.assign(insertError, { step: 'insert user_inventory' })

    return res.json({ cards: inserted.map(toCard) })
  } catch (e) {
    console.error(`[booster] étape ${e.step || '?'} :`, e)
    await releaseClaim(user.id, previous)
    return res.status(500).json({ message: 'Impossible de tirer des cartes, réessaie.' })
  }
}
