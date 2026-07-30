import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const results: any[] = []

  // 1. Corrige data do pedido 71c097ec para 28/07
  const r1 = await admin.from('pedidos')
    .update({ data_pedido: '2026-07-28' })
    .eq('id', '71c097ec-1882-41e1-8cce-e079a3773110')
  results.push({ step: 'update date', error: r1.error?.message })

  // 2. Remove itens duplicados do pedido 71c097ec (mantém só 1)
  const { data: itens1 } = await admin.from('pedido_itens')
    .select('id').eq('pedido_id', '71c097ec-1882-41e1-8cce-e079a3773110')
  if (itens1 && itens1.length > 1) {
    const toDelete = itens1.slice(1).map((i: any) => i.id)
    const r2 = await admin.from('pedido_itens').delete().in('id', toDelete)
    results.push({ step: 'delete dup items 71c', error: r2.error?.message })
  }

  // 3. Remove itens duplicados do pedido aec45092 (mantém só 1)
  const { data: itens2 } = await admin.from('pedido_itens')
    .select('id').eq('pedido_id', 'aec45092-4d45-4cfc-9c90-fe1bf33560a6')
  if (itens2 && itens2.length > 1) {
    const toDelete = itens2.slice(1).map((i: any) => i.id)
    const r3 = await admin.from('pedido_itens').delete().in('id', toDelete)
    results.push({ step: 'delete dup items aec', error: r3.error?.message })
  }

  return NextResponse.json({ ok: true, results })
}
