import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await admin.from('pedido_itens').insert([
    { pedido_id: '71c097ec-1882-41e1-8cce-e079a3773110', item: 'Marmita', ordem: 0 },
    { pedido_id: 'aec45092-4d45-4cfc-9c90-fe1bf33560a6', item: 'Marmita', ordem: 0 },
  ])

  return NextResponse.json({ ok: !error, error: error?.message })
}
