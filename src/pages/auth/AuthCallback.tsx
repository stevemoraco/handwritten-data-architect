import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const redirectTo = searchParams.get('redirectTo') || '/';

  useEffect(() => {
    // Handle the OAuth callback
    const handleAuthCallback = async () => {
      try {
        // Check if we have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
          throw sessionError;
        }
        
        if (session) {
          console.log('Session found, redirecting to:', redirectTo);
          
          // If we're in a popup, send message to parent window
          if (window.opener) {
            window.opener.postMessage({ 
              type: 'SUPABASE_AUTH_CALLBACK', 
              session 
            }, window.location.origin);
            window.close();
            return;
          }
          
          // Otherwise, redirect in the current window
          navigate(redirectTo, { replace: true });
          return;
        }
        
        // No session yet, so use the URL params to set the session
        const hashParams = Object.fromEntries(
          window.location.hash
            .substring(1)
            .split('&')
            .map(param => param.split('='))
        );

        if (hashParams.access_token) {
          // Exchange the token for a session
          const { error } = await supabase.auth.setSession({
            access_token: hashParams.access_token,
            refresh_token: hashParams.refresh_token || '',
          });

          if (error) {
            console.error('Error setting session:', error);
            throw error;
          }

          console.log('Auth callback successful, redirecting to:', redirectTo);
          
          // If we're in a popup, send message to parent window
          if (window.opener) {
            window.opener.postMessage({ 
              type: 'SUPABASE_AUTH_CALLBACK', 
              success: true 
            }, window.location.origin);
            window.close();
            return;
          }
          
          // Otherwise, redirect in the current window
          navigate(redirectTo, { replace: true });
        } else {
          // Check the query params for error
          const errorDesc = searchParams.get('error_description') || searchParams.get('error') || 'No authentication data received';
          console.error('Auth error:', errorDesc);
          setError(errorDesc);
          
          // If we're in a popup, send error message to parent window
          if (window.opener) {
            window.opener.postMessage({ 
              type: 'SUPABASE_AUTH_CALLBACK', 
              error: errorDesc 
            }, window.location.origin);
            window.close();
            return;
          }
          
          // Otherwise, redirect to auth page with error
          navigate(`/auth?error=${encodeURIComponent(errorDesc)}`, { replace: true });
        }
      } catch (error: any) {
        console.error('Error in auth callback:', error);
        setError(error.message || 'Authentication error');
        
        // If we're in a popup, send error message to parent window
        if (window.opener) {
          window.opener.postMessage({ 
            type: 'SUPABASE_AUTH_CALLBACK', 
            error: error.message || 'Authentication error'
          }, window.location.origin);
          window.close();
          return;
        }
        
        // Otherwise, redirect to auth page with error
        navigate(`/auth?error=${encodeURIComponent(error.message || 'Authentication error')}`, { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate, redirectTo, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-2">
        {error ? (
          <>
            <p className="text-destructive text-lg">Authentication Error</p>
            <p className="text-muted-foreground">{error}</p>
          </>
        ) : (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-lg">Completing authentication...</p>
          </>
        )}
      </div>
    </div>
  );
}
