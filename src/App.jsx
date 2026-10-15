import { lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from './services/supabase'
import { fetchCollection } from './services/api'
import { createAuction, fetchWallet, scrapCards } from './services/market'
import { CURRENCY, fmtNum } from './constants'
import { AppContext } from './AppContext'
import AuthScreen from './components/AuthScreen'
import Layout from './components/Layout'

// Chaque page est un morceau de code séparé : on ne télécharge que celle qu'on visite
const BoosterPage = lazy(() => import('./pages/BoosterPage'))
const AlbumPage = lazy(() => import('./pages/AlbumPage'))
const AuctionsPage = lazy(() => import('./pages/AuctionsPage'))
const AccountPage = lazy(() => import('./pages/AccountPage'))

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = chargement
  const [modal, setModal] = useState(null)
  const [collection, setCollection] = useState({})
  const [known, setKnown] = useState([])
  const [balance, setBalance] = useState(0)
  const [syncError, setSyncError] = useState('')
  const [notice, setNotice] = useState(null)

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

  // Le solde peut changer sans action de ta part (une de tes ventes se termine) : on resynchronise aussi l'album
  const refreshWallet = useCallback(() =>
    fetchWallet()
      .then((d) => { setBalance(d.balance); if (d.settled > 0) refresh() })
      .catch(() => {}), [refresh])

  const uid = session?.user?.id
  useEffect(() => {
    if (!uid) { setCollection({}); setKnown([]); setBalance(0); return }
    refresh()
    refreshWallet()
  }, [uid, refresh, refreshWallet])

  const notify = useCallback((text, type = 'ok') => setNotice({ text, type, at: Date.now() }), [])
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 3500)
    return () => clearTimeout(t)
  }, [notice])

  const closeModal = useCallback(() => setModal(null), [])

  // Ces deux actions LANCENT l'erreur : la fiche carte l'affiche dans son panneau
  const doScrap = useCallback(async (card, qty) => {
    const r = await scrapCards(card, qty)
    setBalance(r.balance)
    notify(`+ ${fmtNum(r.gained)} ${CURRENCY}`)
    setModal(null)
    refresh()
  }, [notify, refresh])

  const doAuction = useCallback(async (card, opts) => {
    await createAuction(card, opts)
    notify('Carte mise aux enchères.')
    setModal(null)
    refresh()
  }, [notify, refresh])

  const ctx = useMemo(() => ({
    session, collection, known, balance, setBalance, syncError, notice,
    modal, openCard: setModal, closeModal,
    refresh, notify, doScrap, doAuction,
    signOut: () => supabase.auth.signOut(),
  }), [session, collection, known, balance, syncError, notice, modal, closeModal, refresh, notify, doScrap, doAuction])

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
    <AppContext.Provider value={ctx}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/booster" replace />} />
            <Route path="booster" element={<BoosterPage />} />
            <Route path="album" element={<AlbumPage />} />
            <Route path="encheres" element={<AuctionsPage />} />
            <Route path="compte" element={<AccountPage />} />
            <Route path="*" element={<Navigate to="/booster" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppContext.Provider>
  )
}
