import { db } from './db.js'

// Fonction pour tirer un booster de cartes depuis Supabase selon les raretés
export async function drawBooster(count = 5) {
  const cards = []

  // Définition des probabilités de rareté (ex: Commun, Rare, Épique, Légendaire)
  // Tu peux ajuster ces pourcentages selon l'équilibrage de ton TCG
  for (let i = 0; i < count; i++) {
    const rand = Math.random() * 100
    let targetRarity = 'common'

    if (rand < 2) targetRarity = 'legendary'       // 2% de chance
    else if (rand < 12) targetRarity = 'epic'     // 10% de chance
    else if (rand < 35) targetRarity = 'rare'     // 23% de chance
    else targetRarity = 'common'                  // 65% de chance

    // Récupérer un artist aléatoire de cette rareté dans Supabase
    // On utilise une requête SQL aléatoire ou un tirage optimisé
    const { data, error } = await db
      .from('artists')
      .select('*')
      .eq('rarity', targetRarity)
      
    if (error || !data || data.length === 0) {
      // Fallback sur un commun si la requête échoue
      const { data: fallbackData } = await db.from('artists').select('*').limit(1)
      if (fallbackData && fallbackData.length > 0) {
        cards.push(fallbackData[0])
      }
      continue
    }

    // Sélection aléatoire parmi les artistes de la liste récupérée
    const randomArtist = data[Math.floor(Math.random() * data.length)]
    
    // Évite les doublons dans le même booster si possible
    if (!cards.some(c => c.id === randomArtist.id)) {
      cards.push(randomArtist)
    } else {
      i-- // Retente un tirage pour ce slot
    }
  }

  return cards
}
