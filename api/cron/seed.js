import { seedCharts, seedCommons } from '../_lib/lastfm.js'

// Appelé chaque nuit par Vercel Cron (voir vercel.json). Vercel envoie CRON_SECRET en Bearer.
export default async function handler(req, res) {
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).end()
  await seedCharts()
  const commons = await seedCommons(40)
  return res.json({ ok: true, commons })
}
