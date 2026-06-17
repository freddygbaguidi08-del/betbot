# BetEdge — Guide de déploiement complet

## Stack
- **Frontend + Backend** : Next.js 14 (App Router)
- **Base de données** : Supabase (PostgreSQL gratuit)
- **Hébergement** : Vercel (gratuit)
- **Cotes live** : The Odds API
- **IA** : Claude Sonnet 4.6 (Anthropic)
- **Alertes** : Telegram Bot API (côté serveur, sans CORS)

---

## ÉTAPE 1 — Supabase (base de données)

1. Va sur **supabase.com** → New project
2. Donne un nom (ex: `betedge`) → choisis une région proche (ex: `eu-central-1`)
3. Quand le projet est créé → **SQL Editor** → colle tout le contenu de `supabase-schema.sql` → Run
4. **Settings → API** → copie :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## ÉTAPE 2 — Variables d'environnement

Renomme `.env.local` et remplis avec tes vraies clés :

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ton-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
ODDS_API_KEY=ta_cle_odds_api
TELEGRAM_BOT_TOKEN=7123456789:AAF...
TELEGRAM_CHAT_ID=123456789
ANTHROPIC_API_KEY=sk-ant-...
```

---

## ÉTAPE 3 — Lancer en local

```bash
# Installer les dépendances
npm install

# Lancer en développement
npm run dev

# Ouvrir http://localhost:3000
```

---

## ÉTAPE 4 — Déployer sur Vercel

```bash
# Installer Vercel CLI
npm install -g vercel

# Déployer
vercel

# Ajouter les variables d'environnement sur Vercel :
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add ODDS_API_KEY
vercel env add TELEGRAM_BOT_TOKEN
vercel env add TELEGRAM_CHAT_ID
vercel env add ANTHROPIC_API_KEY

# Re-déployer avec les variables
vercel --prod
```

Ou via l'interface Vercel :
1. vercel.com → New Project → Import ton repo GitHub
2. Settings → Environment Variables → colle toutes les variables
3. Redeploy

---

## ÉTAPE 5 — Scan automatique (Cron Vercel)

Ajoute dans `vercel.json` :
```json
{
  "crons": [{
    "path": "/api/scan",
    "schedule": "*/10 * * * *"
  }]
}
```
→ Le scan tourne automatiquement toutes les 10 minutes, 24h/24.

---

## Architecture des API Routes

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/scan` | GET/POST | Scan The Odds API + envoi alertes Telegram |
| `/api/analyze` | POST | Analyse IA d'un match (Claude) |
| `/api/telegram` | POST | Test/envoi messages Telegram côté serveur |

---

## Pages disponibles

| URL | Description |
|-----|-------------|
| `/` | Dashboard principal avec stats |
| `/historique` | Tous les paris + ajout manuel |
| `/analytics` | ROI, courbes, stats par sport |
| `/settings` | Bankroll, Kelly, Telegram, clés API |

---

## Pourquoi Next.js + Supabase ?

1. **Pas de CORS** : les appels Telegram et API se font côté serveur
2. **Persistance** : tous les paris, analyses et scans sont sauvegardés en base
3. **Accessible partout** : ton URL Vercel fonctionne sur PC, mobile, tablette
4. **Cron automatique** : le bot tourne sans que tu ouvres le navigateur
5. **Gratuit** : Vercel + Supabase plan gratuit suffisent pour usage personnel

---

## Groq — Remplacement de Claude IA

Groq est **gratuit** et **plus rapide** que Claude pour l'analyse des matchs.

### Obtenir ta clé Groq (2 minutes)
1. Va sur **console.groq.com** → crée un compte gratuit
2. API Keys → Create API Key → copie la clé (commence par `gsk_`)
3. Colle dans `.env.local` : `GROQ_API_KEY=gsk_...`

### Modèles disponibles
| Modèle | Vitesse | Qualité | Usage |
|--------|---------|---------|-------|
| `llama-3.3-70b-versatile` | Rapide | ⭐⭐⭐⭐⭐ | **Recommandé** |
| `llama-3.1-8b-instant` | Ultra-rapide | ⭐⭐⭐ | Si quota limité |
| `mixtral-8x7b-32768` | Rapide | ⭐⭐⭐⭐ | Alternative |

### Limites plan gratuit Groq
- **14 400 requêtes / jour** → largement suffisant
- **6 000 tokens / minute** → pas de souci pour nos analyses
- Pas de carte bancaire requise
