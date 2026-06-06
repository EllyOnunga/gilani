import { useEffect, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { createFileRoute } from '@tanstack/react-router'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/callback')({
  component: AuthCallback,
  validateSearch: (search: Record<string, unknown>) => ({
    next: (search.next as string) || '/dashboard',
  }),
})

function AuthCallback() {
  const navigate = useNavigate()
  const { next } = useSearch({ from: '/callback' })
  const [message, setMessage] = useState('Confirming your account...')

  // Sanitize next — prevent open redirect attacks
  const safePath = next.startsWith('/') ? next : '/dashboard'

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        setMessage('Something went wrong. Redirecting...')
        setTimeout(() => navigate({ to: '/login' }), 2000)
        return
      }

      if (session) {
        setMessage('Signed in! Redirecting...')
        navigate({ to: safePath })
        return
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
        if (event === 'SIGNED_IN' && s) {
          setMessage('Email confirmed! Redirecting...')
          navigate({ to: safePath })
        } else if (event === 'PASSWORD_RECOVERY') {
          navigate({ to: '/reset-password' })
        }
      })

      return () => subscription.unsubscribe()
    }

    handleCallback()
  }, [])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      gap: '1rem',
      background: '#0a0f1e',
      color: '#e8eaf6',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: 'linear-gradient(135deg, #f97316, #ea580c)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, fontWeight: 700, color: '#fff',
        marginBottom: '0.5rem',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}>G</div>
      <p style={{ fontSize: '0.95rem', color: '#94a3b8' }}>{message}</p>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}