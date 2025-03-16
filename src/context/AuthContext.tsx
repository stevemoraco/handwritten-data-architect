
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || 
                  session.user.user_metadata?.full_name || 
                  session.user.email?.split('@')[0] || 'User',
            createdAt: session.user.created_at,
            organizationId: session.user.user_metadata?.organization_id || null
          });
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      if (event === 'SIGNED_IN' && session) {
        console.log('User signed in:', session.user.email);
        
        try {
          const userData: User = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || 
                  session.user.user_metadata?.full_name || 
                  session.user.email?.split('@')[0] || 'User',
            createdAt: session.user.created_at,
            organizationId: session.user.user_metadata?.organization_id || null
          };
          
          setUser(userData);
          toast({
            title: 'Signed in',
            description: `Welcome${userData.name ? `, ${userData.name}` : ''}!`,
          });
        } catch (error) {
          console.error('Error handling auth state change:', error);
        } finally {
          setIsLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        toast({
          title: 'Signed out',
          description: 'You have been signed out.',
        });
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [toast]);

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: 'Sign in failed',
        description: error.message || 'An error occurred during sign in',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    try {
      setIsLoading(true);
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      });
      
      if (error) throw error;
      
      toast({
        title: 'Account created',
        description: 'Your account has been created successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Sign up failed',
        description: error.message || 'An error occurred during sign up',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            skipBrowserRedirect: true, // This is critical to prevent the main window from redirecting
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            }
          }
        });
        
        if (error) {
          throw error;
        }
        
        if (!data?.url) {
          throw new Error('No OAuth URL returned');
        }
        
        // Open the popup with the URL we received
        const width = 500;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        const popup = window.open(
          data.url,
          'Google Sign In',
          `width=${width},height=${height},left=${left},top=${top}`
        );
        
        if (!popup) {
          toast({
            title: 'Popup Blocked',
            description: 'Please allow popups for this site to use Google Sign In.',
            variant: 'destructive',
          });
          reject(new Error('Popup blocked'));
          return;
        }
        
        // Setup message listener to detect when authentication is complete
        const messageHandler = (event: MessageEvent) => {
          if (
            event.origin === window.location.origin && 
            event.data?.type === 'SUPABASE_AUTH_CALLBACK'
          ) {
            console.log('Received auth message from popup:', event.data);
            
            window.removeEventListener('message', messageHandler);
            
            if (event.data.error) {
              toast({
                title: 'Google sign in failed',
                description: event.data.error || 'An error occurred during Google sign in',
                variant: 'destructive',
              });
              reject(new Error(event.data.error));
            } else {
              // Just resolve the promise - the auth state listener will handle the UI updates
              resolve();
            }
          }
        };
        
        window.addEventListener('message', messageHandler);
        
        // Set a timeout to reject the promise if we don't get a response within 2 minutes
        const timeoutId = setTimeout(() => {
          window.removeEventListener('message', messageHandler);
          reject(new Error('Authentication timed out'));
          
          // If popup is still open, close it
          if (popup && !popup.closed) {
            popup.close();
          }
        }, 120000); // 2 minutes
      } catch (error: any) {
        toast({
          title: 'Google sign in failed',
          description: error.message || 'An error occurred during Google sign in',
          variant: 'destructive',
        });
        reject(error);
      }
    });
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: 'Sign out failed',
        description: error.message || 'An error occurred during sign out',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      
      if (error) throw error;
      
      toast({
        title: 'Password reset email sent',
        description: 'Check your email for the password reset link',
      });
    } catch (error: any) {
      toast({
        title: 'Password reset failed',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
        forgotPassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
