
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        // This would be replaced with an actual API call
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Failed to restore session', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // This would be replaced with an actual API call
      const mockUser: User = {
        id: '1',
        email,
        name: 'Demo User',
        createdAt: new Date().toISOString(),
        organizationId: '1',
      };
      
      localStorage.setItem('user', JSON.stringify(mockUser));
      setUser(mockUser);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      // This would be replaced with an actual API call
      const mockUser: User = {
        id: '1',
        email,
        name,
        createdAt: new Date().toISOString(),
        organizationId: '1',
      };
      
      localStorage.setItem('user', JSON.stringify(mockUser));
      setUser(mockUser);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // This would be replaced with an actual API call
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    // This would be replaced with an actual API call
    console.log(`Password reset requested for ${email}`);
  };

  const resetPassword = async (token: string, password: string) => {
    // This would be replaced with an actual API call
    console.log(`Resetting password with token ${token}`);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
