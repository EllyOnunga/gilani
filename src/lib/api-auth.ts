import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types'

export async function authenticateRequest(request: Request) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ['SUPABASE_PUBLISHABLE_KEY'] : []),
    ];
    throw new Response(
      JSON.stringify({ error: `Missing Supabase environment variable(s): ${missing.join(', ')}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Response(
      JSON.stringify({ error: 'Unauthorized: No valid Bearer token provided' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    throw new Response(
      JSON.stringify({ error: 'Unauthorized: Token is empty' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const supabaseClient = createClient<Database>(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  const { data, error } = await supabaseClient.auth.getUser(token);
  if (error || !data?.user) {
    console.error('[API Auth Error] Token verification failed:', error?.message || 'No user returned');
    throw new Response(
      JSON.stringify({ error: `Unauthorized: ${error?.message || 'Invalid token claims'}` }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return {
    supabase: supabaseClient,
    userId: data.user.id,
    user: data.user,
  };
}
