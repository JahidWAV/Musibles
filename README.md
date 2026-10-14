# Musibles

Jeu de collection de cartes d'artistes (Vite + React + Tailwind), données Last.fm.

## Lancer
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # génère /dist
```

## Déployer
Pousse sur GitHub, puis « Import Project » sur Vercel : le preset Vite est détecté (voir `vercel.json`).

## Notes
- Clé API : variable Vercel `LASTFM_API_KEY` (sans préfixe VITE_), lue uniquement par `api/lastfm.js`. En local : `npx vercel dev` avec un `.env`.
- Raretés : voir `getRarity()` dans `src/services/lastfm.js`.
- Photos : Last.fm ne fournit plus d'images d'artistes, le service complète via TheAudioDB (clé de test publique), puis des initiales en dernier recours.

## Architecture (tout est géré côté serveur)
- `api/booster.js` : tirage des cartes, attribution, délai entre boosters (POST, JWT requis).
- `api/collection.js` : album du joueur + catalogue des emplacements (GET, JWT requis).
- `api/cron/seed.js` : alimentation nocturne du catalogue (Vercel Cron).
- `api/_lib/` : client Supabase (service role), appels Last.fm, taux de drop (`config.js`).
- Le navigateur ne fait que l'authentification Supabase et appelle `/api/*`. La table `collection` est en lecture seule pour lui (RLS).

## Mise en place
1. Supabase : exécute `supabase/schema.sql` (attention : supprime l'ancienne table `collection`). Authentication > URL Configuration : renseigne « Site URL ».
2. Vercel > Environment Variables : voir `.env.example` (`SUPABASE_SERVICE_ROLE_KEY`, `LASTFM_API_KEY` et `CRON_SECRET` sans préfixe VITE_).
3. En local : `npm i -g vercel` puis `vercel dev` (`npm run dev` ne sert pas `/api`).
