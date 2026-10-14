// Transforme une ligne d'inventaire (snapshot figé) en carte prête pour le front.
export function toCard(row) {
  const s = row.snapshot || {}
  const base = {
    key: `${row.card_type}:${row.card_id}`,
    type: row.card_type,
    id: row.card_id,
    rarity: row.rarity,
    popularity: Number(s.popularity) || 0,
    count: row.copies ?? 1,
    isNew: Boolean(row.is_new),
  }
  if (row.card_type === 'movie') {
    return {
      ...base,
      name: s.title,
      image: s.poster,
      backdrop: s.backdrop,
      year: s.release_date ? String(s.release_date).slice(0, 4) : null,
      rating: s.vote_average != null ? Number(s.vote_average) : null,
      votes: s.vote_count ?? 0,
      overview: s.overview,
    }
  }
  return {
    ...base,
    name: s.name,
    image: s.profile_path,
    department: s.known_for_department,
  }
}
