import { Suspense } from 'react'
import { NavLink, useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CURRENCY, fmtNum } from '../constants'
import { useApp } from '../AppContext'
import CardModal from './CardModal'

const Icon = ({ children }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

const NAV = [
  {
    to: '/booster', label: 'Booster',
    icon: <Icon><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13" /><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" /><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" /></Icon>,
  },
  {
    to: '/album', label: 'Album',
    icon: <Icon><path d="M12 7v14" /><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" /></Icon>,
  },
  {
    to: '/encheres', label: 'Enchères',
    icon: <Icon><path d="m14.5 12.5-8 8a2.119 2.119 0 1 1-3-3l8-8" /><path d="m16 16 6-6" /><path d="m8 8 6-6" /><path d="m9 7 8 8" /><path d="m21 11-8-8" /></Icon>,
  },
  {
    to: '/compte', label: 'Compte',
    icon: <Icon><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></Icon>,
  },
]

const Balance = ({ value }) => (
  <span className="whitespace-nowrap text-sm tabular-nums text-gold-300" aria-label={`${fmtNum(value)} ${CURRENCY}`}>
    {fmtNum(value)} <span className="text-mist">{CURRENCY}</span>
  </span>
)

export default function Layout() {
  const { balance, syncError, notice, modal, closeModal, doScrap, doAuction } = useApp()
  const location = useLocation()
  // useOutlet : l'ancienne page garde son contenu pendant l'animation de sortie
  const outlet = useOutlet()

  return (
    <div className="flex h-full w-full flex-col">
      {syncError && <p role="alert" className="safe-top bg-rose px-4 py-2 text-center text-sm font-medium text-black">{syncError}</p>}

      {/* Barre du haut (ordinateur) */}
      <header className="safe-top hidden items-center justify-between border-b border-[var(--hair)] px-10 pb-5 pt-5 md:flex">
        <NavLink to="/booster" className="wordmark text-xl">Cineclub</NavLink>
        <nav className="flex gap-10" aria-label="Navigation principale">
          {NAV.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `relative pb-1.5 text-[.72rem] font-medium uppercase tracking-[.22em] transition-colors ${isActive ? 'text-gold-300' : 'text-mist hover:text-ivory'}`}
            >
              {({ isActive }) => (
                <>
                  {t.label}
                  {isActive && <motion.span layoutId="nav-line" className="absolute inset-x-0 -bottom-px h-px bg-gold-500" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="w-44 text-right"><Balance value={balance} /></div>
      </header>

      {/* Barre du haut (mobile) : solde toujours visible */}
      <div className="safe-top flex items-center justify-between px-5 pb-1 md:hidden">
        <span className="wordmark text-sm">Cineclub</span>
        <Balance value={balance} />
      </div>

      <main className="min-h-0 flex-1 pt-2 md:pt-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            className="h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Suspense fallback={<p className="mt-24 text-center text-sm text-mist">Chargement…</p>}>{outlet}</Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Barre du bas (mobile) */}
      <nav className="safe-bottom flex border-t border-[var(--hair)] bg-black/85 backdrop-blur-xl md:hidden" aria-label="Navigation principale">
        {NAV.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[.58rem] font-medium uppercase tracking-[.16em] transition-colors ${isActive ? 'text-gold-300' : 'text-mist'}`}
          >
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="nav-top" className="absolute inset-x-8 top-0 h-px bg-gold-500" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                {t.icon}
                {t.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <AnimatePresence>
        {notice && (
          <motion.p
            key={notice.at}
            role="status"
            className={`fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 whitespace-nowrap border bg-black/90 px-6 py-3 text-sm backdrop-blur md:bottom-10 ${notice.type === 'error' ? 'border-rose/60 text-rose' : 'border-[var(--hair-strong)] text-gold-300'}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            {notice.text}
          </motion.p>
        )}
      </AnimatePresence>

      <CardModal card={modal} onClose={closeModal} onScrap={doScrap} onAuction={doAuction} />
    </div>
  )
}
