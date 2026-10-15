import { createContext, useContext } from 'react'

// Tout ce que les pages se partagent : session, album, solde, fiche carte ouverte, notifications…
export const AppContext = createContext(null)

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp doit être utilisé à l’intérieur de <AppContext.Provider>')
  return ctx
}
