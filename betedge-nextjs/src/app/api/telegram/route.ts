import { NextRequest, NextResponse } from 'next/server'
import { testConnection, sendMessage } from '@/lib/telegram'
import { saveSettings } from '@/lib/supabase'

// Force dynamic — empêche Next.js d'exécuter cette route au build
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, token, chatId, message } = body

    if (action === 'test') {
      if (!token || !chatId) return NextResponse.json({ ok: false, error: 'token et chatId requis' }, { status: 400 })
      const result = await testConnection(token, chatId)
      if (result.ok) await saveSettings({ tg_token: token, tg_chat_id: chatId, tg_enabled: true })
      return NextResponse.json(result)
    }

    if (action === 'send') {
      if (!message) return NextResponse.json({ ok: false, error: 'message requis' }, { status: 400 })
      const ok = await sendMessage(message, chatId)
      return NextResponse.json({ ok })
    }

    if (action === 'demo') {
      const msg = 'VALUE BET DETECTEE - DEMO\n\nFrance vs Espagne - Coupe du Monde 2026\nSelection: Victoire France\nCote: 2.10 @ Bet365\nEdge: +12.4%\nMise Kelly: 42 EUR\n\nBetEdge - Message de test'
      const ok = await sendMessage(msg, chatId)
      return NextResponse.json({ ok, message: msg })
    }

    return NextResponse.json({ ok: false, error: 'action inconnue' }, { status: 400 })
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Erreur inconnue' }, { status: 500 })
  }
}
