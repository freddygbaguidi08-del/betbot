'use client'
import { useState, useEffect } from 'react'
import { getSettings, saveSettings } from '@/lib/supabase'

export default function SettingsPage() {
  const [cfg, setCfg]       = useState({ bankroll:1000, kelly_mode:0.5, edge_min:5, arb_min:1, sl_day_pct:5 })
  const [tg, setTg]         = useState({ token:'', chatId:'', enabled:false })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ok:boolean; msg:string} | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  useEffect(() => {
    getSettings().then(s => {
      if (!s) return
      setCfg({ bankroll: s.bankroll, kelly_mode: s.kelly_mode, edge_min: s.edge_min, arb_min: s.arb_min, sl_day_pct: s.sl_day_pct })
      setTg({ token: s.tg_token || '', chatId: s.tg_chat_id || '', enabled: s.tg_enabled || false })
    })
  }, [])

  const saveCfg = async () => {
    setSaving(true)
    await saveSettings({ ...cfg })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const testTelegram = async () => {
    if (!tg.token || !tg.chatId) { setTestResult({ ok:false, msg:'Entre le token ET le Chat ID' }); return }
    setTesting(true); setTestResult(null)
    try {
      const res  = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action:'test', token: tg.token, chatId: tg.chatId }),
      })
      const data = await res.json()
      if (data.ok) {
        setTestResult({ ok:true, msg:'Connexion réussie ! Vérifie ton Telegram.' })
        setTg(prev => ({ ...prev, enabled: true }))
        await saveSettings({ tg_token: tg.token, tg_chat_id: tg.chatId, tg_enabled: true })
      } else {
        let hint = ''
        const e = (data.error || '').toLowerCase()
        if (e.includes('chat not found'))   hint = " — Envoie d'abord un message à ton bot dans Telegram."
        if (e.includes('unauthorized'))     hint = ' — Token invalide. Revérifie depuis @BotFather.'
        if (e.includes('bad request'))      hint = ' — Chat ID incorrect (chiffres seulement).'
        setTestResult({ ok:false, msg: (data.error || 'Échec') + hint })
      }
    } catch { setTestResult({ ok:false, msg:'Erreur réseau' }) }
    setTesting(false)
  }

  const sendDemo = async () => {
    const res  = await fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action:'demo', chatId: tg.chatId }),
    })
    const data = await res.json()
    setTestResult({ ok: data.ok, msg: data.ok ? 'Alerte démo envoyée !' : 'Échec: ' + data.error })
  }

  const field = (label: string, key: keyof typeof cfg, type = 'number', step?: string) => (
    <div className="field" style={{marginBottom:12}}>
      <label>{label}</label>
      <input type={type} step={step} value={cfg[key]}
        onChange={e => setCfg(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))} />
    </div>
  )

  return (
    <div style={{background:'var(--bg)',minHeight:'100vh',padding:24}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
        <a href="/" style={{color:'var(--text3)',fontSize:12,textDecoration:'none'}}>← Dashboard</a>
        <h1 style={{fontSize:18,fontWeight:800}}>Paramètres</h1>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,maxWidth:900}}>

        {/* Bankroll & Kelly */}
        <div className="card" style={{padding:16}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:14,color:'var(--blue)'}}>💰 Bankroll & Kelly</div>
          {field('Bankroll de référence (€)', 'bankroll')}
          <div className="field" style={{marginBottom:12}}>
            <label>Mode Kelly</label>
            <select value={cfg.kelly_mode} onChange={e => setCfg(p => ({...p, kelly_mode: parseFloat(e.target.value)}))}>
              <option value="1">Full Kelly (agressif)</option>
              <option value="0.5">Half Kelly (recommandé)</option>
              <option value="0.25">Quarter Kelly (prudent)</option>
              <option value="0.1">Kelly ×10% (très prudent)</option>
            </select>
          </div>
          {field('Edge minimum value bets (%)', 'edge_min', 'number', '0.5')}
          {field('Profit minimum arbitrage (%)', 'arb_min', 'number', '0.1')}
          {field('Stop-loss journalier (%)', 'sl_day_pct', 'number', '0.5')}
          <button className="btn btn-blue" style={{width:'100%',justifyContent:'center',marginTop:4}} onClick={saveCfg} disabled={saving}>
            {saving ? <><span className="spinner"></span> Sauvegarde...</> : saved ? '✓ Sauvegardé !' : '✓ Sauvegarder'}
          </button>
        </div>

        {/* Telegram */}
        <div className="card" style={{padding:16}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
            <span style={{fontSize:13,fontWeight:600,color:'var(--teal)'}}>📱 Telegram Bot</span>
            <span style={{
              fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,
              background: tg.enabled ? '#00d47e18' : '#ff575715',
              color: tg.enabled ? 'var(--green)' : 'var(--red)',
              border: `1px solid ${tg.enabled ? '#00d47e35' : '#ff575735'}`,
            }}>{tg.enabled ? '● Connecté' : '● Non configuré'}</span>
          </div>

          <div style={{background:'var(--blue-bg,#4d8fff15)',border:'1px solid #4d8fff35',borderRadius:6,padding:'10px 12px',marginBottom:12,fontSize:12,color:'var(--blue)',lineHeight:1.8}}>
            <strong>Avant de tester :</strong> ouvre ton bot dans Telegram et envoie-lui un message.
            Sans ça, Telegram bloque la connexion.
          </div>

          <div className="field" style={{marginBottom:10}}>
            <label>Token bot (@BotFather)</label>
            <input type="password" value={tg.token} placeholder="7123456789:AAF..."
              onChange={e => setTg(p => ({...p, token: e.target.value}))} />
          </div>
          <div className="field" style={{marginBottom:12}}>
            <label>Chat ID (@userinfobot)</label>
            <input type="text" value={tg.chatId} placeholder="123456789"
              onChange={e => setTg(p => ({...p, chatId: e.target.value}))} />
          </div>

          {testResult && (
            <div style={{
              background: testResult.ok ? '#00d47e18' : '#ff575715',
              border: `1px solid ${testResult.ok ? '#00d47e35' : '#ff575735'}`,
              color: testResult.ok ? 'var(--green)' : 'var(--red)',
              borderRadius:6,padding:'9px 12px',marginBottom:10,fontSize:12,
            }}>
              {testResult.ok ? '✓ ' : '✗ '}{testResult.msg}
            </div>
          )}

          <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
            <button className="btn btn-teal" onClick={testTelegram} disabled={testing}>
              {testing ? <><span className="spinner"></span> Test...</> : '📡 Tester connexion'}
            </button>
            <button className="btn btn-green btn-sm" onClick={sendDemo}>📨 Alerte démo</button>
          </div>

          <div style={{marginTop:14,fontSize:11,color:'var(--text3)',lineHeight:1.8}}>
            <strong style={{color:'var(--text2)'}}>Guide setup :</strong><br/>
            1. Telegram → <code style={{background:'var(--bg4)',padding:'1px 5px',borderRadius:3,color:'var(--teal)'}}>@BotFather</code> → /newbot → copie le token<br/>
            2. Telegram → <code style={{background:'var(--bg4)',padding:'1px 5px',borderRadius:3,color:'var(--teal)'}}>@userinfobot</code> → copie le Chat ID<br/>
            3. Envoie &quot;hello&quot; à ton bot → Tester
          </div>
        </div>
      </div>
    </div>
  )
}
