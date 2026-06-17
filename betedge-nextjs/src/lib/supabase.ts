import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// ─── Settings ────────────────────────────────────────────────
export async function getSettings() {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', 'default')
    .single()
  if (error) return null
  return data
}

export async function saveSettings(settings: Record<string, unknown>) {
  const { error } = await supabase
    .from('settings')
    .upsert({ ...settings, user_id: 'default', updated_at: new Date().toISOString() })
  return !error
}

// ─── Bets ─────────────────────────────────────────────────────
export async function getBets(limit = 100) {
  const { data, error } = await supabase
    .from('bets')
    .select('*')
    .eq('user_id', 'default')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return []
  return data
}

export async function insertBet(bet: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('bets')
    .insert({ ...bet, user_id: 'default' })
    .select()
    .single()
  if (error) return null
  return data
}

export async function updateBetResult(id: string, result: string, pnl: number) {
  const { error } = await supabase
    .from('bets')
    .update({ result, pnl })
    .eq('id', id)
  return !error
}

export async function deleteBet(id: string) {
  const { error } = await supabase.from('bets').delete().eq('id', id)
  return !error
}

// ─── IA Analyses ─────────────────────────────────────────────
export async function getAnalyses(limit = 50) {
  const { data, error } = await supabase
    .from('ia_analyses')
    .select('*')
    .eq('user_id', 'default')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return []
  return data
}

export async function insertAnalysis(analysis: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('ia_analyses')
    .insert({ ...analysis, user_id: 'default' })
    .select()
    .single()
  if (error) return null
  return data
}

export async function updateAnalysisResult(id: string, result: string) {
  const { error } = await supabase
    .from('ia_analyses')
    .update({ result })
    .eq('id', id)
  return !error
}

// ─── Scans ───────────────────────────────────────────────────
export async function insertScan(scan: Record<string, unknown>) {
  const { error } = await supabase
    .from('scans')
    .insert({ ...scan, user_id: 'default' })
  return !error
}

// ─── Alerts ──────────────────────────────────────────────────
export async function insertAlert(alert: Record<string, unknown>) {
  const { error } = await supabase
    .from('alerts')
    .insert({ ...alert, user_id: 'default' })
  return !error
}

export async function getAlerts(limit = 50) {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('user_id', 'default')
    .order('sent_at', { ascending: false })
    .limit(limit)
  if (error) return []
  return data
}

// ─── Analytics ───────────────────────────────────────────────
export async function getAnalytics() {
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
}
