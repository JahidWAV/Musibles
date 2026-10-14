/** Classement mondial : explore jusqu'à 100 pages (soit 5 000 artistes) et pagine pour ne pas surcharger les APIs */
export async function seedCharts(maxPages = 100) {
  const rows = new Map()
  const chunkSize = 10 // Traitement par paquets de 10 pages simultanées

  for (let i = 0; i < maxPages; i += chunkSize) {
    const pagePromises = Array.from({ length: chunkSize }, (_, idx) => {
      const page = i + idx + 1
      if (page > maxPages) return null
      return lfm({ method: 'chart.gettopartists', limit: 50, page }).catch(() => null)
    }).filter(Boolean)

    const pages = await Promise.all(pagePromises)

    for (const d of pages) {
      for (const a of d?.artists?.artist || []) {
        if (!a?.name || !a?.listeners) continue
        const listeners = +a.listeners
        rows.set(slug(a.name), {
          id: slug(a.name),
          name: a.name,
          listeners,
          rarity: getRarity(listeners),
        })
      }
    }
  }

  await upsert([...rows.values()], true)
}
