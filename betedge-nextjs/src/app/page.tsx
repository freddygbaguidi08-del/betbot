'use client'
import { useState, useEffect, useCallback } from 'react'
import { getBets, getAnalytics } from '@/lib/supabase'

// ─── Types ───────────────────────────────────────────────────
interface Stats {
  totalBets: number; closedBets: number; wins: number
  losses: number; winRate: number; totalStaked: number
  totalPnl: number; roi: number
}
interface ScanResult {
  ok: boolean; matches: number; vbets: number; arbs: number
  alerts: number; duration: number; error?: string
}

export default function Dashboard() {
  const [stats, setStats]       = useState<Stats | null>(null)
  const [recentBets, setRecentBets] = useState<Record<string,unknown>[]>([])
  const [scanning, setScanning] = useState(false)
  const [lastScan, setLastScan] = useState<ScanResult | null>(null)
  const [loading, setLoading]   = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [s, bets] = await Promise.all([getAnalytics(), getBets(5)])
    setStats(s)
    setRecentBets(bets)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const runScan = async () => {
    setScanning(true)
    try {
      const res = await fetch('/api/scan', { method: 'POST' })
      const data = await res.json()
      setLastScan(data)
      await loadData()
    } catch { setLastScan({ ok: false, matches:0, vbets:0, arbs:0, alerts:0, duration:0, error: 'Erreur réseau' }) }
    setScanning(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{background:'var(--bg)'}}>
      <div className="spinner" style={{width:24,height:24}}></div>
    </div>
  )

  return (
    <div style={{background:'var(--bg)',minHeight:'100vh',padding:'24px'}}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800}}>
            Bet<span style={{color:'var(--green)'}}>Edge</span> Dashboard
          </h1>
          <div style={{fontSize:12,color:'var(--text3)',marginTop:3}}>
            Coupe du Monde 2026 · Value bets · Arbitrages · IA
          </div>
        </div>
        <button
          className="btn btn-green"
          onClick={runScan}
          disabled={scanning}
          style={{fontSize:13,padding:'9px 16px'}}
        >
          {scanning ? <><span className="spinner"></span> Scan...</> : '🔍 Scanner maintenant'}
        </button>
      </div>

      {/* Scan result */}
      {lastScan && (
        <div style={{
          background: lastScan.ok ? 'var(--green-bg,#00d47e18)' : 'var(--red-bg,#ff575715)',
          border: `1px solid ${lastScan.ok ? '#00d47e35' : '#ff575735'}`,
          color: lastScan.ok ? 'var(--green)' : 'var(--red)',
          borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:12,
        }}>
          {lastScan.ok
            ? `✓ Scan terminé — ${lastScan.matches} matchs · ${lastScan.vbets} value bets · ${lastScan.arbs} arbs · ${lastScan.alerts} alertes · ${lastScan.duration}ms`
            : `✗ Erreur scan: ${lastScan.error}`}
        </div>
      )}

      {/* Stats cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[
          { label:'Bankroll', value: '€1 000', sub:'configurable', color:'var(--green)' },
          { label:'ROI global', value: stats ? (stats.roi >= 0 ? '+' : '') + stats.roi.toFixed(1) + '%' : '—', sub: stats ? stats.closedBets + ' paris fermés' : '—', color: stats && stats.roi >= 0 ? 'var(--green)' : 'var(--red)' },
          { label:'Taux de réussite', value: stats && stats.closedBets > 0 ? stats.winRate.toFixed(0) + '%' : '—', sub: stats ? stats.wins + 'W / ' + stats.losses + 'L' : '—', color:'var(--blue)' },
          { label:'P&L total', value: stats ? (stats.totalPnl >= 0 ? '+' : '') + '€' + Math.round(stats.totalPnl) : '€0', sub: '€' + Math.round(stats?.totalStaked || 0) + ' misés', color: stats && stats.totalPnl >= 0 ? 'var(--green)' : 'var(--red)' },
        ].map((s, i) => (
          <div key={i} className="card" style={{padding:'14px 16px'}}>
            <div style={{fontSize:10,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.8px',marginBottom:7}}>{s.label}</div>
            <div style={{fontSize:22,fontWeight:800,color:s.color}}>{s.value}</div>
            <div style={{fontSize:11,color:'var(--text3)',marginTop:3}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[
          { href:'/dashboard',    icon:'⚡', label:'Value Bets',       desc:'Cotes live temps réel',   color:'var(--green)'  },
          { href:'/historique',   icon:'📋', label:'Historique',       desc:'Tous tes paris',           color:'var(--blue)'   },
          { href:'/analytics',    icon:'📊', label:'Analytics',        desc:'ROI, courbes, stats',      color:'var(--yellow)' },
          { href:'/settings',     icon:'⚙️', label:'Paramètres',       desc:'API, Telegram, Kelly',     color:'var(--purple)' },
        ].map((n, i) => (
          <a key={i} href={n.href} style={{textDecoration:'none'}}>
            <div className="card" style={{padding:16,cursor:'pointer',transition:'border .15s'}}
              onMouseEnter={e => (e.currentTarget.style.borderColor = n.color)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
              <div style={{fontSize:24,marginBottom:8}}>{n.icon}</div>
              <div style={{fontSize:13,fontWeight:700,color:n.color,marginBottom:3}}>{n.label}</div>
              <div style={{fontSize:11,color:'var(--text3)'}}>{n.desc}</div>
            </div>
          </a>
        ))}
      </div>

      {/* Recent bets */}
      <div className="card">
        <div style={{padding:'12px 15px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{fontSize:13,fontWeight:600}}>Paris récents</span>
          <a href="/historique" style={{fontSize:12,color:'var(--green)',textDecoration:'none'}}>Voir tout →</a>
        </div>
        <div style={{padding:0}}>
          {recentBets.length === 0 ? (
            <div style={{padding:24,textAlign:'center',color:'var(--text3)',fontSize:13}}>
              Aucun pari enregistré. Lance un scan ou ajoute des paris manuellement.
            </div>
          ) : recentBets.map((bet: Record<string,unknown>, i: number) => {
            const pnl    = Number(bet.pnl) || 0
            const result = String(bet.result || 'pending')
            return (
              <div key={i} style={{display:'grid',gridTemplateColumns:'1fr auto auto auto',gap:10,alignItems:'center',padding:'11px 15px',borderBottom: i < recentBets.length-1 ? '1px solid var(--border)' : 'none'}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600}}>{String(bet.match_name)}</div>
                  <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{String(bet.competition || '—')} · {String(bet.selection || '—')}</div>
                </div>
                <div style={{fontSize:15,fontWeight:700}}>@{Number(bet.odd).toFixed(2)}</div>
                <div style={{fontSize:12,color:'var(--text2)'}}>€{Number(bet.stake)}</div>
                <div style={{
                  fontSize:11,fontWeight:700,padding:'3px 8px',borderRadius:4,
                  background: result==='win'?'var(--green-bg,#00d47e18)':result==='loss'?'var(--red-bg,#ff575715)':'var(--yellow-bg,#f5c84215)',
                  color: result==='win'?'var(--green)':result==='loss'?'var(--red)':'var(--yellow)',
                }}>
                  {result==='win' ? '+€'+Math.round(pnl) : result==='loss' ? '-€'+Math.abs(Math.round(pnl)) : 'En attente'}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
