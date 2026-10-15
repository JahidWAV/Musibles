import { db, requireUser } from './_lib/db.js'
import { BOOSTER_SIZE } from './_lib/config.js'
import { toCard } from './_lib/cards.js'

const INDEX_TTL_MS = 10 * 60 * 1000 // l'index du catalogue est gardé 10 min par instance chaude
const MOVIE_COLUMNS = 'id, title, release_date, overview, poster, backdrop, popularity, vote_average, vote_count'

// ───────── Utilitaires aléatoires (tout se passe ici, jamais en SQL) ─────────

const randInt = (n) => Math.floor(Math.random() * n)

// Fisher-Yates partiel : tire k éléments sans remise, sans modifier le tableau d'origine.
// Avec k = arr.length c'est un mélange complet.
function sample(arr, k) {
  const a = arr.slice()
  const n = Math.min(k, a.length)
  for (let i = 0; i < n; i++) {
    const j = i + randInt(a.length - i)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, n)
}

// ───────── Index du catalogue : Map<année, id[]> ─────────

let indexCache = { at: 0, byYear: null, size: 0 }
let indexLoading = null

async function loadIndex() {
  const { data, error } = await db.rpc('movie_index') // [["id", année|null], ...]
  if (error) throw error
  const byYear = new Map()
  let size = 0
  for (const [id, year] of data || []) {
    const key = year ?? 'unknown'
    let bucket = byYear.get(key)
    if (!bucket) byYear.set(key, (bucket = []))
    bucket.push(id)
    size++
  }
  return { at: Date.now(), byYear, size }
}

async function getIndex() {
  if (indexCache.byYear && Date.now() - indexCache.at < INDEX_TTL_MS) return indexCache
  // un seul chargement à la fois, même si plusieurs requêtes arrivent ensemble
  indexLoading ??= loadIndex()
    .then((idx) => (indexCache = idx))
    .finally(() => { indexLoading = null })
  try {
    return await indexLoading
  } catch (e) {
    if (indexCache.byYear) return indexCache // index périmé > pas d'index
    throw e
  }
}

// ───────── Sélection : années toutes différentes si possible, 0 doublon d'id ─────────

function pickIds(index, count, excluded = new Set()) {
  const keys = [...index.byYear.keys()]
  const used = new Set(excluded)
  const chosen = []

  const take = (bucket) => {
    for (let t = 0; t < 8; t++) {
      const id = bucket[randInt(bucket.length)]
      if (!used.has(id)) { used.add(id); chosen.push(id); return true }
    }
    return false
  }

  // 1re passe : on mélange les ANNÉES (Fisher-Yates) et on prend un film au hasard par année.
  // Une année rare a donc autant de chances d'apparaître qu'une année très fournie.
  for (const y of sample(keys, keys.length)) {
    if (chosen.length >= count) break
    take(index.byYear.get(y))
  }

  // 2e passe : s'il existe moins d'années que de cartes, on complète sans doublon d'id.
  let guard = 0
  while (chosen.length < count && guard++ < count * 50 && index.size > used.size) {
    take(index.byYear.get(keys[randInt(keys.length)]))
  }
  return chosen
}

async function fetchMovies(ids) {
  const { data, error } = await db.from('movies').select(MOVIE_COLUMNS).in('id', ids) // SELECT ciblé
  if (error) throw error
  return data || []
}

async function drawMovies(count) {
  const index = await getIndex()
  const movies = []
  const tried = new Set()

  // jusqu'à 3 essais : couvre le cas d'un id présent dans l'index mais supprimé depuis
  for (let attempt = 0; attempt < 3 && movies.length < count; attempt++) {
    const ids = pickIds(index, count - movies.length, tried)
    if (ids.length === 0) break
    ids.forEach((id) => tried.add(id))
    movies.push(...(await fetchMovies(ids)))
    if (movies.length < count) indexCache.at = 0 // index obsolète : rechargé au prochain booster
  }

  // .in() renvoie dans l'ordre de la table (donc chronologique) : on remélange l'ordre de révélation
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
  if (error) console.error('releaseClaim', error)
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
    console.error(claimError)
    return res.status(500).json({ message: 'Impossible de tirer des cartes, réessaie.' })
  }

  try {
    // 2) Node : tirage + 3) SELECT ciblé sur les ids retenus
    const movies = await drawMovies(BOOSTER_SIZE)
    if (movies.length === 0) throw new Error('Aucun film disponible.')

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
    if (insertError) throw insertError

    return res.json({ cards: inserted.map(toCard) })
  } catch (e) {
    console.error(e)
    await releaseClaim(user.id, previous)
    return res.status(500).json({ message: 'Impossible de tirer des cartes, réessaie.' })
  }
}
