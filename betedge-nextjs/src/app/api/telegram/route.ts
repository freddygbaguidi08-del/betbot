import { NextRequest, NextResponse } from 'next/server'
import { testConnection, sendMessage } from '@/lib/telegram'
import { saveSettings } from '@/lib/supabase'

// POST /api/telegram — test ou envoi
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, token, chatId, message } = body

    // Test de connexion avec token/chatId fournis
    if (action === 'test') {
      if (!token || !chatId) {
        return NextResponse.json({ ok: false, error: 'token et chatId requis' }, { status: 400 })
      }
      const result = await testConnection(token, chatId)
      if (result.ok) {
        // Sauvegarder dans Supabase
        await saveSettings({ tg_token: token, tg_chat_id: chatId, tg_enabled: true })
      }
      return NextResponse.json(result)
    }

    // Envoi d'un message
    if (action === 'send') {
      if (!message) {
        return NextResponse.json({ ok: false, error: 'message requis' }, { status: 400 })
      }
      const ok = await sendMessage(message, chatId)
      return NextResponse.json({ ok })
    }

    // Alerte démo
    if (action === 'demo') {
      const msg = [
        'VALUE BET DETECTEE - DEMO',
        '',
        'France vs Espagne - Coupe du Monde 2026',
        'Selection: Victoire France',
        'Cote: 2.10 @ Bet365',
        'Edge: +12.4%',
        'Mise Kelly: 42 EUR',
        '',
        'BetEdge - Ceci est un message de test',
      ].join('\n')
      const ok = await sendMessage(msg, chatId)
      return NextResponse.json({ ok, message: msg })
    }

    return NextResponse.json({ ok: false, error: 'action inconnue' }, { status: 400 })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
