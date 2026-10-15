import { useState, useEffect, useCallback, useRef } from 'react'
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
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedRarity, setSelectedRarity] = useState('all')
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  // 1. Effet de Debounce sur la recherche (attend 300ms après la frappe)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
      setPage(0) // Retour à la première page à chaque nouvelle recherche
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  // 2. Requête optimisée (sans le comptage exact lourd)
  const fetchCatalogue = useCallback(async () => {
    setLoading(true)
    
    let dbQuery = supabase
      .from('movies')
      .select('id, title, release_date, poster, vote_average, popularity, rarity')

    // Filtre texte (titre) sécurisé
    if (debouncedQuery.trim()) {
      dbQuery = dbQuery.ilike('title', `%${debouncedQuery.trim()}%`)
    }

    // Filtre par rareté
    if (selectedRarity !== 'all') {
      dbQuery = dbQuery.eq('rarity', selectedRarity)
    }

    // Pagination propre (on charge PAGE_SIZE + 1 pour savoir s'il y a une page suivante sans faire de COUNT)
    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE

    const { data, error } = await dbQuery
      .order('popularity', { ascending: false })
      .range(from, to)

    if (!error && data) {
      setHasMore(data.length > PAGE_SIZE)
      setMovies(data.slice(0, PAGE_SIZE)) // On garde seulement les 24 demandés
    } else {
      setMovies([])
      setHasMore(false)
    }
    setLoading(false)
  }, [debouncedQuery, selectedRarity, page])

  useEffect(() => {
    document.title = 'Catalogue · Cineclub'
    fetchCatalogue()
  }, [fetchCatalogue])

  const handleRarityChange = (rarityId) => {
    setSelectedRarity(rarityId)
    setPage(0)
  }

  return (
    <div className="flex h-full flex-col px-5 pb-12 pt-6 md:px-10">
      {/* En-tête de recherche */}
      <header className="mb-6 flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <h1 className="title text-4xl text-ivory md:text-5xl">Catalogue complet</h1>
          <p className="text-sm text-mist">
            Exploration de la base de données
          </p>
        </div>

        {/* Barre de recherche + Filtres */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Rechercher un film (ex: Les Dents de la mer, Inception...)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-ivory placeholder-mist outline-none focus:border-gold-500/50"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
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
              Aucun film ne correspond à ta recherche. Essaie d'autres termes.
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

      {/* Pagination légère */}
      <footer className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-sm text-mist">
        <button
          disabled={page === 0 || loading}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          className="rounded px-3 py-1.5 border border-white/10 text-ivory disabled:opacity-30 disabled:cursor-not-allowed hover:border-gold-500"
        >
          Précédent
        </button>

        <span>
          Page <b className="text-gold-300">{page + 1}</b>
        </span>

        <button
          disabled={!hasMore || loading}
          onClick={() => setPage((p) => p + 1)}
          className="rounded px-3 py-1.5 border border-white/10 text-ivory disabled:opacity-30 disabled:cursor-not-allowed hover:border-gold-500"
        >
          Suivant
        </button>
      </footer>
    </div>
  )
}
