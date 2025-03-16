
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/';

  useEffect(() => {
    // Handle the OAuth callback
    const handleAuthCallback = async () => {
      try {
        // Get hash parameters including access token
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
            navigate('/auth?error=Unable to sign in', { replace: true });
            return;
          }

          console.log('Auth callback successful, redirecting to:', redirectTo);
          navigate(redirectTo, { replace: true });
        } else {
          // No access token found in the URL
          navigate('/auth?error=No authentication data received', { replace: true });
        }
      } catch (error) {
        console.error('Error in auth callback:', error);
        navigate('/auth?error=Authentication error', { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate, redirectTo]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-lg">Completing authentication...</p>
      </div>
    </div>
  );
}
