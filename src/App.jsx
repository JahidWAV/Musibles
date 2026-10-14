import { useCallback, useEffect, useState } from 'react'
import { supabase } from './services/supabase'
import { fetchCollection } from './services/api'
import AuthScreen from './components/AuthScreen'
import BoosterPack from './components/BoosterPack'
import Binder from './components/Binder'
import CardModal from './components/CardModal'

const TABS = [
  { id: 'booster', label: 'Booster', icon: '🎁' },
  { id: 'binder', label: 'Album', icon: '📖' },
  { id: 'account', label: 'Compte', icon: '👤' },
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
  if (session === undefined) return <main className="grid h-full place-items-center font-display text-3xl text-honey">Musibles</main>
  if (!session) return <AuthScreen />

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col">
      {syncError && <p role="alert" className="safe-top bg-rose px-4 py-2 text-center text-sm font-semibold text-night">{syncError}</p>}
      <main className="safe-top min-h-0 flex-1 pt-3">
        {tab === 'booster' && <BoosterPack onOpened={refresh} onOpenCard={setModal} />}
        {tab === 'binder' && <Binder collection={collection} known={known} onOpenCard={setModal} />}
        {tab === 'account' && (
          <div className="mx-auto max-w-sm space-y-4 px-5 pt-8 text-center">
            <h1 className="font-display text-3xl font-extrabold">Mon compte</h1>
            <p className="break-all text-mist">{session.user.email}</p>
            <button onClick={() => supabase.auth.signOut()} className="w-full rounded-2xl bg-plum py-3 font-semibold">Se déconnecter</button>
          </div>
        )}
      </main>
      <nav className="safe-bottom flex border-t border-plum bg-night/95 backdrop-blur">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} aria-current={tab === t.id} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-semibold ${tab === t.id ? 'text-honey' : 'text-mist'}`}>
            <span className="text-xl" aria-hidden="true">{t.icon}</span>{t.label}
          </button>
        ))}
      </nav>
      <CardModal card={modal} onClose={closeModal} />
    </div>
  )
}
