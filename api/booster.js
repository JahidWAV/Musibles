import { db, requireUser } from './_lib/db.js'
import { BOOSTER_SIZE } from './_lib/config.js'
import { toCard } from './_lib/cards.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Méthode non autorisée.' })
  const user = await requireUser(req, res)
  if (!user) return

  const cooldown = Number(process.env.BOOSTER_COOLDOWN_SECONDS) || 0
  
  // 1. Vérification du cooldown et récupération de la liste brute via la fonction SQL
  const { data: rawMovies, error } = await db.rpc('open_booster_for', {
    p_user: user.id,
    p_cooldown: cooldown,
    p_size: BOOSTER_SIZE,
  })

  if (error) {
    if (error.message?.includes('cooldown')) {
      return res.status(429).json({ message: `Patiente ${cooldown} s entre deux boosters.` })
    }
    console.error(error)
    return res.status(500).json({ message: 'Impossible de tirer des cartes, réessaie.' })
  }

  if (!rawMovies || rawMovies.length === 0) {
    return res.status(500).json({ message: 'Aucun film disponible.' })
  }

  // 2. Vrai mélange aléatoire (Fisher-Yates shuffle) de TOUS les films en mémoire Node.js
  const shuffled = [...rawMovies]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  // 3. Sélection de 5 cartes uniques en évitant d'accumuler la même année
  const selectedMovies = []
  const usedIds = new Set()
  const usedYears = new Set()

  // Première passe : privilégier des années différentes pour la diversité visuelle
  for (const movie of shuffled) {
    if (selectedMovies.length >= BOOSTER_SIZE) break
    const year = movie.release_date ? String(movie.release_date).slice(0, 4) : 'unknown'

    if (!usedIds.has(movie.id) && !usedYears.has(year)) {
      usedIds.add(movie.id)
      usedYears.add(year)
      selectedMovies.push(movie)
    }
  }

  // Deuxième passe : compléter si besoin sans doublon d'ID
  for (const movie of shuffled) {
    if (selectedMovies.length >= BOOSTER_SIZE) break
    if (!usedIds.has(movie.id)) {
      usedIds.add(movie.id)
      selectedMovies.push(movie)
    }
  }

  // 4. Attribution des raretés et insertion dans l'inventaire utilisateur
  const insertedCards = []

  for (const movie of selectedMovies) {
    const roll = Math.random() * 100
    let rarity = 'common'
    if (roll <= 1) rarity = 'legendary'
    else if (roll <= 6) rarity = 'epic'
    else if (roll <= 20) rarity = 'rare'

    const snapshot = {
      title: movie.title,
      poster: movie.poster,
      backdrop: movie.backdrop,
      release_date: movie.release_date,
      vote_average: movie.vote_average,
      vote_count: movie.vote_count,
      overview: movie.overview,
      popularity: movie.popularity,
    }

    const { data: inserted, error: insertError } = await db
      .from('user_inventory')
      .insert({
        user_id: user.id,
        card_type: 'movie',
        card_id: movie.id,
        rarity: rarity,
        snapshot: snapshot,
      })
      .select()
      .single()

    if (!insertError && inserted) {
      insertedCards.push(inserted)
    }
  }

  return res.json({ cards: insertedCards.map(toCard) })
}
