import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await admin
    .from('colaboradores')
    .update({ ativo: false })
    .in('id', [
      'd727ee28-3dbe-4a75-8994-cd2a199c594f',
      '622bb0df-c849-4983-ab62-cd88a5bfee17',
    ])

  return NextResponse.json({ ok: !error, error: error?.message })
}
