import { useEffect } from 'react'
import { useApp } from '../AppContext'
import BoosterPack from '../components/BoosterPack'

export default function BoosterPage() {
  const { refresh, openCard } = useApp()
  useEffect(() => { document.title = 'Booster · Cineclub' }, [])
  return <BoosterPack onOpened={refresh} onOpenCard={openCard} />
}
