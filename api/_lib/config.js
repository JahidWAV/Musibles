export const BOOSTER_SIZE = 5
export const DROP_RATES = { common: 0.55, rare: 0.28, epic: 0.14, legendary: 0.03 }
// Les artistes < 500 k auditeurs sont hors classement : on les cherche dans les tags
export const TAGS = ['rock', 'pop', 'indie', 'electronic', 'hip-hop', 'jazz', 'metal', 'folk', 'alternative', 'rnb', 'punk', 'ambient', 'reggae', 'soul', 'country', 'classical', 'blues', 'funk', 'disco', 'house', 'techno', 'trance', 'drum and bass', 'dubstep', 'trap', 'k-pop', 'j-pop', 'french', 'latin', 'salsa', 'afrobeat', 'world', 'singer-songwriter', 'shoegaze', 'post-rock', 'hardcore', 'black metal', 'death metal', 'synthpop', 'new wave', 'lo-fi', 'soundtrack', 'experimental', 'gospel', 'ska', 'grunge', 'emo', 'chillout', 'downtempo', 'idm']

export function getRarity(listeners) {
  if (listeners > 4_000_000) return 'legendary'
  if (listeners >= 1_500_000) return 'epic'
  if (listeners >= 500_000) return 'rare'
  return 'common'
}
