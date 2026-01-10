'use client';

/**
 * Auth Context
 * Manages user authentication and profile data including admin status
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  is_admin: boolean;
  dailyStreak?: number;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      // TODO: Replace with actual auth implementation
      // For now, using a mock user ID - in production, get from Supabase auth
      const mockUserId = '00000000-0000-0000-0000-000000000000'; // Replace with actual user ID
      
      const response = await fetch(`/api/user/profile?userId=${mockUserId}`);
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      } else {
        // If no profile exists, create a default one
        setUser({
          id: mockUserId,
          name: 'Alex M.',
          email: 'alex@example.com',
          is_admin: false,
          dailyStreak: 12,
        });
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching profile:', error);
      }
      // Fallback to default user
      setUser({
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Alex M.',
        email: 'alex@example.com',
        is_admin: false,
        dailyStreak: 12,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const refreshProfile = async () => {
    await fetchProfile();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin: user?.is_admin || false,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
