import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await admin.auth.admin.updateUserById(
    'c5d47841-067c-4a28-9b68-49ccfa705fde',
    {
      app_metadata: {
        app_role:       'colaborador',
        is_gestor:      false,
        colaborador_id: '0c3c3556-ab37-4dbc-a4bc-5727d3b293f1',
        empresa_id:     'f08cf2e0-84c1-4429-9eeb-651c8e3b6f9d',
      }
    }
  )

  return NextResponse.json({ ok: !error, error: error?.message })
}
