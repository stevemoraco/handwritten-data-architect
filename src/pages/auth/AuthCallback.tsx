
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Process the hash parameters from the URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (accessToken) {
          // Set the session in Supabase
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });
          
          if (error) {
            console.error('Error setting session:', error);
            window.opener?.postMessage(
              { type: 'SUPABASE_AUTH_CALLBACK', error: error.message },
              window.location.origin
            );
          } else {
            console.log('Session set successfully');
            window.opener?.postMessage(
              { type: 'SUPABASE_AUTH_CALLBACK', success: true },
              window.location.origin
            );
          }
        } else {
          // No access token found in URL
          window.opener?.postMessage(
            { type: 'SUPABASE_AUTH_CALLBACK', error: 'No access token found' },
            window.location.origin
          );
        }
        
        // Close the popup after a short delay to ensure the message is sent
        setTimeout(() => {
          window.close();
        }, 300);
      } catch (error: any) {
        console.error('Error in auth callback:', error);
        
        window.opener?.postMessage(
          { type: 'SUPABASE_AUTH_CALLBACK', error: error.message || 'Authentication error' },
          window.location.origin
        );
        
        // Close the popup after a short delay
        setTimeout(() => {
          window.close();
        }, 300);
      }
    };

    // Execute the callback handler on component mount
    handleAuthCallback();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-lg">Completing authentication...</p>
      </div>
    </div>
  );
}
