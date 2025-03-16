
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function AuthCallback() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      // Get the hash fragment from the URL
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      // Process the OAuth callback
      try {
        // If this is not a callback with a hash (access_token), user may have cancelled
        if (!window.location.hash) {
          window.opener?.postMessage(
            { type: 'SUPABASE_AUTH_CALLBACK', error: 'No access token found' },
            window.location.origin
          );
          
          // Close the popup after a short delay
          setTimeout(() => window.close(), 500);
          return;
        }
        
        // Extract the access token and refresh token from the URL
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (accessToken) {
          // Set the session in Supabase using the tokens
          const { data, error } = await supabase.auth.setSession({
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
              { type: 'SUPABASE_AUTH_COMPLETE', success: true },
              window.location.origin
            );
          }
          
          // Close the popup immediately to avoid loading the full app
          window.close();
        } else {
          // No access token found
          window.opener?.postMessage(
            { type: 'SUPABASE_AUTH_CALLBACK', error: 'No access token found' },
            window.location.origin
          );
          
          // Close the popup
          window.close();
        }
      } catch (error) {
        console.error('Error handling auth callback:', error);
        
        // Notify the opener about the error
        window.opener?.postMessage(
          { type: 'SUPABASE_AUTH_CALLBACK', error: 'Authentication error occurred' },
          window.location.origin
        );
        
        // Close the popup
        window.close();
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-lg font-medium">Authentication Processing</h2>
        <p className="mt-2">Please wait while we complete the authentication process...</p>
      </div>
    </div>
  );
}
