import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

const { error } = await admin.auth.admin.updateUserById(
    '2a892844-7875-4389-b88c-6d0242bd1b81',
    {
      app_metadata: {
        app_role:       'colaborador',
        is_gestor:      true,
        colaborador_id: '7026feaf-db9f-4418-ab54-32154252aba5',
        empresa_id:     'f08cf2e0-84c1-4429-9eeb-651c8e3b6f9d',
      }
    }
  )

  return NextResponse.json({ ok: !error, error: error?.message })
}


