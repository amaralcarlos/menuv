import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const ids = [
    'd727ee28-3dbe-4a75-8994-cd2a199c594f', // Lucinea duplicata
    '622bb0df-c849-4983-ab62-cd88a5bfee17', // Janine duplicata
  ]

  // Deleta colaboradores
  const { error: e1 } = await admin.from('colaboradores').delete().in('id', ids)

  // Deleta auth users
  const authIds = [
    '698cebd5-8732-4dfb-bc45-50f457385df6', // Lucinea
    '200cb7b4-06e8-47c8-9973-b6550fdd428b', // Janine
  ]
  const errors = []
  for (const id of authIds) {
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error) errors.push(error.message)
  }

  return NextResponse.json({ ok: !e1, colaboradoresError: e1?.message, authErrors: errors })
}
