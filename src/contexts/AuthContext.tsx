'use client';

/**
 * Auth Context
 * Manages user authentication and profile data including admin status
 * Uses Supabase Auth for real authentication
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import type { User, SupabaseClient } from '@supabase/supabase-js';

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
  const [supabaseError, setSupabaseError] = useState<Error | null>(null);
  
  // Initialize supabase client safely
  let supabase: SupabaseClient | null = null;
  try {
    supabase = createSupabaseClient();
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    setSupabaseError(error as Error);
    setLoading(false);
    // Don't throw - allow component to render with error state
  }

  const fetchProfile = async (authUser: User | null) => {
    try {
      if (!authUser || !supabase) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Fetch profile from API (which uses server-side auth)
      // Get the session token from Supabase and include it in the request
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Include access token in Authorization header if available
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch('/api/user/profile', {
        method: 'GET',
        headers,
        credentials: 'include', // Also send cookies
      });
      if (response.ok) {
        const data = await response.json();
        console.log('AuthContext: Profile fetched successfully', { 
          userId: data.id, 
          email: data.email, 
          is_admin: data.is_admin 
        });
        setUser({
          id: data.id,
          name: data.name,
          email: data.email,
          is_admin: data.is_admin || false,
          dailyStreak: data.daily_streak || 0,
        });
      } else if (response.status === 401) {
        // Not authenticated - this is normal if user is not logged in
        console.warn('AuthContext: Profile fetch returned 401 (not authenticated)');
        setUser(null);
      } else {
        // Profile might not exist yet (will be created by trigger)
        // Use fallback data from auth user
        console.warn('AuthContext: Profile fetch failed, using fallback', { 
          status: response.status, 
          statusText: response.statusText 
        });
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
    if (!supabase || supabaseError) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchProfile(session?.user ?? null);
    }).catch((error) => {
      console.error('Error getting session:', error);
      setLoading(false);
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
  }, [supabase, supabaseError]);

  const refreshProfile = async () => {
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    await fetchProfile(session?.user ?? null);
  };

  const signOut = async () => {
    if (!supabase) return;
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
