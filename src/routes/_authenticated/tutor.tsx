import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/_authenticated/tutor')({
  component: TutorIndex,
});

function TutorIndex() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const createSession = async () => {
    setError(null);
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/tutor/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Server returned status ${res.status}`);
      }

      const json = await res.json();
      const id = json?.thread?.id;
      if (id) {
        navigate({ to: `/tutor/${id}` });
      } else {
        throw new Error('No thread ID returned from server');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create study session');
      setLoading(false);
    }
  };

  useEffect(() => {
    createSession();
  }, [navigate]);

  if (error) {
    const isServiceRoleError = error.includes('SUPABASE_SERVICE_ROLE_KEY') || error.toLowerCase().includes('service_role');
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center animate-in-slide">
        <div className="rounded-full bg-destructive/10 p-3 text-destructive mb-4">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="font-serif text-lg font-semibold text-foreground">Failed to start tutor chat</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">
          {error}
        </p>
        {isServiceRoleError && (
          <div className="mt-4 max-w-md rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-3 text-xs text-amber-800 dark:text-amber-200/90 text-left">
            <strong>Setup Required:</strong> You are missing the <code>SUPABASE_SERVICE_ROLE_KEY</code> in your local <code>.env</code> file. Add this environment variable from your Supabase Project Settings to enable local server-side operations.
          </div>
        )}
        <Button onClick={createSession} className="mt-6 flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary mb-3" />
      <p className="text-sm text-muted-foreground font-medium">Creating your study session…</p>
    </div>
  );
}
