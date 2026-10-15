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

  // Cache mémoire pour éviter de recharger la même page lors de la navigation
  const cacheRef = useRef(new Map())

  // Debounce sur la frappe au clavier (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
      setPage(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const fetchCatalogue = useCallback(async () => {
    const cleanQuery = debouncedQuery.trim()
    const cacheKey = `${cleanQuery.toLowerCase()}_${selectedRarity}_${page}`
    
    // Si la page est déjà en cache, affichage immédiat
    if (cacheRef.current.has(cacheKey)) {
      const cached = cacheRef.current.get(cacheKey)
      setMovies(cached.movies)
      setHasMore(cached.hasMore)
      setLoading(false)
      return
    }

    setLoading(true)

    // Sélection sécurisée des colonnes existantes dans la base
    let dbQuery = supabase
      .from('movies')
      .select('id, title, release_date, poster, vote_average, popularity, rarity')

    if (cleanQuery) {
      dbQuery = dbQuery.ilike('title', `%${cleanQuery}%`)
    }

    if (selectedRarity !== 'all') {
      dbQuery = dbQuery.eq('rarity', selectedRarity)
    }

    const from = page * PAGE_SIZE
    const to = from + PAGE_SIZE

    const { data, error } = await dbQuery
      .order('popularity', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Erreur Supabase Catalogue:', error)
      setMovies([])
      setHasMore(false)
    } else if (data) {
      const more = data.length > PAGE_SIZE
      const list = data.slice(0, PAGE_SIZE)

      // Stockage en cache
      cacheRef.current.set(cacheKey, { movies: list, hasMore: more })

      setMovies(list)
      setHasMore(more)
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
      <header className="mb-6 flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <h1 className="title text-4xl text-ivory md:text-5xl">Catalogue complet</h1>
          <p className="text-sm text-mist">
            Exploration du catalogue
          </p>
        </div>

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

      <div className="flex-1 overflow-y-auto">
        {loading && movies.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-sm text-mist animate-pulse">Chargement instantané...</p>
          </div>
        ) : movies.length === 0 ? (
          <div className="mx-auto mt-20 max-w-xs text-center">
            <p className="title text-2xl text-gold-300">Aucun résultat</p>
            <p className="mt-2 text-sm text-mist">
              Aucun film ne correspond à ta recherche.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 xl:gap-5">
            {movies.map((movie) => {
              const owned = collection[movie.id]
              
              // Normalisation pour passer directement l'URL complète du poster
              const formattedMovie = {
                ...movie,
                poster: movie.poster,
                poster_path: movie.poster,
                type: 'movie',
                key: `movie_${movie.id}`
              }

              return (
                <div key={movie.id} className="relative group">
                  <Card
                    card={formattedMovie}
                    locked={!owned}
                    count={owned?.count || 0}
                    onClick={() => openCard(owned || { ...formattedMovie, locked: true })}
                  />
                  {owned && (
                    <span className="absolute top-2 right-2 z-10 rounded bg-gold-500/90 px-1.5 py-0.5 text-[0.65rem] font-bold text-black shadow pointer-events-none">
                      Possédée
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

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
