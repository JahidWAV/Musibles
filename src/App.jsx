import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from './services/supabase'
import { fetchCollection } from './services/api'
import AuthScreen from './components/AuthScreen'
import BoosterPack from './components/BoosterPack'
import Binder from './components/Binder'
import CardModal from './components/CardModal'

const Icon = ({ children }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

const TABS = [
  {
    id: 'booster', label: 'Booster',
    icon: <Icon><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13" /><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" /><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" /></Icon>,
  },
  {
    id: 'binder', label: 'Album',
    icon: <Icon><path d="M12 7v14" /><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" /></Icon>,
  },
  {
    id: 'account', label: 'Compte',
    icon: <Icon><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></Icon>,
  },
]

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = chargement
  const [tab, setTab] = useState('booster')
  const [modal, setModal] = useState(null)
  const [collection, setCollection] = useState({})
  const [known, setKnown] = useState([])
  const [syncError, setSyncError] = useState('')

  useEffect(() => {
    if (!supabase) return setSession(null)
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const refresh = useCallback(() =>
    fetchCollection()
      .then((d) => { setCollection(d.collection); setKnown(d.known); setSyncError('') })
      .catch((e) => setSyncError(e.message)), [])

  const uid = session?.user?.id
  useEffect(() => {
    if (!uid) { setCollection({}); setKnown([]); return }
    refresh()
  }, [uid, refresh])

  const closeModal = useCallback(() => setModal(null), [])

  if (!supabase) {
    return <main className="grid h-full place-items-center p-6 text-center text-mist">Configuration manquante : ajoute VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans les variables d'environnement.</main>
  }
  if (session === undefined) {
    return (
      <main className="grid h-full place-items-center">
        <motion.h1 className="wordmark text-2xl" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2.4, repeat: Infinity }}>
          Cineclub
        </motion.h1>
      </main>
    )
  }
  if (!session) return <AuthScreen />

  return (
    <div className="flex h-full w-full flex-col">
      {syncError && <p role="alert" className="safe-top bg-rose px-4 py-2 text-center text-sm font-medium text-black">{syncError}</p>}

      {/* Barre du haut (ordinateur) */}
      <header className="safe-top hidden items-center justify-between border-b border-[var(--hair)] px-10 pb-5 pt-5 md:flex">
        <span className="wordmark text-xl">Cineclub</span>
        <nav className="flex gap-10">
          {TABS.map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-current={active ? 'page' : undefined}
                className={`relative pb-1.5 text-[.72rem] font-medium uppercase tracking-[.22em] transition-colors ${active ? 'text-gold-300' : 'text-mist hover:text-ivory'}`}
              >
                {t.label}
                {active && <motion.span layoutId="nav-line" className="absolute inset-x-0 -bottom-px h-px bg-gold-500" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
              </button>
            )
          })}
        </nav>
        <span className="hidden w-32 truncate text-right text-xs text-mist lg:block">{session.user.email}</span>
        <span className="w-32 lg:hidden" />
      </header>

      <main className="safe-top min-h-0 flex-1 pt-3 md:pt-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            className="h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {tab === 'booster' && <BoosterPack onOpened={refresh} onOpenCard={setModal} />}
            {tab === 'binder' && <Binder collection={collection} known={known} onOpenCard={setModal} />}
            {tab === 'account' && (
              <div className="mx-auto max-w-sm space-y-6 px-5 pt-14 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-[var(--hair-strong)] font-display text-2xl text-gold-300">
                  {session.user.email?.[0]?.toUpperCase() || '?'}
                </div>
                <h1 className="title text-3xl text-ivory">Mon compte</h1>
                <p className="break-all text-sm text-mist">{session.user.email}</p>
                <div className="hairline" />
                <button onClick={() => supabase.auth.signOut()} className="btn w-full">Se déconnecter</button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Barre du bas (mobile) */}
      <nav className="safe-bottom flex border-t border-[var(--hair)] bg-black/85 backdrop-blur-xl md:hidden">
        {TABS.map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[.62rem] font-medium uppercase tracking-[.18em] transition-colors ${active ? 'text-gold-300' : 'text-mist'}`}
            >
              {active && <motion.span layoutId="nav-top" className="absolute inset-x-10 top-0 h-px bg-gold-500" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
              {t.icon}
              {t.label}
            </button>
          )
        })}
      </nav>

      <CardModal card={modal} onClose={closeModal} />
    </div>
  )
}
