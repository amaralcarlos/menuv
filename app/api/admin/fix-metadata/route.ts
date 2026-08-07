import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await admin.auth.admin.updateUserById(
    'ea4b101c-a651-46b3-95e9-adadb621419a',
    {
      app_metadata: {
        app_role:       'colaborador',
        is_gestor:      false,
        colaborador_id: '15f5b92d-1b05-450c-a18c-da3b104bbd13',
        empresa_id:     'f08cf2e0-84c1-4429-9eeb-651c8e3b6f9d',
      }
    }
  )

  return NextResponse.json({ ok: !error, error: error?.message })
}
