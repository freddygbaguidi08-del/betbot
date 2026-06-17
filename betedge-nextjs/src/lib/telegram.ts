// ─── Telegram Bot — côté SERVEUR (pas de problème CORS) ──────
// Ce fichier est utilisé uniquement dans les API routes Next.js

const TG_BASE = 'https://api.telegram.org'

function getToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN manquant dans .env.local')
  return token
}
function getChatId(): string {
  const id = process.env.TELEGRAM_CHAT_ID
  if (!id) throw new Error('TELEGRAM_CHAT_ID manquant dans .env.local')
  return id
}

export async function sendMessage(text: string, chatId?: string): Promise<boolean> {
  try {
    const token = getToken()
    const chat  = chatId || getChatId()
    const res   = await fetch(`${TG_BASE}/bot${token}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ chat_id: chat, text }),
    })
    const data = await res.json()
    return data.ok === true
  } catch { return false }
}

export async function testConnection(token: string, chatId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res  = await fetch(`${TG_BASE}/bot${token}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        chat_id: chatId,
        text: 'BetEdge connecte ! Ton bot fonctionne. Coupe du Monde 2026 surveille.',
      }),
    })
    const data = await res.json()
    if (data.ok) return { ok: true }
    return { ok: false, error: data.description || 'Erreur inconnue' }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erreur réseau' }
  }
}

// ─── Messages formatés ───────────────────────────────────────
export function msgValueBet(opts: {
  match: string; competition: string; selection: string
  odd: number; bk: string; edge: number; stake: number; heure: string
}): string {
  return [
    'VALUE BET DETECTEE',
    '',
    opts.match + ' - ' + opts.competition,
    'Selection: ' + opts.selection,
    'Cote: ' + opts.odd + ' @ ' + opts.bk,
    'Edge: +' + opts.edge.toFixed(1) + '%',
    'Mise Kelly: ' + opts.stake + ' EUR',
    'Match: ' + opts.heure,
    '',
    'BetEdge - Alerte automatique',
  ].join('\n')
}

export function msgArbitrage(opts: {
  match: string; sport: string; profitPct: number; profit: number
  outcomes: { name: string; odd: number; bk: string; stake: number }[]
}): string {
  const lines = [
    'ARBITRAGE TROUVE',
    '',
    opts.match + ' - ' + opts.sport,
    'Profit garanti: +' + opts.profitPct.toFixed(2) + '%',
    'Mise 500 EUR - Retour: ' + Math.round(500 + opts.profit) + ' EUR',
    '',
  ]
  opts.outcomes.forEach(o => {
    lines.push(o.bk + ': ' + o.name + ' @ ' + o.odd.toFixed(2) + ' -> ' + Math.round(o.stake) + ' EUR')
  })
  lines.push('', 'Agis vite !')
  return lines.join('\n')
}

export function msgDigest(opts: {
  date: string; matches: string[]; vbCount: number; arbCount: number
}): string {
  return [
    'DIGEST BETEDGE - ' + opts.date,
    '',
    'Matchs du jour:',
    ...opts.matches.slice(0, 5),
    '',
    'Value bets detectees: ' + opts.vbCount,
    'Arbitrages actifs: ' + opts.arbCount,
    '',
    'Bonne chance !',
  ].join('\n')
}

export function msgStopLoss(opts: { lostToday: number; maxLoss: number }): string {
  return [
    'STOP-LOSS ATTEINT',
    '',
    'Perte du jour: ' + opts.lostToday + ' EUR / ' + opts.maxLoss + ' EUR',
    'ARRETEZ de parier aujourd\'hui',
    '',
    'BetEdge Bot - Gestion du risque',
  ].join('\n')
}

export function msgIaReco(opts: {
  match: string; reco: string; confidence: number; edge: number; stake: number
}): string {
  return [
    'RECOMMANDATION IA',
    '',
    opts.match,
    'Recommandation: ' + opts.reco,
    'Confiance: ' + opts.confidence + '%',
    'Edge IA: ' + (opts.edge > 0 ? '+' : '') + opts.edge.toFixed(1) + '%',
    'Mise suggeree: ' + opts.stake + ' EUR',
    '',
    'BetEdge - Claude Sonnet 4.6',
  ].join('\n')
}
