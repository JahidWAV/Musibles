import { seedCharts, seedCommons } from '../_lib/lastfm.js'

// Appelé chaque nuit par Vercel Cron (voir vercel.json). Vercel envoie CRON_SECRET en Bearer.
export default async function handler(req, res) {
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end()
  }

  // Explore jusqu'à 100 pages de chart (5 000 artistes) au lieu de 20
  await seedCharts(100)
  const commons = await seedCommons(100)

  return res.json({ ok: true, commons })
}
