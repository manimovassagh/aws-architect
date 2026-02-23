import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

/**
 * Handles the OAuth redirect callback.
 * Supabase exchanges the URL hash for a session, then we redirect home.
 */
export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!supabase) {
      navigate('/', { replace: true });
      return;
    }

    // Supabase auto-detects the hash fragment and establishes the session
    supabase.auth.getSession().then(() => {
      navigate('/', { replace: true });
    });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="h-6 w-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
