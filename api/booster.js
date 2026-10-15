const PACK_MAX = 10
const PACK_COOLDOWN_SECONDS = 600

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
    const movies = await drawMovies(BOOSTER_SIZE)
    if (movies.length === 0) throw Object.assign(new Error('Aucun film disponible.'), { step: 'drawMovies' })

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
