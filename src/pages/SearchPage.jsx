import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'
import { RARITIES } from '../constants'
import Card from '../components/Card'
import { useApp } from '../AppContext'

const RARITY_OPTIONS = [
  { id: 'all', label: 'Toutes les raretés' },
  ...Object.values(RARITIES)
]

const PAGE_SIZE = 24

export default function SearchPage() {
  const { openCard, collection } = useApp()
  const [query, setQuery] = useState('')
  const [selectedRarity, setSelectedRarity] = useState('all')
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  // Recherche avec debounce/effet
  const fetchCatalogue = useCallback(async () => {
    setLoading(true)
    
    let dbQuery = supabase
      .from('movies')
      .select('id, title, release_date, poster, vote_average, popularity, rarity', { count: 'exact' })

    // Filtre texte (titre)
    if (query.trim()) {
      dbQuery = dbQuery.ilike('title', `%${query.trim()}%`)
    }

    // Filtre par rareté
    if (selectedRarity !== 'all') {
      dbQuery = dbQuery.eq('rarity', selectedRarity)
    }

    // Pagination & Tri par popularité
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data, count, error } = await dbQuery
      .order('popularity', { ascending: false })
      .range(from, to)

    if (!error && data) {
      setMovies(data)
      setTotalCount(count || 0)
    }
    setLoading(false)
  }, [query, selectedRarity, page])

  useEffect(() => {
    document.title = 'Catalogue · Cineclub'
    fetchCatalogue()
  }, [fetchCatalogue])

  // Remise à zéro de la page lors du changement de filtre
  const handleQueryChange = (e) => {
    setQuery(e.target.value)
    setPage(0)
  }

  const handleRarityChange = (rarityId) => {
    setSelectedRarity(rarityId)
    setPage(0)
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="flex h-full flex-col px-5 pb-12 pt-6 md:px-10">
      {/* En-tête de recherche */}
      <header className="mb-6 flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <h1 className="title text-4xl text-ivory md:text-5xl">Catalogue complet</h1>
          <p className="text-sm text-mist">
            <span className="font-display text-xl text-gold-300">{totalCount.toLocaleString()}</span> films
          </p>
        </div>

        {/* Barre de recherche + Filtres */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Rechercher un film (ex: Les Dents de la mer, Inception...)"
              value={query}
              onChange={handleQueryChange}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-ivory placeholder-mist outline-none focus:border-gold-500/50"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setPage(0); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-mist hover:text-ivory"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sélecteur de rareté */}
          <select
            value={selectedRarity}
            onChange={(e) => handleRarityChange(e.target.value)}
            className="rounded-lg border border-white/10 bg-neutral-900 px-3 py-2.5 text-sm text-ivory outline-none focus:border-gold-500/50"
          >
            {RARITY_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Grille de cartes */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-sm text-mist animate-pulse">Chargement du catalogue...</p>
          </div>
        ) : movies.length === 0 ? (
          <div className="mx-auto mt-20 max-w-xs text-center">
            <p className="title text-2xl text-gold-300">Aucun résultat</p>
            <p className="mt-2 text-sm text-mist">
              Aucun film ne correspond à ta recherche. Essayes avec d'autres termes.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 xl:gap-5">
            {movies.map((movie) => {
              const owned = collection[movie.id]
              return (
                <div key={movie.id} className="relative group">
                  <Card
                    card={{
                      ...movie,
                      type: 'movie',
                      key: `movie_${movie.id}`
                    }}
                    locked={!owned}
                    count={owned?.count || 0}
                    onClick={() => openCard(owned || { ...movie, type: 'movie', locked: true })}
                  />
                  {owned && (
                    <span className="absolute top-2 right-2 z-10 rounded bg-gold-500/90 px-1.5 py-0.5 text-[0.65rem] font-bold text-black shadow">
                      Possédée
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <footer className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-sm text-mist">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded px-3 py-1.5 border border-white/10 text-ivory disabled:opacity-30 disabled:cursor-not-allowed hover:border-gold-500"
          >
            Précédent
          </button>

          <span>
            Page <b className="text-gold-300">{page + 1}</b> sur {totalPages}
          </span>

          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            className="rounded px-3 py-1.5 border border-white/10 text-ivory disabled:opacity-30 disabled:cursor-not-allowed hover:border-gold-500"
          >
            Suivant
          </button>
        </footer>
      )}
    </div>
  )
}
