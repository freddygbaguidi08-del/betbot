import { NextResponse } from 'next/server'
import { fetchOdds, calcOpportunities } from '@/lib/odds'
import { sendMessage, msgValueBet, msgArbitrage } from '@/lib/telegram'
import { getSettings, insertScan, insertAlert } from '@/lib/supabase'

// Sports actifs en juin 2026
const ACTIVE_SPORTS = [
  'soccer_fifa_world_cup',
  'soccer_usa_mls',
  'baseball_mlb',
  'mma_mixed_martial_arts',
]

export async function POST() {
  const start = Date.now()

  try {
    // Charger les settings depuis Supabase
    const settings = await getSettings()
    const bankroll  = settings?.bankroll    || 1000
    const edgeMin   = settings?.edge_min    || 5
    const kellyMode = settings?.kelly_mode  || 0.5
    const arbMin    = settings?.arb_min     || 1
    const tgEnabled = settings?.tg_enabled  || false

    let totalMatches = 0
    let totalVB      = 0
    let totalArb     = 0
    let alertsSent   = 0

    for (const sport of ACTIVE_SPORTS) {
      try {
        const matches = await fetchOdds(sport)
        totalMatches += matches.length

        if (!matches.length) continue

        const { vbets, arbs } = calcOpportunities(
          matches, bankroll, edgeMin, kellyMode, arbMin
        )
        totalVB  += vbets.length
        totalArb += arbs.length

        // Envoyer alertes Telegram si activé
        if (tgEnabled) {
          const chatId = settings?.tg_chat_id

          // Value bets (max 3 par sport)
          for (const vb of vbets.slice(0, 3)) {
            const dt  = new Date(vb.commence)
            const msg = msgValueBet({
              match:      vb.match,
              competition: vb.sport,
              selection:  vb.outcome,
              odd:        vb.bestOdd,
              bk:         vb.bestBk,
              edge:       vb.edge,
              stake:      vb.stake,
              heure:      dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            })
            const sent = await sendMessage(msg, chatId)
            if (sent) {
              alertsSent++
              await insertAlert({ alert_type: 'vb', match_name: vb.match, message: msg, success: true })
            }
          }

          // Arbitrages (max 2)
          for (const arb of arbs.slice(0, 2)) {
            const msg = msgArbitrage({
              match:      arb.match,
              sport:      arb.sport,
              profitPct:  arb.profitPct,
              profit:     arb.profit,
              outcomes:   arb.outcomes,
            })
            const sent = await sendMessage(msg, chatId)
            if (sent) {
              alertsSent++
              await insertAlert({ alert_type: 'arb', match_name: arb.match, message: msg, success: true })
            }
          }
        }
      } catch (sportErr) {
        console.error(`Erreur sport ${sport}:`, sportErr)
      }
    }

    // Logger le scan
    await insertScan({
      matches_loaded: totalMatches,
      vb_found:       totalVB,
      arb_found:      totalArb,
      alerts_sent:    alertsSent,
      scan_duration_ms: Date.now() - start,
    })

    return NextResponse.json({
      ok: true,
      matches:   totalMatches,
      vbets:     totalVB,
      arbs:      totalArb,
      alerts:    alertsSent,
      duration:  Date.now() - start,
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

// GET pour appel depuis cron externe (ex: Vercel Cron)
export async function GET() {
  return POST()
}
