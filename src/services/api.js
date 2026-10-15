import { supabase } from './supabase'

async function request(path, options = {}) {
  const { data } = await supabase.auth.getSession()
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw Object.assign(new Error(body.message || `Erreur serveur (${res.status}).`), {
      status: res.status,
      data: body, // sur un 429 : { packs, max, cooldownSeconds, nextPackAt }
    })
  }
  return body
}

export const fetchCollection = () => request('/api/collection')
export const fetchPacks = () => request('/api/booster')
export const openBooster = () => request('/api/booster', { method: 'POST' })
