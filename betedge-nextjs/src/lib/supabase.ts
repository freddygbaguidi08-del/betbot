import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ─── Initialisation lazy ─────────────────────────────────────
// Le client n'est créé que lors du premier appel, pas au démarrage
let _client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont requis dans les variables d\'environnement Vercel.')
  }
  _client = createClient(url, key)
  return _client
}

// ─── Settings ────────────────────────────────────────────────
export async function getSettings() {
  try {
    const { data, error } = await getClient()
      .from('settings')
      .select('*')
      .eq('user_id', 'default')
      .single()
    if (error) return null
    return data
  } catch { return null }
}

export async function saveSettings(settings: Record<string, unknown>) {
  try {
    const { error } = await getClient()
      .from('settings')
      .upsert({ ...settings, user_id: 'default', updated_at: new Date().toISOString() })
    return !error
  } catch { return false }
}

// ─── Bets ─────────────────────────────────────────────────────
export async function getBets(limit = 100) {
  try {
    const { data, error } = await getClient()
      .from('bets')
      .select('*')
      .eq('user_id', 'default')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) return []
    return data
  } catch { return [] }
}

export async function insertBet(bet: Record<string, unknown>) {
  try {
    const { data, error } = await getClient()
      .from('bets')
      .insert({ ...bet, user_id: 'default' })
      .select()
      .single()
    if (error) return null
    return data
  } catch { return null }
}

export async function updateBetResult(id: string, result: string, pnl: number) {
  try {
    const { error } = await getClient()
      .from('bets')
      .update({ result, pnl })
      .eq('id', id)
    return !error
  } catch { return false }
}

export async function deleteBet(id: string) {
  try {
    const { error } = await getClient().from('bets').delete().eq('id', id)
    return !error
  } catch { return false }
}

// ─── IA Analyses ─────────────────────────────────────────────
export async function getAnalyses(limit = 50) {
  try {
    const { data, error } = await getClient()
      .from('ia_analyses')
      .select('*')
      .eq('user_id', 'default')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) return []
    return data
  } catch { return [] }
}

export async function insertAnalysis(analysis: Record<string, unknown>) {
  try {
    const { data, error } = await getClient()
      .from('ia_analyses')
      .insert({ ...analysis, user_id: 'default' })
      .select()
      .single()
    if (error) return null
    return data
  } catch { return null }
}

export async function updateAnalysisResult(id: string, result: string) {
  try {
    const { error } = await getClient()
      .from('ia_analyses')
      .update({ result })
      .eq('id', id)
    return !error
  } catch { return false }
}

// ─── Scans ───────────────────────────────────────────────────
export async function insertScan(scan: Record<string, unknown>) {
  try {
    const { error } = await getClient()
      .from('scans')
      .insert({ ...scan, user_id: 'default' })
    return !error
  } catch { return false }
}

// ─── Alerts ──────────────────────────────────────────────────
export async function insertAlert(alert: Record<string, unknown>) {
  try {
    const { error } = await getClient()
      .from('alerts')
      .insert({ ...alert, user_id: 'default' })
    return !error
  } catch { return false }
}

export async function getAlerts(limit = 50) {
  try {
    const { data, error } = await getClient()
      .from('alerts')
      .select('*')
      .eq('user_id', 'default')
      .order('sent_at', { ascending: false })
      .limit(limit)
    if (error) return []
    return data
  } catch { return [] }
}

// ─── Analytics ───────────────────────────────────────────────
export async function getAnalytics() {
  try {
    const bets = await getBets(500)
    const closed = bets.filter((b: Record<string,unknown>) => b.result !== 'pending')
    const wins   = closed.filter((b: Record<string,unknown>) => b.result === 'win').length
    const totalStaked = closed.reduce((s: number, b: Record<string,unknown>) => s + Number(b.stake), 0)
    const totalPnl    = closed.reduce((s: number, b: Record<string,unknown>) => s + Number(b.pnl || 0), 0)
    const roi = totalStaked > 0 ? (totalPnl / totalStaked) * 100 : 0
    return {
      totalBets: bets.length,
      closedBets: closed.length,
      wins,
      losses: closed.length - wins,
      winRate: closed.length > 0 ? (wins / closed.length) * 100 : 0,
      totalStaked,
      totalPnl,
      roi,
    }
  } catch {
    return { totalBets:0, closedBets:0, wins:0, losses:0, winRate:0, totalStaked:0, totalPnl:0, roi:0 }
  }
}
