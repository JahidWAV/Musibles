import { useEffect } from 'react'
import { useApp } from '../AppContext'
import Binder from '../components/Binder'

export default function AlbumPage() {
  const { collection, known, openCard } = useApp()
  useEffect(() => { document.title = 'Album · Cineclub' }, [])
  return <Binder collection={collection} known={known} onOpenCard={openCard} />
}
