import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from './services/supabase'
import { fetchCollection } from './services/api'
import AuthScreen from './components/AuthScreen'
import BoosterPack from './components/BoosterPack'
import Binder from './components/Binder'
import CardModal from './components/CardModal'

const Icon = ({ children }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
        <motion.h1
          className="gold-text font-display text-4xl font-black tracking-[.14em]"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        >
          CINECLUB
        </motion.h1>
      </main>
    )
  }
  if (!session) return <AuthScreen />

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col">
      {syncError && <p role="alert" className="safe-top bg-rose px-4 py-2 text-center text-sm font-semibold text-black">{syncError}</p>}

      <main className="safe-top min-h-0 flex-1 pt-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            className="h-full"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {tab === 'booster' && <BoosterPack onOpened={refresh} onOpenCard={setModal} />}
            {tab === 'binder' && <Binder collection={collection} known={known} onOpenCard={setModal} />}
            {tab === 'account' && (
              <div className="mx-auto max-w-sm space-y-5 px-5 pt-10 text-center">
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-b from-gold-300 to-gold-700 font-display text-3xl font-bold text-black shadow-gold">
                  {session.user.email?.[0]?.toUpperCase() || '?'}
                </div>
                <h1 className="font-display text-2xl font-bold text-ivory">Mon compte</h1>
                <p className="break-all text-mist">{session.user.email}</p>
                <div className="gold-rule" />
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="w-full rounded-xl bg-white/5 py-3 font-semibold ring-1 ring-gold-500/30 transition hover:bg-gold-500/10"
                >
                  Se déconnecter
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="safe-bottom relative flex border-t border-gold-500/20 bg-black/80 backdrop-blur-xl">
        {TABS.map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-semibold transition-colors ${active ? 'text-gold-400' : 'text-mist hover:text-ivory'}`}
            >
              {active && (
                <motion.span
                  layoutId="nav-glow"
                  className="absolute inset-x-6 top-0 h-[2px] rounded-full bg-gold-400"
                  style={{ boxShadow: '0 0 14px 2px rgba(251,191,36,.7)' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                />
              )}
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
