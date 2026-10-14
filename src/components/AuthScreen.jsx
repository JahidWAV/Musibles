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

  const input = 'w-full rounded-xl bg-black/60 px-4 py-3 text-base text-ivory ring-1 ring-white/10 transition placeholder:text-mist/50 focus:ring-gold-500/70'

  return (
    <main className="safe-top relative flex h-full flex-col items-center justify-center gap-7 overflow-hidden px-5">
      <div className="beam" />

      <motion.div
        className="relative text-center"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      >
        <h1 className="gold-text font-display text-5xl font-black tracking-[.14em] sm:text-6xl">CINECLUB</h1>
        <div className="gold-rule mx-auto mt-3 w-40" />
        <p className="mx-auto mt-3 max-w-xs text-sm text-mist">Connecte-toi pour retrouver ton album sur tous tes appareils.</p>
      </motion.div>

      <motion.form
        onSubmit={submit}
        className="relative w-full max-w-sm space-y-4 rounded-3xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 ring-1 ring-gold-500/25 backdrop-blur-md"
        style={{ boxShadow: '0 30px 80px -30px rgba(245,158,11,.35)' }}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.25, ease: 'easeOut' }}
      >
        <h2 className="font-display text-xl font-bold text-ivory">{mode === 'signin' ? 'Connexion' : 'Créer un compte'}</h2>
        <input className={input} type="email" required autoComplete="email" placeholder="Email" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={input} type="password" required minLength={6} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} placeholder="Mot de passe (6 caractères min.)" aria-label="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} />
        {st.error && <p role="alert" className="text-sm text-rose">{st.error}</p>}
        {st.info && <p role="status" className="text-sm text-mint">{st.info}</p>}
        <button
          disabled={st.busy}
          className="w-full rounded-xl bg-gradient-to-b from-gold-300 to-gold-600 py-3 font-bold text-black shadow-gold-sm transition active:scale-[.98] disabled:opacity-50"
        >
          {st.busy ? 'Un instant…' : mode === 'signin' ? 'Se connecter' : 'Créer mon compte'}
        </button>
        <button
          type="button"
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setSt({ busy: false, error: '', info: '' }) }}
          className="w-full py-1 text-sm text-mist underline underline-offset-4 hover:text-gold-300"
        >
          {mode === 'signin' ? 'Pas de compte ? Créer un compte' : 'Déjà un compte ? Se connecter'}
        </button>
      </motion.form>
    </main>
  )
}
