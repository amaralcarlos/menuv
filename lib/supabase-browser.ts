import { createBrowserClient } from '@supabase/ssr'

// Função principal
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// O apelido agora é uma função, exatamente como o login/page.tsx deseja
export const supabaseBrowser = () => createClient()
