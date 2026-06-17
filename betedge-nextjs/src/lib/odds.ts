// ─── The Odds API ────────────────────────────────────────────
const BASE = 'https://api.the-odds-api.com/v4'

export interface Outcome {
  name:  string
  price: number
}
export interface Bookmaker {
  title:   string
  markets: { key: string; outcomes: Outcome[] }[]
}
export interface Match {
  id:            string
  sport_key:     string
  sport_title:   string
  commence_time: string
  home_team:     string
  away_team:     string
  bookmakers:    Bookmaker[]
}
export interface ValueBet {
  matchId:     string
  match:       string
  sport:       string
  commence:    string
  outcome:     string
  bestOdd:     number
  bestBk:      string
  modelProb:   number
  impliedProb: number
  edge:        number
  stake:       number
  ev:          number
}
export interface Arbitrage {
  match:     string
  sport:     string
  outcomes:  { name: string; odd: number; bk: string; stake: number }[]
  profitPct: number
  profit:    number
}

// Fetch odds pour un sport
export async function fetchOdds(sportKey: string): Promise<Match[]> {
  const key = process.env.ODDS_API_KEY
  if (!key) throw new Error('ODDS_API_KEY manquante dans .env.local')

  const url = `${BASE}/sports/${sportKey}/odds/?apiKey=${key}&regions=eu&markets=h2h&oddsFormat=decimal&dateFormat=iso`
  const res  = await fetch(url, { next: { revalidate: 300 } }) // cache 5 min

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || `Erreur API ${res.status}`)
  }
  return res.json()
}

// Calculer value bets et arbs
export function calcOpportunities(
  matches: Match[],
  bankroll: number,
  edgeMin: number,
  kellyMode: number,
  arbMin: number
): { vbets: ValueBet[]; arbs: Arbitrage[] } {
  const vbets: ValueBet[] = []
  const arbs:  Arbitrage[] = []

  for (const match of matches) {
    if (!match.bookmakers?.length) continue

    // Construire map des meilleures cotes + toutes cotes par outcome
    const best: Record<string, { odd: number; bk: string }> = {}
    const allMap: Record<string, number[]> = {}

    for (const bk of match.bookmakers) {
      const h2h = bk.markets?.find(m => m.key === 'h2h')
      if (!h2h) continue
      for (const o of h2h.outcomes) {
        if (!best[o.name] || o.price > best[o.name].odd) {
          best[o.name] = { odd: o.price, bk: bk.title }
        }
        if (!allMap[o.name]) allMap[o.name] = []
        allMap[o.name].push(o.price)
      }
    }

    const outcomes = Object.keys(best)
    if (!outcomes.length) continue

    // Devigging : prob modèle = avg implicite normalisé
    const totalSum = outcomes.reduce((s, n) => {
      const avg = allMap[n].reduce((a, b) => a + 1/b, 0) / allMap[n].length
      return s + avg
    }, 0)

    // Value bets
    for (const name of outcomes) {
      const avgImp   = allMap[name].reduce((a, b) => a + 1/b, 0) / allMap[name].length
      const modelProb = avgImp / totalSum
      const bestOdd   = best[name].odd
      const implied   = 1 / bestOdd
      const edge      = ((modelProb - implied) / implied) * 100

      if (edge >= edgeMin) {
        const b     = bestOdd - 1
        const kr    = Math.max(0, (b * modelProb - (1 - modelProb)) / b)
        const stake = Math.round(bankroll * kr * kellyMode)
        const ev    = stake * (modelProb * bestOdd - 1)

        vbets.push({
          matchId: match.id,
          match:   `${match.home_team} vs ${match.away_team}`,
          sport:   match.sport_title,
          commence: match.commence_time,
          outcome: name,
          bestOdd, bestBk: best[name].bk,
          modelProb, impliedProb: implied,
          edge, stake, ev,
        })
      }
    }

    // Arbitrage
    const implSum = outcomes.reduce((s, n) => s + 1 / best[n].odd, 0)
    if (implSum < 1) {
      const pct   = (1 / implSum - 1) * 100
      if (pct >= arbMin) {
        const tot    = 500
        const stakes = outcomes.map(n => tot / (best[n].odd * implSum))
        arbs.push({
          match:  `${match.home_team} vs ${match.away_team}`,
          sport:  match.sport_title,
          outcomes: outcomes.map((n, i) => ({
            name: n, odd: best[n].odd, bk: best[n].bk, stake: stakes[i]
          })),
          profitPct: pct,
          profit: tot / implSum - tot,
        })
      }
    }
  }

  vbets.sort((a, b) => b.edge - a.edge)
  arbs.sort((a, b) => b.profitPct - a.profitPct)
  return { vbets, arbs }
}
