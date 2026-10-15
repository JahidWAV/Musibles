import { useEffect, useMemo } from 'react'
import { CURRENCY, fmtNum } from '../constants'
import { useApp } from '../AppContext'

const Stat = ({ label, value }) => (
  <div className="border border-[var(--hair)] px-4 py-3 text-left">
    <dt className="text-[.65rem] uppercase tracking-[.2em] text-mist">{label}</dt>
    <dd className="title mt-1 text-2xl text-gold-300">{value}</dd>
  </div>
)

export default function AccountPage() {
  const { session, collection, balance, signOut } = useApp()
  useEffect(() => { document.title = 'Compte · Cineclub' }, [])

  const { total, distinct } = useMemo(() => {
    const list = Object.values(collection)
    return { distinct: list.length, total: list.reduce((n, c) => n + (c.count || 1), 0) }
  }, [collection])

  const email = session.user.email

  return (
    <div className="mx-auto h-full max-w-md overflow-y-auto px-5 pb-12 pt-10 text-center md:pt-16">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-[var(--hair-strong)] font-display text-2xl text-gold-300">
        {email?.[0]?.toUpperCase() || '?'}
      </div>
      <h1 className="title mt-5 text-4xl text-ivory">Mon compte</h1>
      <p className="mt-2 break-all text-sm text-mist">{email}</p>

      <div className="hairline my-8" />

      <dl className="grid grid-cols-2 gap-3">
        <Stat label={CURRENCY} value={fmtNum(balance)} />
        <Stat label="Cartes" value={fmtNum(total)} />
        <Stat label="Différentes" value={fmtNum(distinct)} />
      </dl>

      <button onClick={signOut} className="btn mt-10 w-full">Se déconnecter</button>
    </div>
  )
}
