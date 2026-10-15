import { useEffect } from 'react'
import { useApp } from '../AppContext'
import Auctions from '../components/Auctions'

export default function AuctionsPage() {
  const { balance, setBalance, refresh, notify } = useApp()
  useEffect(() => { document.title = 'Enchères · Cineclub' }, [])
  return <Auctions balance={balance} onBalance={setBalance} onChanged={refresh} notify={notify} />
}
