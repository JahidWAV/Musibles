import { useState } from 'react'
import { motion } from 'framer-motion'
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

  return (
    <main className="safe-top relative flex h-full flex-col items-center justify-center gap-12 overflow-hidden px-6">
      <div className="beam" />

      <motion.div
        className="relative text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
      >
        <h1 className="wordmark text-3xl sm:text-4xl">Cineclub</h1>
        <div className="hairline mx-auto mt-5 w-48" />
        <p className="title mx-auto mt-5 max-w-xs text-xl italic text-mist">Ta collection, sur tous tes écrans.</p>
      </motion.div>

      <motion.form
        onSubmit={submit}
        className="relative w-full max-w-sm space-y-6 border border-[var(--hair)] bg-black/40 p-8 backdrop-blur-sm"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
      >
        <h2 className="title text-2xl text-ivory">{mode === 'signin' ? 'Connexion' : 'Créer un compte'}</h2>
        <input className="field" type="email" required autoComplete="email" placeholder="Email" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="field" type="password" required minLength={6} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} placeholder="Mot de passe (6 caractères min.)" aria-label="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} />
        {st.error && <p role="alert" className="text-sm text-rose">{st.error}</p>}
        {st.info && <p role="status" className="text-sm text-mint">{st.info}</p>}
        <button disabled={st.busy} className="btn btn-fill w-full">
          {st.busy ? 'Un instant…' : mode === 'signin' ? 'Se connecter' : 'Créer mon compte'}
        </button>
        <button
          type="button"
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setSt({ busy: false, error: '', info: '' }) }}
          className="w-full text-sm text-mist underline underline-offset-4 transition-colors hover:text-gold-300"
        >
          {mode === 'signin' ? 'Pas de compte ? Créer un compte' : 'Déjà un compte ? Se connecter'}
        </button>
      </motion.form>
    </main>
  )
}
