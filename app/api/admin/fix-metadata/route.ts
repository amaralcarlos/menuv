import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await admin.auth.admin.updateUserById(
    '5ffabc8d-cbf8-48dd-a5a2-b6e92eb51932',
    {
      app_metadata: {
        app_role:       'colaborador',
        is_gestor:      true,
        colaborador_id: '4f17d6c7-e378-48f5-98b4-b76ea6c7876b',
        empresa_id:     '2efc853d-5e97-44a8-b62e-68034edd7b1a',
      }
    }
  )

  return NextResponse.json({ ok: !error, error: error?.message })
}
