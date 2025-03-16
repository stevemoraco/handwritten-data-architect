
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function AuthCallback() {
  useEffect(() => {
    const handleCallback = async () => {
      // Get the hash fragment from the URL
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      // Process the OAuth callback
      try {
        // If this is not a callback with a hash (access_token), user may have cancelled
        if (!window.location.hash) {
          window.close();
          return;
        }
        
        // Let the opener know authentication is complete
        if (window.opener) {
          window.opener.postMessage(
            { type: 'SUPABASE_AUTH_COMPLETE' },
            window.location.origin
          );
        }
        
        // Close the popup
        window.close();
      } catch (error) {
        console.error('Error handling auth callback:', error);
        // Try to close the window anyway
        window.close();
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-lg font-medium">Authentication Complete</h2>
        <p className="mt-2">You can close this window and return to the application.</p>
      </div>
    </div>
  );
}
