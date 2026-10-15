import { useCallback, useEffect, useState } from 'react'
import { fetchPacks } from './services/api'

export function usePacks() {
  const [info, setInfo] = useState(null) // { packs, max, cooldownSeconds, nextPackAt }
  const [left, setLeft] = useState(0)    // secondes avant le prochain pack

  const reload = useCallback(() => fetchPacks().then(setInfo).catch(() => {}), [])
  useEffect(() => { reload() }, [reload])

  useEffect(() => {
    if (!info?.nextPackAt) return setLeft(0)
    const tick = () => {
      const s = Math.max(0, Math.ceil((new Date(info.nextPackAt) - Date.now()) / 1000))
      setLeft(s)
      if (s === 0) reload() // pack gagné : on resynchronise
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [info, reload])

  const fmt = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
  return { info, setInfo, reload, countdown: left > 0 ? fmt : null }
}
