import { createBrowserClient } from '@supabase/ssr'

// Esta é a função moderna
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Este é o "apelido" para os arquivos que ainda estão procurando pelo nome antigo
export const supabaseBrowser = createClient()
