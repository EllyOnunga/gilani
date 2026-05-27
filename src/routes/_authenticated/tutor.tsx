import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/_authenticated/tutor')({
  component: TutorIndex,
});

function TutorIndex() {
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
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
      const json = await res.json().catch(() => ({}));
      const id = json?.thread?.id;
      if (mounted && id) {
        navigate({ to: `/tutor/${id}` });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  return <div className="p-8">Creating your session…</div>;
}
