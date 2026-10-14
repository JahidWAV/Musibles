import { useState } from 'react'
import { supabase } from '../services/supabase'

const MESSAGES = {
  'Invalid login credentials': 'Email ou mot de passe incorrect.',
  'User already registered': 'Un compte existe déjà avec cet email.',
  'Email not confirmed': 'Confirme ton email avec le lien reçu avant de te connecter.',
}

export default function AuthScreen() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [st, setSt] = useState({ busy: false, error: '', info: '' })

  async function submit(e) {
    e.preventDefault()
    setSt({ busy: true, error: '', info: '' })
    const { data, error } = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    if (error) return setSt({ busy: false, error: MESSAGES[error.message] || error.message, info: '' })
    if (mode === 'signup' && !data.session) return setSt({ busy: false, error: '', info: 'Compte créé. Confirme ton email avec le lien reçu, puis connecte-toi.' })
    setSt({ busy: false, error: '', info: '' })
  }

  const input = 'w-full rounded-2xl bg-night px-4 py-3 text-base ring-1 ring-plum placeholder:text-mist/50'
  return (
    <main className="safe-top flex h-full flex-col items-center justify-center gap-6 px-5">
      <h1 className="font-display text-5xl font-extrabold text-honey">Musibles</h1>
      <p className="max-w-xs text-center text-mist">Connecte-toi pour retrouver ton album sur tous tes appareils.</p>
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-3xl bg-dusk/80 p-6 ring-1 ring-plum">
        <h2 className="font-display text-2xl font-extrabold">{mode === 'signin' ? 'Connexion' : 'Créer un compte'}</h2>
        <input className={input} type="email" required autoComplete="email" placeholder="Email" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={input} type="password" required minLength={6} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} placeholder="Mot de passe (6 caractères min.)" aria-label="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} />
        {st.error && <p role="alert" className="text-sm text-rose">{st.error}</p>}
        {st.info && <p role="status" className="text-sm text-mint">{st.info}</p>}
        <button disabled={st.busy} className="w-full rounded-2xl bg-honey py-3 font-bold text-night disabled:opacity-50">
          {st.busy ? 'Un instant…' : mode === 'signin' ? 'Se connecter' : 'Créer mon compte'}
        </button>
        <button type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setSt({ busy: false, error: '', info: '' }) }} className="w-full py-1 text-sm text-mist underline">
          {mode === 'signin' ? 'Pas de compte ? Créer un compte' : 'Déjà un compte ? Se connecter'}
        </button>
      </form>
    </main>
  )
}
