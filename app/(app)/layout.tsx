import { AuthProvider } from '@/lib/auth-context'
import { ToastContainer } from '@/components/ui'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <ToastContainer />
    </AuthProvider>
  )
}
