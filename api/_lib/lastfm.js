import { db } from './db.js'
import { DROP_RATES, TAGS, getRarity } from './config.js'

const BASE = 'https://ws.audioscrobbler.com/2.0/'
const LASTFM_PLACEHOLDER = '2a96cbd8b46e442fc41c2b86b821562f'
const PAGE_SIZE = 50
const DETAIL_TTL = 7 * 24 * 3600 * 1000

const slug = (n) => n.toLowerCase().trim()
const rand = (a) => a[Math.floor(Math.random() * a.length)]
const between = (a, b) => a + Math.floor(Math.random() * (b - a + 1))

async function lfm(params) {
  const qs = new URLSearchParams({ ...params, api_key: process.env.LASTFM_API_KEY, format: 'json' })
  const res = await fetch(`${BASE}?${qs}`)
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.message || `Last.fm ${res.status}`)
  return data
}

async function upsert(rows, ignoreDuplicates = false) {
  if (!rows.length) return
  const { error } = await db.from('artists').upsert(rows, { onConflict: 'id', ignoreDuplicates })
  if (error) throw error
}

const lastfmPhoto = (artist) => {
  const lf = artist.image?.find((i) => i.size === 'extralarge')?.['#text']
  return lf && !lf.includes(LASTFM_PLACEHOLDER) ? lf : null
}

async function photo(artist) {
  const lf = lastfmPhoto(artist)
  if (lf) return lf
  try {
    const key = process.env.THEAUDIODB_API_KEY || '2'
    const r = await fetch(`https://www.theaudiodb.com/api/v1/json/${key}/search.php?s=${encodeURIComponent(artist.name)}`)
    return (await r.json()).artists?.[0]?.strArtistThumb || null
  } catch { return null }
}

async function info(name) {
  const { artist } = await lfm({ method: 'artist.getinfo', artist: name, autocorrect: 1 })
  const listeners = +artist.stats.listeners
  return {
    artist,
    row: {
      id: slug(name),
      name: artist.name,
      listeners,
      playcount: +artist.stats.playcount,
      rarity: getRarity(listeners),
      tags: (artist.tags?.tag || []).slice(0, 3).map((t) => t.name),
      bio: (artist.bio?.summary || '').replace(/<a[\s\S]*?<\/a>/g, '').replace(/<[^>]+>/g, '').trim(),
      url: artist.url,
      updated_at: new Date().toISOString(),
    },
  }
}

/** Fiche complète (avec photo) d'un artiste, enregistrée en base. */
async function fetchDetail(name) {
  const { artist, row } = await info(name)
  const full = { ...row, image: await photo(artist), detailed: true }
  await upsert([full])
  return full
}

/** Classement mondial (pages 1 à 20) : alimente les paliers Rare, Épique et Légendaire. */
export async function seedCharts() {
  const pages = await Promise.all(
    Array.from({ length: 20 }, (_, i) => lfm({ method: 'chart.gettopartists', limit: 50, page: i + 1 }).catch(() => null)),
  )
  const rows = new Map()
  for (const a of pages.flatMap((d) => d?.artists?.artist || [])) {
    rows.set(slug(a.name), { id: slug(a.name), name: a.name, listeners: +a.listeners, rarity: getRarity(+a.listeners) })
  }
  await upsert([...rows.values()])
}

/** Artistes peu écoutés, via les tags : alimente le palier Commune. */
export async function seedCommons(target = 25) {
  let added = 0
  for (let round = 0; round < 3 && added < target; round++) {
    const d = await lfm({ method: 'tag.gettopartists', tag: rand(TAGS), limit: 50, page: between(4, 20) }).catch(() => null)
    const names = (d?.topartists?.artist || []).map((a) => a.name).sort(() => Math.random() - 0.5).slice(0, 15)
    if (!names.length) continue
    const { data: have } = await db.from('artists').select('id').in('id', names.map(slug)).eq('detailed', true)
    const known = new Set((have || []).map((r) => r.id))
    const cards = await Promise.all(names.filter((n) => !known.has(slug(n))).map((n) => fetchDetail(n).catch(() => null)))
    added += cards.filter((c) => c?.rarity === 'common').length
  }
  return added
}

