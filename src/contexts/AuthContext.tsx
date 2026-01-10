'use client';

/**
 * Auth Context
 * Manages user authentication and profile data including admin status
 * Uses Supabase Auth for real authentication
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

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
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseClient();

  const fetchProfile = async (authUser: User | null) => {
    try {
      if (!authUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Fetch profile from API (which uses server-side auth)
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      } else if (response.status === 401) {
        // Not authenticated
        setUser(null);
      } else {
        // Profile might not exist yet (will be created by trigger)
        setUser({
          id: authUser.id,
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
          email: authUser.email || null,
          is_admin: false,
          dailyStreak: 0,
        });
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching profile:', error);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchProfile(session?.user ?? null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchProfile(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    await fetchProfile(session?.user ?? null);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin: user?.is_admin || false,
        refreshProfile,
        signOut,
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
