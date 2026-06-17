import { NextRequest, NextResponse } from 'next/server'
import { insertAnalysis, getSettings } from '@/lib/supabase'
import { sendMessage, msgIaReco } from '@/lib/telegram'

// Force dynamic — empêche Next.js d'exécuter cette route au build
export const dynamic = 'force-dynamic'

const GROQ_MODEL = 'llama-3.3-70b-versatile'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { match, competition, date, odd1, oddDraw, odd2, context, bankroll = 1000 } = body

    if (!match || !odd1 || !odd2) {
      return NextResponse.json({ ok: false, error: 'match, odd1 et odd2 sont requis' }, { status: 400 })
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: 'GROQ_API_KEY manquante dans les variables Vercel' }, { status: 500 })
    }

    const prompt = `Tu es un expert en analyse de paris sportifs avec 15 ans d'expérience.

MATCH: ${match}
COMPETITION: ${competition || 'Non spécifiée'}
DATE: ${date || 'Non spécifiée'}
COTES BOOKMAKER: Domicile ${odd1} / Nul ${oddDraw || 'N/A'} / Extérieur ${odd2}
${context ? 'CONTEXTE: ' + context : ''}

Fournis UNIQUEMENT ce JSON valide (pas de texte avant ou après, pas de markdown):
{
  "analyse": "analyse du match en 1 paragraphe",
  "forces_dom": "2-3 points forts équipe domicile",
  "forces_ext": "2-3 points forts équipe extérieure",
  "prob_dom": <entier 0-100>,
  "prob_nul": <entier 0-100>,
  "prob_ext": <entier 0-100>,
  "recommandation": "Victoire Dom" ou "Match nul" ou "Victoire Ext" ou "Abstention",
  "confiance": <entier 50-95>,
  "justification": "pourquoi cette recommandation en 1-2 phrases",
  "risques": "principaux risques en 1 phrase"
}`

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:       GROQ_MODEL,
        max_tokens:  800,
        temperature: 0.3,
        messages: [
          { role: 'system', content: 'Réponds UNIQUEMENT en JSON valide, sans markdown.' },
          { role: 'user',   content: prompt },
        ],
      }),
    })

    if (!groqRes.ok) {
      const err = await groqRes.json()
      return NextResponse.json({ ok: false, error: err.error?.message || 'Erreur Groq' }, { status: 500 })
    }

    const groqData = await groqRes.json()
    const text = groqData.choices?.[0]?.message?.content || ''

    const start = text.indexOf('{')
    const end   = text.lastIndexOf('}')
    if (start < 0 || end < 0) {
      return NextResponse.json({ ok: false, error: 'Réponse Groq non parseable' }, { status: 500 })
    }

    const result = JSON.parse(text.slice(start, end + 1))
    if (!result.recommandation || result.prob_dom === undefined) {
      return NextResponse.json({ ok: false, error: 'Champs manquants dans la réponse' }, { status: 500 })
    }

    const total = (result.prob_dom || 0) + (result.prob_nul || 0) + (result.prob_ext || 0)
    if (total > 0 && Math.abs(total - 100) > 5) {
      result.prob_dom = Math.round(result.prob_dom / total * 100)
      result.prob_nul = Math.round(result.prob_nul / total * 100)
      result.prob_ext = 100 - result.prob_dom - result.prob_nul
    }

    const recoOdd  = result.recommandation.includes('Dom') ? odd1 : result.recommandation.includes('Ext') ? odd2 : (oddDraw || odd1)
    const recoProb = result.recommandation.includes('Dom') ? result.prob_dom : result.recommandation.includes('Ext') ? result.prob_ext : result.prob_nul
    const p = recoProb / 100
    const b = recoOdd - 1
    const kr = b > 0 ? Math.max(0, (b * p - (1 - p)) / b) : 0
    const kellyStake = Math.round(bankroll * kr * 0.5)
    const edge = recoOdd > 0 ? ((p - 1 / recoOdd) / (1 / recoOdd)) * 100 : 0
    const ev   = kellyStake * (p * recoOdd - 1)

    const saved = await insertAnalysis({
      match_name: match, competition: competition || null, match_date: date || null,
      odd_home: odd1, odd_draw: oddDraw || null, odd_away: odd2,
      prob_home: result.prob_dom, prob_draw: result.prob_nul, prob_away: result.prob_ext,
      recommendation: result.recommandation, confidence: result.confiance,
      edge_ia: edge, kelly_stake: kellyStake, ev,
      analyse_text: result.analyse, forces_home: result.forces_dom,
      forces_away: result.forces_ext, justification: result.justification,
      risques: result.risques, model_used: GROQ_MODEL,
    })

    const settings = await getSettings()
    if (settings?.tg_enabled && result.confiance >= 70) {
      await sendMessage(msgIaReco({ match, reco: result.recommandation, confidence: result.confiance, edge, stake: kellyStake }), settings.tg_chat_id)
    }

    return NextResponse.json({
      ok: true, model: GROQ_MODEL,
      analysis: { ...result, edge, kellyStake, ev, recoOdd, recoProb },
      savedId: saved?.id || null,
    })

  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Erreur inconnue' }, { status: 500 })
  }
}
