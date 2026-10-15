import { db, requireUser } from './_lib/db.js'
import { BOOSTER_SIZE } from './_lib/config.js'
import { toCard } from './_lib/cards.js'

const MIN_YEAR = Number(process.env.BOOSTER_MIN_YEAR) || 1950 // plus petite année tirable
const COUNT_TTL_MS = 60 * 60 * 1000 //                         nb de films par année, gardé 1 h
const MOVIE_COLUMNS = 'id, title, release_date, overview, poster, backdrop, popularity, vote_average, vote_count'

const PACK_MAX = 10
const PACK_COOLDOWN_SECONDS = 600

// ───────── Aléatoire (100 % Node) ─────────

const randInt = (n) => Math.floor(Math.random() * n)

// Fisher-Yates partiel : k éléments sans remise, sans modifier le tableau d'origine
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

// Un film au hasard dans l'année : offset aléatoire tiré ICI, lu dans l'ordre de l'index
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

// Années toutes différentes, 0 doublon d'id.
async function pickIds(count) {
  const thisYear = new Date().getFullYear()
  const allYears = Array.from({ length: thisYear - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i)
  const ids = []
  const usedYears = new Set()

  // Tours 0-3 : une année neuve par carte. Tours 4-5 : on autorise une année déjà vue.
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

// ───────── Stock de packs ─────────

const stock = (row) => ({
  packs: row.out_packs,
  max: PACK_MAX,
  cooldownSeconds: PACK_COOLDOWN_SECONDS,
  nextPackAt: row.out_next, // null = stock plein
})

// ───────── Handler ─────────

export default async function handler(req, res) {
  const user = await requireUser(req, res)
  if (!user) return

  // GET : état du stock
  if (req.method === 'GET') {
    const { data, error } = await db.rpc('get_packs', { p_user: user.id })
    if (error) {
      console.error('[booster] get_packs', error)
      return res.status(500).json({ message: 'Impossible de lire ton stock de packs.' })
    }
    return res.json(stock(data[0]))
  }

  if (req.method !== 'POST') return res.status(405).json({ message: 'Méthode non autorisée.' })

  // 1) SQL : consomme un pack (atomique)
  const { data: left, error: claimError } = await db.rpc('consume_pack', { p_user: user.id })
  if (claimError) {
    if (claimError.message?.includes('NO_PACKS')) {
      const { data: s } = await db.rpc('get_packs', { p_user: user.id })
      return res.status(429).json({
        message: 'Plus de packs : le prochain arrive dans quelques minutes.',
        ...(s?.[0] ? stock(s[0]) : {}),
      })
    }
    console.error('[booster] étape consume_pack', claimError)
    return res.status(500).json({ message: 'Impossible de tirer des cartes, réessaie.' })
  }

  try {
    // 2) Node : choix des films
    const movies = await drawMovies(BOOSTER_SIZE)
    if (movies.length === 0) throw Object.assign(new Error('Aucun film disponible.'), { step: 'drawMovies' })

    // 3) Un seul INSERT pour toutes les cartes
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

    return res.json({ cards: inserted.map(toCard), ...stock(left[0]) })
  } catch (e) {
    console.error(`[booster] étape ${e.step || '?'} :`, e)
    const { error } = await db.rpc('refund_pack', { p_user: user.id })
    if (error) console.error('[booster] refund_pack', error)
    return res.status(500).json({ message: 'Impossible de tirer des cartes, réessaie.' })
  }
}
