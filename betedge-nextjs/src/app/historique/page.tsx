'use client'
import { useState, useEffect, useCallback } from 'react'
import { getBets, insertBet, updateBetResult, deleteBet } from '@/lib/supabase'

interface Bet { id:string; match_name:string; competition:string; selection:string; odd:number; stake:number; bet_type:string; result:string; pnl:number; edge_pct:number; bookmaker:string; created_at:string }

export default function HistoriquePage() {
  const [bets, setBets]     = useState<Bet[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats]   = useState({ pnl:0, winRate:0, roi:0, wins:0, losses:0 })
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm]     = useState({ match_name:'', competition:'Coupe du Monde 2026', selection:'', odd:'', stake:'', bookmaker:'', bet_type:'value' })
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getBets(200)
    setBets(data as Bet[])
    // Calcul stats
    const closed = data.filter((b:Record<string,unknown>) => b.result !== 'pending')
    const wins   = closed.filter((b:Record<string,unknown>) => b.result === 'win').length
    const pnl    = closed.reduce((s:number,b:Record<string,unknown>) => s + Number(b.pnl||0), 0)
    const staked = closed.reduce((s:number,b:Record<string,unknown>) => s + Number(b.stake), 0)
    setStats({ pnl, winRate: closed.length ? wins/closed.length*100 : 0, roi: staked ? pnl/staked*100 : 0, wins, losses: closed.length-wins })
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const addBet = async () => {
    if (!form.match_name || !form.odd || !form.stake) return
    setAdding(true)
    await insertBet({ match_name: form.match_name, competition: form.competition, selection: form.selection, odd: parseFloat(form.odd), stake: parseFloat(form.stake), bookmaker: form.bookmaker, bet_type: form.bet_type, result: 'pending', pnl: 0, bet_date: new Date().toISOString().slice(0,10) })
    setForm({ match_name:'', competition:'Coupe du Monde 2026', selection:'', odd:'', stake:'', bookmaker:'', bet_type:'value' })
    setShowAdd(false); setAdding(false)
    await load()
  }

  const changeResult = async (id:string, result:string, odd:number, stake:number) => {
    const pnl = result === 'win' ? stake*(odd-1) : result === 'loss' ? -stake : 0
    await updateBetResult(id, result, pnl)
    await load()
  }

  const delBet = async (id:string) => {
    if (!confirm('Supprimer ce pari ?')) return
    await deleteBet(id); await load()
  }

  return (
    <div style={{background:'var(--bg)',minHeight:'100vh',padding:24}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <a href="/" style={{color:'var(--text3)',fontSize:12,textDecoration:'none'}}>← Dashboard</a>
          <h1 style={{fontSize:18,fontWeight:800}}>Historique des paris</h1>
        </div>
        <button className="btn btn-green" onClick={() => setShowAdd(!showAdd)}>+ Ajouter manuellement</button>
      </div>

      {/* Stats rapides */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:16}}>
        {[
          { l:'P&L total', v:(stats.pnl>=0?'+':'')+'€'+Math.round(stats.pnl), c:stats.pnl>=0?'var(--green)':'var(--red)' },
          { l:'ROI', v:(stats.roi>=0?'+':'')+stats.roi.toFixed(1)+'%', c:stats.roi>=0?'var(--green)':'var(--red)' },
          { l:'Win rate', v:stats.winRate.toFixed(0)+'%', c:'var(--blue)' },
          { l:'Gagnés', v:stats.wins, c:'var(--green)' },
          { l:'Perdus', v:stats.losses, c:'var(--red)' },
        ].map((s,i) => (
          <div key={i} className="card" style={{padding:'11px 13px',textAlign:'center'}}>
            <div style={{fontSize:10,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:5}}>{s.l}</div>
            <div style={{fontSize:18,fontWeight:800,color:s.c}}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Form ajout */}
      {showAdd && (
        <div className="card" style={{padding:16,marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:600,marginBottom:12,color:'var(--green)'}}>Ajouter un pari</div>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 1fr',gap:8,marginBottom:8}}>
            {[
              {k:'match_name', ph:'Match', l:'Match'},
              {k:'competition', ph:'Compétition', l:'Compétition'},
              {k:'selection', ph:'Sélection', l:'Sélection'},
              {k:'odd', ph:'1.85', l:'Cote', t:'number'},
              {k:'stake', ph:'50', l:'Mise (€)', t:'number'},
              {k:'bookmaker', ph:'Bet365', l:'Bookmaker'},
            ].map(f => (
              <div className="field" key={f.k} style={{margin:0}}>
                <label>{f.l}</label>
                <input type={f.t||'text'} placeholder={f.ph} step="0.01" value={(form as Record<string,string>)[f.k]}
                  onChange={e => setForm(p => ({...p,[f.k]:e.target.value}))} />
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:7}}>
            <button className="btn btn-green" onClick={addBet} disabled={adding}>
              {adding ? <><span className="spinner"></span> Ajout...</> : '+ Ajouter'}
            </button>
            <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Annuler</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        {loading ? (
          <div style={{padding:32,textAlign:'center'}}><span className="spinner"></span></div>
        ) : bets.length === 0 ? (
          <div style={{padding:32,textAlign:'center',color:'var(--text3)',fontSize:13}}>
            Aucun pari enregistré. Lance un scan ou ajoute des paris manuellement.
          </div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr>
                  {['Date','Match','Sélection','Cote','Mise','Type','Résultat','P&L',''].map((h,i) => (
                    <th key={i} style={{textAlign:'left',padding:'8px 11px',fontSize:10,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.6px',borderBottom:'1px solid var(--border)',fontWeight:600}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bets.map((bet, i) => {
                  const pnl = Number(bet.pnl) || 0
                  return (
                    <tr key={bet.id} style={{borderBottom: i < bets.length-1 ? '1px solid var(--border)' : 'none'}}>
                      <td style={{padding:'9px 11px',color:'var(--text3)'}}>{new Date(bet.created_at).toLocaleDateString('fr-FR')}</td>
                      <td style={{padding:'9px 11px',fontWeight:600}}>{bet.match_name}<div style={{fontSize:10,color:'var(--text3)'}}>{bet.competition}</div></td>
                      <td style={{padding:'9px 11px',color:'var(--text2)'}}>{bet.selection}</td>
                      <td style={{padding:'9px 11px',fontWeight:700}}>{Number(bet.odd).toFixed(2)}</td>
                      <td style={{padding:'9px 11px'}}>€{bet.stake}</td>
                      <td style={{padding:'9px 11px'}}>
                        <span style={{fontSize:10,fontWeight:700,padding:'2px 6px',borderRadius:4,background:'var(--bg3)',color:'var(--text2)'}}>{bet.bet_type}</span>
                      </td>
                      <td style={{padding:'9px 11px'}}>
                        {bet.result === 'pending' ? (
                          <select value="pending" onChange={e => changeResult(bet.id, e.target.value, bet.odd, bet.stake)}
                            style={{background:'var(--bg3)',border:'1px solid var(--border)',color:'var(--text)',padding:'3px 6px',borderRadius:4,fontSize:11,outline:'none'}}>
                            <option value="pending">En attente</option>
                            <option value="win">Gagné ✓</option>
                            <option value="loss">Perdu ✗</option>
                          </select>
                        ) : (
                          <span style={{
                            fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:4,
                            background: bet.result==='win'?'#00d47e18':'#ff575715',
                            color: bet.result==='win'?'var(--green)':'var(--red)',
                          }}>{bet.result==='win'?'Gagné':'Perdu'}</span>
                        )}
                      </td>
                      <td style={{padding:'9px 11px',fontWeight:700,color:pnl>0?'var(--green)':pnl<0?'var(--red)':'var(--text2)'}}>
                        {pnl!==0?(pnl>0?'+':'')+'€'+Math.abs(Math.round(pnl)):'—'}
                      </td>
                      <td style={{padding:'9px 11px'}}>
                        <button onClick={() => delBet(bet.id)} style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer',fontSize:15}}>×</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