async function countWhere(apply) {
  const { count } = await apply(db.from('artists').select('id', { count: 'exact', head: true }))
  return count || 0
}

async function ensurePools() {
  if ((await countWhere((q) => q.neq('rarity', 'common'))) < 100) await seedCharts()
}

function rollRarity() {
  let r = Math.random()
  for (const [id, p] of Object.entries(DROP_RATES)) if ((r -= p) < 0) return id
  return 'common'
}

async function freshCard(id) {
  const { data: row } = await db.from('artists').select('*').eq('id', id).single()
  if (row.detailed && Date.now() - Date.parse(row.updated_at) < DETAIL_TTL) return row
  try { return await fetchDetail(row.name) } catch { return row.detailed ? row : null }
}

export const toCard = (r) => ({ id: r.id, name: r.name, listeners: r.listeners, playcount: r.playcount, rarity: r.rarity, tags: r.tags, bio: r.bio, url: r.url, image: r.image })

/**
 * Tire `count` cartes : rareté d'abord (DROP_RATES), puis un artiste du palier.
 * - Rare / Épique / Légendaire : tirés dans la base (alimentée par le classement mondial).
 * - Commune : découverte EN DIRECT sur Last.fm (tag au hasard ou artistes similaires d'un artiste connu),
 *   puis enregistrée en base. Le catalogue grandit donc à chaque booster.
 */
export async function drawBooster(count) {
  await ensurePools()
  const used = new Set()
  const totals = {}
  const total = async (tier) =>
    (totals[tier] ??= (await db.from('artists').select('id', { count: 'exact', head: true }).eq('rarity', tier)).count || 0)

  async function randomRow(tier, columns) {
    const n = await total(tier)
    if (!n) return null
    const o = Math.floor(Math.random() * n)
    const { data } = await db.from('artists').select(columns).eq('rarity', tier).order('id').range(o, o)
    return data?.[0] || null
  }

  async function dbPick(tier) {
    for (let k = 0; k < 6; k++) {
      const row = await randomRow(tier, 'id')
      if (row && !used.has(row.id)) { used.add(row.id); return row.id }
    }
    return null
  }

  async function liveCommon() {
    for (let k = 0; k < 6; k++) {
      try {
        let names
        const source = Math.random() < 0.5 ? await randomRow('common', 'name') : null
        if (source) {
          const d = await lfm({ method: 'artist.getsimilar', artist: source.name, limit: 100, autocorrect: 1 })
          names = (d.similarartists?.artist || []).map((a) => a.name)
        } else {
          const d = await lfm({ method: 'tag.gettopartists', tag: rand(TAGS), limit: PAGE_SIZE, page: between(2, 25) })
          names = d.topartists.artist.map((a) => a.name)
        }
        const name = rand(names.filter((n) => !used.has(slug(n))))
        if (!name) continue
        const { data: have } = await db.from('artists').select('*').eq('id', slug(name)).maybeSingle()
        const row = have?.detailed && have.rarity === 'common' ? have : await fetchDetail(name)
        if (row.rarity === 'common' && !used.has(row.id)) { used.add(row.id); return row }
      } catch { /* on retente avec un autre artiste */ }
    }
    return null
  }

  async function one() {
    const tier = rollRarity()
    if (tier === 'common') { const row = await liveCommon(); if (row) return row }
    for (const t of [tier, 'rare', 'common']) {
      const id = await dbPick(t)
      if (id) return freshCard(id)
    }
    return null
  }

  const seen = new Set()
  const cards = (await Promise.all(Array.from({ length: count }, one)))
    .filter((c) => c && !seen.has(c.id) && seen.add(c.id))
    .map(toCard)
  if (!cards.length) throw new Error('Aucune carte disponible.')
  return cards
}
